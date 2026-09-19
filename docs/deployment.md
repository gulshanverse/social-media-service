# Deployment

Deploy `apps/web` and `apps/admin` as separate Next.js projects and deploy `apps/api` with PostgreSQL. Set the variables in `.env.example`; production must provide strong `JWT_SECRET` and `JWT_REFRESH_SECRET` values. The API fails closed for authentication when those secrets are missing.

Set `WEB_ORIGIN` and `ADMIN_ORIGIN` to the exact allowed browser origins. The API enables credentialed CORS only for those origins. Refresh credentials use an HttpOnly, SameSite=Lax cookie scoped to `/admin/auth`; the cookie is Secure in production. Do not put refresh credentials in frontend storage or expose them in API JSON.

Development seeding creates or updates one administrator only when `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are supplied. The seed hashes the password with bcrypt and never prints it. Login and anonymous submission rate limiting are process-local; shared infrastructure will be required for multi-instance production deployment in a future phase.
