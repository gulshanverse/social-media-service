# Confession Discussions Release Checklist

This checklist covers the discussion feature in commit `e03355487f6602401d14e4ebcf0d6b434b033332` and later reviewed fixes. It is deliberately database- and hosting-provider-neutral where this repository does not contain a provider deployment manifest.

## Configuration

Set these variables through the hosting platform's secret/configuration manager. Never commit their values:

| Variable                           | Required value or format                                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`              | Absolute API URL used at frontend build time, for example `https://api.example.com` (no trailing path unless the API is mounted there). |
| `WEB_ORIGIN`                       | Exact public web origin, for example `https://www.example.com`; scheme and host/port must match the browser `Origin` exactly.           |
| `ADMIN_ORIGIN`                     | Exact admin origin, for example `https://admin.example.com`.                                                                            |
| `DATABASE_URL`                     | Authorized PostgreSQL connection string supplied only by the hosting secret manager.                                                    |
| `NODE_ENV`                         | `production` for the production API.                                                                                                    |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Strong generated secrets; never use `.env.example` placeholders.                                                                        |
| `PORT`                             | Platform-provided API port, or the configured service port.                                                                             |
| `TRUST_PROXY_HOPS`                 | Exact fixed number of trusted reverse-proxy hops; use `0` for direct traffic.                                                           |
| `APP_VERSION`, `GIT_COMMIT`        | Release metadata for health/version diagnostics.                                                                                        |

Local development uses `WEB_ORIGIN=http://localhost:3000`, `ADMIN_ORIGIN=http://localhost:3001`, and `NEXT_PUBLIC_API_URL=http://localhost:4000` as shown in `.env.example`. Preview deployments must use an explicitly configured preview `WEB_ORIGIN`; the discussion controller does not allow arbitrary origins or an origin list. If multiple previews must share one API, the API needs an intentional, reviewed allowlist change before that topology is used.

## Trusted-origin and cookie behavior

`apps/api/src/confessions/discussion.controller.ts` requires an exact `Origin` equal to `WEB_ORIGIN` for every state-changing commenter route: identity registration/revocation, reactions, comments/replies, and comment reports. Missing and mismatched origins are rejected. Do not weaken this check to `*`, a suffix match, or an uncontrolled preview wildcard.

The commenter cookie is:

- HttpOnly;
- scoped to `/`;
- `Secure` only when `NODE_ENV=production`;
- `SameSite=Lax` locally and `SameSite=None` in production;
- issued for 180 days and revoked by the delete-identity endpoint.

`SameSite=None` requires HTTPS and is suitable when the deployed web and API are cross-site. The deployment must also permit credentialed CORS for the exact configured origins and browsers must allow the relevant third-party-cookie policy. Prefer same-site HTTPS subdomains where possible. Do not change these settings based on an assumed provider topology; verify the actual public web/API origins in staging first.

## Repository quality gates

From the exact release commit:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm prisma validate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The GitHub CI workflow at `.github/workflows/ci.yml` runs these checks on pushes to `main` and pull requests. A failed run must be investigated from its workflow log; local success is not evidence that GitHub CI passed.

## Staging sequence

1. Obtain authorized staging PostgreSQL access and confirm a restorable encrypted backup.
2. Build and review the exact commit intended for staging.
3. Run `pnpm db:generate` and `pnpm prisma validate`.
4. Apply only the committed migration with the repository-supported release job:

   ```bash
   pnpm db:migrate:deploy
   ```

5. Run real PostgreSQL integration tests for profile/session creation, expiry and revocation, reaction uniqueness/switching, pending moderation visibility, one-level replies, locked confessions, comment reports, and admin authorization.
6. Verify existing confession feeds, cards, shares, reports, themes, Garba, and VibeMatch against staging data.
7. Verify exact-origin CORS and cookie behavior from the actual web and admin origins.
8. Verify `/health`, `/health/live`, `/health/ready`, `/health/version`, and `/health/metrics`.
9. Do manual browser checks at 320px, 375px, 390px, tablet, and desktop widths, including keyboard focus, Escape behavior, screen readers, reduced motion, and horizontal overflow.

## Production release order

1. Confirm staging evidence and review the release commit.
2. Configure production variables through the hosting platform; never copy `.env` files into images or source control.
3. Confirm a verified encrypted backup and recovery/PITR readiness.
4. Run the dedicated migration/release job against production PostgreSQL before routing the new API version traffic:

   ```bash
   pnpm db:migrate:deploy
   ```

5. Keep the previous compatible application serving traffic until migration success is confirmed.
6. Deploy the API, public web, and admin applications from the same reviewed release commit.
7. Run health, authentication, public confession, reaction, comment, moderation, and report smoke tests.
8. Retain the old Render database and all backups until migration and application verification are complete and the retention decision is explicit. This repository does not contain a Render deployment manifest, so hosting-console actions remain manual unless an external deployment pipeline is configured.

## Rollback and recovery

Application rollback is independent of database rollback only when the older application is compatible with the migrated schema. Do not write ad hoc reverse SQL. If the migration is unsafe or data integrity is uncertain, stop the rollout, preserve logs/request IDs, keep the prior compatible version serving traffic, and use the tested PostgreSQL backup or provider point-in-time recovery procedure. Record the migration version, backup identifier, release SHA, and recovery decision.

## Current audit limitations

The sandbox has no authorized staging or production PostgreSQL connection. No migration, deployment, environment change, backup deletion, or production action is performed by this checklist. Live PostgreSQL behavior, hosted browser behavior, backup restore, and production deployment remain pending manual execution in the actual target environments.
