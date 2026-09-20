# Deployment

Deploy `apps/web` and `apps/admin` as separate Next.js projects and deploy `apps/api` with PostgreSQL. Set the variables in `.env.example`; production must provide strong `JWT_SECRET` and `JWT_REFRESH_SECRET` values. The API fails closed for authentication when those secrets are missing.

Set `WEB_ORIGIN` and `ADMIN_ORIGIN` to the exact allowed browser origins. The API enables credentialed CORS only for those origins. Refresh credentials use an HttpOnly, SameSite=Lax cookie scoped to `/admin/auth`; the cookie is Secure in production. Do not put refresh credentials in frontend storage or expose them in API JSON.

Development seeding creates or updates one administrator only when `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are supplied. The seed hashes the password with bcrypt and never prints it. Login and anonymous submission rate limiting are process-local; shared infrastructure will be required for multi-instance production deployment in a future phase.

## Phase 5 production path

The API can be built as a non-root container with the root `Dockerfile`. The runtime listens on port `4000`, has a liveness healthcheck, receives configuration through environment variables, and does not bake `.env` files or secrets into the image. Deploy the API with PostgreSQL, set `DATABASE_URL`, production JWT secrets, explicit CORS origins, and an operational `APP_VERSION`/`GIT_COMMIT`. Use `pnpm prisma migrate deploy` against the target database before starting the matching application image; `prisma db push` is for development only.

The API exposes `/health`, `/health/live`, `/health/ready`, `/health/version`, and `/health/metrics`. Readiness must be used for traffic routing and liveness for restart checks. SIGTERM and SIGINT close the Nest application and Prisma client before exit.

For a release, install with `pnpm install --frozen-lockfile`, generate Prisma Client, validate the schema, run format/lint/typecheck/tests/build, build the API container, apply migrations, start the service, and verify liveness, readiness, version metadata, and a request ID on a safe request. Keep an encrypted PostgreSQL backup before migrations and test restore procedures separately.
