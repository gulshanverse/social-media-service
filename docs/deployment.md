# Deployment

Deploy `apps/web` and `apps/admin` as separate Vercel projects rooted at the monorepo. Deploy `apps/api` and PostgreSQL on Railway or an equivalent managed environment. Set all variables from `.env.example` in the respective environment; never commit real credentials. Run CI before production promotion.
