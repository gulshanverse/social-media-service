#!/usr/bin/env bash
set -Eeuo pipefail

# This script is intentionally limited to staging/non-production hosts. It performs
# only login, one read-only RBAC access request, and logout with a test account.
: "${STAGING_API_URL:?Set STAGING_API_URL to the non-production API URL}"
: "${STAGING_SUPER_ADMIN_EMAIL:?Set STAGING_SUPER_ADMIN_EMAIL to an authorized staging SUPER_ADMIN test account}"
: "${STAGING_SUPER_ADMIN_PASSWORD:?Set STAGING_SUPER_ADMIN_PASSWORD in the environment; it is never printed}"
: "${STAGING_TEST_ADMIN_ID:?Set STAGING_TEST_ADMIN_ID to the non-production administrator fixture to inspect}"

case "$STAGING_API_URL" in
  *staging*|*localhost*|*127.0.0.1*) ;;
  *)
    echo "Refusing to run: STAGING_API_URL does not identify a staging/local host." >&2
    exit 2
    ;;
esac

workdir="$(mktemp -d)"
access_token=""
cleanup() {
  if [[ -n "$access_token" ]]; then
    curl -sS -o /dev/null -b "$workdir/cookies.txt" \
      -H "Authorization: Bearer $access_token" \
      -X POST "$STAGING_API_URL/admin/auth/logout" || true
  fi
  rm -rf "$workdir"
}
trap cleanup EXIT
umask 077

login_body="$workdir/login.json"
cookie_jar="$workdir/cookies.txt"
login_status="$(curl -sS -o "$login_body" -c "$cookie_jar" -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  --data "$(python3 - <<'PY'
import json, os
print(json.dumps({'email': os.environ['STAGING_SUPER_ADMIN_EMAIL'], 'password': os.environ['STAGING_SUPER_ADMIN_PASSWORD']}))
PY
)" \
  "$STAGING_API_URL/admin/auth/login")"

if [[ "$login_status" != 200 ]]; then
  echo "Staging login failed with HTTP $login_status." >&2
  exit 1
fi

access_token="$(python3 - "$login_body" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
token = body.get('accessToken')
if not isinstance(token, str) or not token:
    raise SystemExit('Login response did not contain an access token.')
print(token)
PY
)"

access_body="$workdir/access.json"
access_status="$(curl -sS -o "$access_body" -w '%{http_code}' \
  -H "Authorization: Bearer $access_token" \
  "$STAGING_API_URL/admin/rbac/users/$STAGING_TEST_ADMIN_ID/access")"

if [[ "$access_status" != 200 ]]; then
  echo "RBAC access read failed with HTTP $access_status." >&2
  exit 1
fi

python3 - "$access_body" "$STAGING_TEST_ADMIN_ID" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
expected_id = sys.argv[2]
admin = body.get('admin')
if not isinstance(admin, dict) or admin.get('id') != expected_id:
    raise SystemExit('RBAC response did not identify the requested staging administrator.')
if not isinstance(body.get('roles'), list) or not isinstance(body.get('overrides'), list):
    raise SystemExit('RBAC response is missing role/override projections.')
if not isinstance(body.get('effectivePermissions'), list):
    raise SystemExit('RBAC response is missing effectivePermissions.')
for forbidden in ('password', 'passwordHash', 'refreshToken', 'refreshTokenHash', 'accessToken'):
    if forbidden in body or forbidden in admin:
        raise SystemExit(f'RBAC response exposed forbidden field: {forbidden}')
print('Staging RBAC authenticated read passed.')
PY

curl --fail-with-body -sS -o /dev/null -b "$cookie_jar" \
  -H "Authorization: Bearer $access_token" \
  -X POST "$STAGING_API_URL/admin/auth/logout"
access_token=""
echo "Staging RBAC smoke test completed and the test session was logged out."
