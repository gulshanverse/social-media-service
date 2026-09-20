# Production Runbook

This runbook describes the supported production path for the Social Media Service at Phase 5/Phase 6 scope. The repository contains a public Next.js web app, a separate Next.js admin app, a NestJS API, and a PostgreSQL database managed through Prisma. No live production deployment, hosted browser session, or disposable PostgreSQL service was available during this Phase 6 validation; those steps are marked as pending rather than treated as verified.

## 1. Deployment architecture

| Component  | Runtime and build                                                                                                                     | Production configuration                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Public web | Next.js app in `apps/web`; run `pnpm --filter @ggv/web build` and deploy the resulting Next.js application on a Next-compatible host. | `NEXT_PUBLIC_API_URL`; configure the API URL at build time.                                         |
| Admin      | Next.js app in `apps/admin`; run `pnpm --filter @ggv/admin build` and deploy separately.                                              | The admin client uses `NEXT_PUBLIC_API_URL` for API calls; set the exact `ADMIN_ORIGIN`.            |
| API        | NestJS application in `apps/api`; build with `pnpm --filter @ggv/api build`, or build the root non-root `Dockerfile`.                 | `DATABASE_URL`, production secrets, explicit origins, port, version metadata, and rate limits.      |
| Database   | PostgreSQL accessed through Prisma.                                                                                                   | Apply committed migrations with `pnpm db:migrate:deploy`; never use `prisma db push` in production. |

The API listens on `PORT` (default `4000` only for development). The liveness and container health endpoint is `GET /health/live`; database-aware readiness is `GET /health/ready`.

## 2. Environment configuration

Copy `.env.example` only as a variable checklist. Do not use its development placeholders in production. Production startup validates the following variables and fails closed before Nest starts when any are missing or malformed:

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET` and `JWT_REFRESH_SECRET`
- `WEB_ORIGIN` and `ADMIN_ORIGIN` as explicit absolute origins
- `PORT`
- `TRUST_PROXY_HOPS` as the exact fixed reverse-proxy hop count, or `0` when no proxy is trusted
- `APP_VERSION` and `GIT_COMMIT`
- `SUBMISSION_RATE_LIMIT` and `SUBMISSION_RATE_WINDOW_SECONDS`
- `ADMIN_LOGIN_RATE_LIMIT` and `ADMIN_LOGIN_RATE_WINDOW_SECONDS`
- `ADMIN_REFRESH_RATE_LIMIT` and `ADMIN_REFRESH_RATE_WINDOW_SECONDS`

`ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are development/bootstrap inputs only. In production, an existing administrator is never overwritten. Creating a missing administrator requires `ADMIN_SEED_ALLOW_PRODUCTION=true` for a controlled one-time operation. Never bake seed credentials into an image or commit them. Secrets must be supplied by the hosting platform's secret manager, not by source control or Docker build arguments.

`TRUST_PROXY_HOPS` configures Express's native proxy-aware `request.ip` resolution. Set it to `0` for direct traffic. For a reverse-proxy deployment, set it to the exact fixed number of trusted hops and ensure the API is not reachable through a variable-length or untrusted chain. The application never parses client-supplied `X-Forwarded-For` or `X-Real-IP` headers itself.

## 3. Release and deployment

Build from the exact commit being released:

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

For the API container, build from the repository root. The runtime image runs as the unprivileged `app` user, exposes port `4000`, contains a liveness healthcheck, and starts the compiled API rather than a development server. Provide runtime variables through the platform; do not copy `.env` files into the image. Use a dedicated migration/release job for database changes; do not make every API replica run migrations.

Before starting the matching API release, take a verified database backup. Then the dedicated migration/release job, using the exact release commit and target `DATABASE_URL`, deploys migrations:

```bash
pnpm db:migrate:deploy
```

The job must complete successfully before the matching API image starts receiving traffic. If it fails, stop the rollout, keep the previous compatible application version serving traffic, and investigate against the backup. Do not start replicas against a partially migrated database. Deploy the web and admin applications with the same API URL and release metadata.

## 4. Database migration and recovery

For a fresh database, create an empty PostgreSQL database, set `DATABASE_URL`, run `pnpm db:migrate:deploy`, and then run the controlled seed command if initial themes or an administrator are required. For an existing database, take a backup, run `pnpm db:generate`, run `pnpm prisma validate`, and apply migrations with `pnpm db:migrate:deploy`. Prisma migration history is committed under `prisma/migrations` and currently includes the Phase 5 operational indexes.

Rollback of application code is independent of database rollback where possible. Do not attempt an ad hoc reverse SQL change. If a migration cannot be safely reversed, restore the database backup or use a tested provider point-in-time recovery procedure, then deploy an application commit compatible with the restored schema.

Backups are an infrastructure responsibility. Use encrypted PostgreSQL backups, retain them according to organizational policy (at least 30 days is recommended), enable point-in-time recovery when the provider supports it, and perform periodic isolated restore tests. Record the backup identifier and migration version before every schema-changing release.

## 5. Health and operational checks

After deployment, verify:

```bash
curl -fsS "$API_URL/health"
curl -fsS "$API_URL/health/live"
curl -fsS "$API_URL/health/ready"
curl -fsS "$API_URL/health/version"
curl -fsS "$API_URL/health/metrics"
```

`/health` and `/health/live` should return `200`. `/health/ready` should return `200` only when PostgreSQL is reachable and `503` with a safe body when it is unavailable. `/health/version` must show only configured version and commit metadata. `/health/metrics` contains process-local counters and duration aggregates; export or scrape them through the hosting platform if multi-instance aggregation is needed.

The API emits structured JSON logs with request ID, method, route, status, and duration. Logs must not contain passwords, tokens, cookies, authorization headers, database URLs, or secret values. Propagate `X-Request-ID` when it is safe and bounded; otherwise the API generates one.

## 6. Security checks

Credentialed CORS is restricted to the exact `WEB_ORIGIN` and `ADMIN_ORIGIN`; wildcard origins are not supported. Helmet supplies security headers. Access tokens are sent in the authorization header. Refresh credentials are rotated, hashed server-side, stored in an HttpOnly cookie with `SameSite=Lax`, scoped to `/admin/auth`, and marked Secure in production. Refresh credentials are never returned in JSON or stored in frontend storage.

Authentication, session ownership, refresh replay protection, inactive-admin checks, and database-authoritative RBAC are enforced by the API. `SUPER_ADMIN`, `MODERATOR`, and `DESIGNER` capabilities must be checked through backend routes, not inferred from frontend navigation. Production login, refresh, submission, and report/mutation rate limits are process-local; a multi-instance deployment requires a shared gateway or approved shared limiter before scaling horizontally.

Public confession content and admin previews must remain text-rendered. Do not introduce `dangerouslySetInnerHTML`. Test HTML-looking content such as `<script>alert(1)</script>` as text before launch.

## 7. Incident response

For an unhealthy service, check liveness, readiness, recent release status, structured logs, request ID, database connectivity, and migration status. For authentication compromise, revoke sessions with logout-all, disable the account through the controlled administrative process, rotate secrets when exposure is suspected, and review audit events. For moderation or report discrepancies, compare current state, request ID, audit event, and stale-state response before retrying an action.

For a failed release, stop routing traffic to the new instance, preserve logs and request IDs, verify the database migration state, and roll back application code only if it remains schema-compatible. Use the database restore plan for unsafe migration failures.

## 8. Validation status for this Phase 6 pass

The Phase 5 source, migration SQL, environment model, container definition, CI workflow, and operational code were inspected. Local quality gates and CI remain the authoritative regression checks. Live PostgreSQL migration execution, container runtime execution, hosted frontend/admin browser E2E, CORS from real origins, and backup restore were not claimed as verified because the sandbox had neither a Docker runtime nor a PostgreSQL service/credentials. Execute those checks in disposable staging before launch and attach their evidence to the release record.
