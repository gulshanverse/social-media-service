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

Copy `.env.example` to `.env`, provide a PostgreSQL `DATABASE_URL`, and set development-only `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` if an initial admin is needed. Run `pnpm install`, `pnpm db:generate`, `pnpm db:push`, `pnpm db:seed`, and `pnpm dev`. Cookie CORS requires `WEB_ORIGIN` and `ADMIN_ORIGIN` to match the browser origins. The root `docker-compose.yml` is a development-only PostgreSQL helper. Production and staging use a dedicated migration/release job running `pnpm db:migrate:deploy` once against the target database before the matching API release; they never use `pnpm db:push`.

## Validation commands

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` are required CI checks. Prisma schema validation requires `DATABASE_URL`; use the configured environment or a disposable PostgreSQL URL for `pnpm prisma validate`.

See `docs/api.md`, `docs/moderation.md`, `docs/architecture.md`, `docs/security-phase3.md`, `docs/deployment.md`, and `docs/production-runbook.md` for details.

## Phase 9 launch readiness

The public app now includes launch-facing About, Privacy, Terms, Community Guidelines, Contact, and Report Content pages, a shared footer, canonical/Open Graph metadata, `sitemap.xml`, and `robots.txt`. Public reports are validated and persisted into the existing moderation/report workflow; pending confessions remain private until moderator approval. The service does not create `ads.txt` until the real AdSense publisher ID is supplied.

The canonical public host is `https://www.confessions.live`. Add `admin.confessions.live` as an additional Vercel domain and keep `smsccadmin.vercel.app` as fallback until login, CORS, session refresh, moderation, and logout have all been verified on the custom domain. Only then should production `ADMIN_ORIGIN` be changed.

Read `PHASE9_FINAL_REPORT.md` for the implementation summary, validation evidence, production-only checklist, and intentionally deferred work.

## Phase 3.1 consistency rules

The API explicitly enforces role boundaries: designers can manage themes but cannot read or mutate confession, report, or audit routes; moderators can moderate and manage reports but cannot access audit logs or mutate themes; super administrators can perform all intended operations. Confession edits are pending-only, reports transition only from open, and `themeId` is a database Theme ID. Refresh rotation uses an atomic conditional update so concurrent reuse of one old credential cannot succeed twice. Login and submission rate limits are process-local; proxy deployments must configure the exact fixed `TRUST_PROXY_HOPS` value for request IP handling. Multi-instance deployments require a shared gateway or distributed limiter before horizontal scaling.

## Phase 4 operations workspace

The admin product now provides a practical moderation console: aggregate dashboard metrics, server-side confession queue search/filter/sort/pagination, full confession review with pending-only editing and state-aware actions, report resolution with confession context, filtered append-only audit activity, and role-aware theme CRUD with live public-card previews. The frontend includes explicit loading, empty, error, success, confirmation, keyboard-focus, and responsive states; backend authorization and DTO validation remain authoritative.

## Phase 4 closure hardening

The final moderation workspace pass adds a backend-backed Theme selector to the confession queue, converts theme listing to standard server-side pagination, strengthens dashboard and query behavior coverage with distinguishable aggregate fixtures, improves explicit mutation feedback grammar, and returns safe not-found errors for missing theme updates. Theme IDs remain database identities throughout the queue, editor, public API, and theme management flows.

## Phase 5 production readiness

The platform now includes liveness/readiness/version/metrics endpoints, request correlation IDs, structured safe logs, normalized production errors, graceful API shutdown, safe administrator session visibility and logout-all, refresh throttling with `Retry-After`, query-backed database indexes, a non-root API container path, and CI Prisma validation. Moderators can select visible queue records and submit server-authoritative bulk approve/reject/archive actions with confirmations, partial-result reporting, stale-state protection, and audit events. Queue preferences are persisted locally without storing credentials or tokens.

Operational deployment guidance, recovery expectations, security boundaries, API contracts, and runbooks are documented in `docs/deployment.md`, `docs/security.md`, `docs/operations.md`, and `docs/api.md`.
