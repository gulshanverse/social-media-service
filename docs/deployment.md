# Deployment

Deploy `apps/web` and `apps/admin` as separate Vercel projects rooted at the monorepo. Deploy `apps/api` and PostgreSQL on Railway or an equivalent managed environment. Set all variables from `.env.example` in the respective environment; never commit real credentials. Run CI before production promotion.

Phase 3 additionally requires strong production-only `JWT_SECRET` and `JWT_REFRESH_SECRET` values. Development seeding creates an administrator only when `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are supplied; the password is hashed with bcrypt and never printed. Login and anonymous submission rate limits are process-local and are not sufficient for multi-instance production deployment without shared infrastructure.
