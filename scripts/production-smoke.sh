#!/usr/bin/env bash
set -euo pipefail
PORT="${PORT:-4100}"
export NODE_ENV=production
export PORT
export DATABASE_URL="postgresql://smoke_user:smoke_pass@smoke-db.internal:5432/social_media_service"
export JWT_SECRET="local-runtime-access-material-1234567890-abcdef"
export JWT_REFRESH_SECRET="local-runtime-refresh-material-0987654321-abcdef"
export WEB_ORIGIN="https://web.example.test"
export ADMIN_ORIGIN="https://admin.example.test"
export TRUST_PROXY_HOPS=1
export APP_VERSION=0.1.0
export GIT_COMMIT=smoke
export SUBMISSION_RATE_LIMIT=5
export SUBMISSION_RATE_WINDOW_SECONDS=3600
export ADMIN_LOGIN_RATE_LIMIT=5
export ADMIN_LOGIN_RATE_WINDOW_SECONDS=900
export ADMIN_REFRESH_RATE_LIMIT=10
export ADMIN_REFRESH_RATE_WINDOW_SECONDS=900
node apps/api/dist/main.js > /tmp/social-media-api-smoke.log 2>&1 &
pid=$!
cleanup() { kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; }
trap cleanup EXIT
for _ in $(seq 1 30); do
  live_status=$(curl -sS -o /tmp/health-live.json -w '%{http_code}' "http://127.0.0.1:${PORT}/health/live" || true)
  ready_status=$(curl -sS -o /tmp/health-ready.json -w '%{http_code}' "http://127.0.0.1:${PORT}/health/ready" || true)
  if [ "$live_status" = "200" ]; then
    cat /tmp/health-live.json
    printf 'health/ready HTTP status: %s\n' "$ready_status"
    cat /tmp/health-ready.json
    test "$ready_status" = "200" || test "$ready_status" = "503"
    grep -q 'Nest application successfully started' /tmp/social-media-api-smoke.log
    exit 0
  fi
  sleep 1
done
cat /tmp/social-media-api-smoke.log
exit 1
