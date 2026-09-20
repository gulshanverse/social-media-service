# Deployment

Deploy `apps/web` and `apps/admin` as separate Next.js projects and deploy `apps/api` with PostgreSQL. Set the variables in `.env.example`; production must provide strong `JWT_SECRET` and `JWT_REFRESH_SECRET` values. The API fails closed for authentication when those secrets are missing.

Set `WEB_ORIGIN` and `ADMIN_ORIGIN` to the exact allowed browser origins. The API enables credentialed CORS only for those origins. Refresh credentials use an HttpOnly, SameSite=Lax cookie scoped to `/admin/auth`; the cookie is Secure in production. Do not put refresh credentials in frontend storage or expose them in API JSON.

Development seeding creates or updates one administrator only when `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are supplied. The seed hashes the password with bcrypt and never prints it. In production, an existing administrator is never updated by seeding. Creating a missing production administrator requires the deliberate `ADMIN_SEED_ALLOW_PRODUCTION=true` bootstrap flag and should be a controlled one-time operation.

Set `TRUST_PROXY_HOPS` to `0` for direct development traffic. In staging or production, set it to the exact fixed number of reverse-proxy hops between the API and the client. Express then resolves `request.ip` using its native proxy-aware algorithm; the controllers do not parse `X-Forwarded-For` or `X-Real-IP`. A direct client cannot spoof its rate-limit identity when the API is directly reachable. The proxy chain must be fixed-length and the API must not be exposed through a variable-length or untrusted chain. Login and anonymous submission rate limiting are process-local; a multi-instance deployment requires a shared gateway or distributed limiter before horizontal scaling.

## Phase 5 production path

The API can be built as a non-root container with the root `Dockerfile`. The runtime listens on `PORT` (4000 by default in development), has a liveness healthcheck, receives configuration through environment variables, and does not bake `.env` files or secrets into the image. Deploy the API with PostgreSQL, set the production variables documented in `.env.example`, production JWT secrets, explicit CORS origins, and operational `APP_VERSION`/`GIT_COMMIT` metadata. Production startup fails closed when critical configuration is missing. Use `pnpm db:migrate:deploy` against the target database before starting the matching application image; `prisma db push` is for development only.

The API exposes `/health`, `/health/live`, `/health/ready`, `/health/version`, and `/health/metrics`. Readiness must be used for traffic routing and liveness for restart checks. SIGTERM and SIGINT close the Nest application and Prisma client before exit.

For a release, install with `pnpm install --frozen-lockfile`, generate Prisma Client, validate the schema, run format/lint/typecheck/tests/build, build the API container, apply migrations, start the service, and verify liveness, readiness, version metadata, and a request ID on a safe request. Keep an encrypted PostgreSQL backup before migrations and test restore procedures separately. See `docs/production-runbook.md` for the launch checklist, incident response, recovery, and validation limitations.
