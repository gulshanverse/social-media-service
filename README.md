# Social Media Service

A production-minded foundation for community: anonymous submissions, moderated publishing, themed message cards, reporting, and an internal moderation workspace.

## Phase 3 repair status

Phase 3 now includes hardened admin authentication, server-side refresh sessions, rotating HttpOnly refresh cookies, real logout revocation, current-database-role authorization, strict runtime DTO validation, editor tracking, complete moderation/report/audit/theme screens, and behavioral security regression tests. The public product remains anonymous and public APIs return `PUBLISHED` confessions only.

## Architecture

- `apps/web`: public Next.js experience
- `apps/admin`: role-aware Next.js moderation workspace with dashboard, queue, detail, reports, audit logs, and themes
- `apps/api`: NestJS public and `/admin/*` APIs
- `packages/ui`, `packages/types`, `packages/config`, `packages/themes`: shared product foundations
- `prisma`: PostgreSQL schema, seed, admin sessions, reports, and audit records

## Admin security

Access tokens expire after 15 minutes and contain minimal claims. Login creates an `AdminSession`; only a hash of the refresh credential is stored. Refresh reads the `admin_refresh` HttpOnly cookie, verifies the current admin and session, rotates the credential, and rejects reuse of the prior credential. Logout revokes the session and clears the cookie. In production, `JWT_SECRET` and `JWT_REFRESH_SECRET` are required; there are no production fallback secrets.

The three existing roles remain authoritative: `SUPER_ADMIN` can moderate, resolve reports, audit, and manage themes; `MODERATOR` can moderate, resolve reports, and read themes; `DESIGNER` can create/update themes but cannot perform moderation, report actions, or audit operations. The API enforces these boundaries independently of frontend navigation.

## Local setup

Copy `.env.example` to `.env`, provide a PostgreSQL `DATABASE_URL`, and set development-only `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` if an initial admin is needed. Run `pnpm install`, `pnpm db:generate`, `pnpm db:push`, `pnpm db:seed`, and `pnpm dev`. Cookie CORS requires `WEB_ORIGIN` and `ADMIN_ORIGIN` to match the browser origins.

## Validation commands

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` are required CI checks. Prisma schema validation requires `DATABASE_URL`; use the configured environment or a disposable PostgreSQL URL for `pnpm prisma validate`.

See `docs/api.md`, `docs/moderation.md`, `docs/architecture.md`, `docs/security-phase3.md`, and `docs/deployment.md` for details.

## Phase 3.1 consistency rules

The API explicitly enforces role boundaries: designers can manage themes but cannot read or mutate confession, report, or audit routes; moderators can moderate and manage reports but cannot access audit logs or mutate themes; super administrators can perform all intended operations. Confession edits are pending-only, reports transition only from open, and `themeId` is a database Theme ID. Refresh rotation uses an atomic conditional update so concurrent reuse of one old credential cannot succeed twice. Login and submission rate limits are process-local; proxy deployments must configure trusted proxy behavior for request IP handling, and multi-instance rate limiting remains a future infrastructure concern.
