# Production Readiness Audit — Social Media Service

**Audit date:** 2026-10-22  
**Repository:** `gulshanverse/social-media-service`  
**Audited branch:** `main`  
**Audited HEAD:** `4c2ec850bb1bb2b456c1f06df7cb9f83688abee0`

## 1. Executive summary

**Final status: BLOCKED.** The repository is clean before the audit, synchronized with `origin/main`, and the current HEAD has successful GitHub CI and CodeQL runs. Local static quality gates also pass: Prisma client generation and schema validation, formatting, lint, typecheck, all existing API/UI tests, and all workspace builds.

A production container defect was fixed: the Docker image pruned development dependencies and then attempted to execute the Prisma CLI during container startup, while the repository documentation specifies a separate migration/release job. The runtime image now starts the compiled API directly; migrations must be applied by the documented release job before traffic is shifted.

Production release is not recommended yet because no authorized staging PostgreSQL instance, backup/restore evidence, hosted deployment configuration, or live browser environment was available for this audit. The core end-to-end persistence and moderation journeys therefore remain unverified against PostgreSQL and deployed origins.

## 2. Repository verification

- Remote: `https://github.com/gulshanverse/social-media-service.git`
- Branch: `main`
- Baseline HEAD: `4c2ec850bb1bb2b456c1f06df7cb9f83688abee0`
- Fix commit: `2a605ab777fce449acedfa99f7255490163e589b`
- Working tree: clean after the pushed fix and report artifact.
- Remote synchronization: `origin/main` confirmed at `2a605ab777fce449acedfa99f7255490163e589b`.
- Referenced commits verified: `e03355487f6602401d14e4ebcf0d6b434b033332` and `4c2ec850bb1bb2b456c1f06df7cb9f83688abee0` exist on the branch.
- Post-fix CI: successful for `2a605ab` — [CI run 39660094438](https://github.com/gulshanverse/social-media-service/actions/runs/39660094438).
- Post-fix CodeQL: successful for `2a605ab` — [CodeQL run 39660094427](https://github.com/gulshanverse/social-media-service/actions/runs/39660094427).
- No tracked private key/certificate files or real environment files were found; only `.env.example` is tracked.

## 3. Verified architecture and feature matrix

| Feature                                     | Implementation found                                                                                             | Tests/evidence                                    | Result and gap                                                                                                                                                                                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public Next.js website and navigation       | `apps/web/app`, public metadata, robots, sitemap, legal/help routes                                              | Web Vitest suite and production build             | PASS statically; deployed navigation, responsive layout, and browser console not tested                                                                                                                                                                           |
| Anonymous confession submission/feed/detail | `confessions.controller.ts`, `confessions.service.ts`, submission and detail pages, moderation status projection | API confession tests; web build                   | PASS statically; real PostgreSQL persistence and moderation lifecycle blocked                                                                                                                                                                                     |
| Commenter profiles/sessions                 | `discussion.controller.ts`, `discussion.service.ts`, `CommenterProfile`, `CommenterSession` migration/model      | Discussion validation tests; source inspection    | PASS statically; expiry, revocation, cookie behavior, and cross-origin browser flow not staging-tested. The system stores a display name, Instagram username, session record, and an IP-derived hash for reports/reactions; “anonymous” does not mean untraceable |
| Reactions                                   | Fixed/custom emoji validation, per-actor unique constraint, add/change/remove and counts                         | Discussion source/tests; Prisma schema inspection | PASS statically; concurrent PostgreSQL behavior not integration-tested                                                                                                                                                                                            |
| Comments and one-level replies              | Moderated comments, parent validation, published-only public projection, pagination                              | Discussion tests and API build                    | PASS statically; reload/persistence, large-volume pagination, and moderation against PostgreSQL blocked                                                                                                                                                           |
| Comment reporting                           | DTO validation, public-origin check, report persistence, admin queue                                             | Source inspection and API tests                   | PASS statically; duplicate-report policy and real report workflow not staging-tested                                                                                                                                                                              |
| Admin authentication/sessions               | HMAC access/refresh tokens, hashed rotating refresh sessions, HttpOnly cookies, revocation                       | Admin, proxy, phase, and RBAC tests               | PASS statically; hosted cookie topology and live login not tested                                                                                                                                                                                                 |
| Admin moderation and reports                | Protected controllers/services, role/permission guards, audit records, stale-state checks                        | API admin/RBAC tests; current CI success          | PASS statically; real moderator/admin journey blocked by absent staging DB/browser                                                                                                                                                                                |
| Admin users/RBAC                            | Dynamic roles, permissions, overrides, lifecycle controls                                                        | RBAC and admin-management tests                   | PASS statically; production role data and authorization in deployment not verified                                                                                                                                                                                |
| Themes/profile settings                     | Theme lifecycle, import/export/preview/favorites, profile settings                                               | Admin component tests; API tests; build           | PASS statically; visual browser review not performed                                                                                                                                                                                                              |
| Garba                                       | Public posts/comments/reactions/reports and admin moderation                                                     | Garba service/HTTP tests; build                   | PASS statically; deployed journey not tested                                                                                                                                                                                                                      |
| VibeMatch                                   | Magic-link/session auth, CSRF origin checks, profiles, sessions, answers, matching, blocks                       | VibeMatch API/matching/web tests; build           | PASS statically; email provider, database, and live browser flow not tested                                                                                                                                                                                       |
| Operational endpoints                       | `/health`, `/health/live`, `/health/ready`, `/health/version`, `/health/metrics`, request IDs, safe errors       | Phase 5 HTTP tests; source inspection             | PASS statically; readiness and liveness not checked in a running deployment                                                                                                                                                                                       |

## 4. Tests and evidence

| Command or method                                                     | Status  | Actual result                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                      | PASS    | Installed the locked 8-workspace dependency graph with pnpm 9.15.4. Corepack initially failed due to a local signature-cache mismatch; direct pinned pnpm installation resolved the tooling issue without repository changes. |
| `DATABASE_URL=postgresql://... pnpm db:generate`                      | PASS    | Prisma Client generated successfully.                                                                                                                                                                                         |
| `DATABASE_URL=postgresql://... pnpm prisma validate`                  | PASS    | Prisma schema validated successfully.                                                                                                                                                                                         |
| `pnpm format:check`                                                   | PASS    | Prettier check completed successfully.                                                                                                                                                                                        |
| `pnpm lint`                                                           | PASS    | All workspace lint scripts completed successfully.                                                                                                                                                                            |
| `pnpm typecheck`                                                      | PASS    | All workspace TypeScript checks completed successfully.                                                                                                                                                                       |
| `pnpm test`                                                           | PASS    | API tests, 22 admin tests, and 18 web tests completed successfully; package smoke tests also passed.                                                                                                                          |
| `pnpm build`                                                          | PASS    | Shared packages, API, admin Next.js app, and public web Next.js app built successfully.                                                                                                                                       |
| `git diff --check`                                                    | PASS    | No whitespace errors.                                                                                                                                                                                                         |
| GitHub CI for `4c2ec85`                                               | PASS    | Run `39653995705` completed successfully.                                                                                                                                                                                     |
| GitHub CodeQL for `4c2ec85`                                           | PASS    | Run `39653995775` completed successfully.                                                                                                                                                                                     |
| `pnpm prisma migrate status` against local example URL                | BLOCKED | No PostgreSQL server was available at `localhost:5432`; no migration was applied.                                                                                                                                             |
| Docker image build                                                    | NOT RUN | Docker is unavailable in the sandbox.                                                                                                                                                                                         |
| Live public/admin browser tests                                       | NOT RUN | No deployed target or authorized staging credentials were supplied for this audit.                                                                                                                                            |
| Real end-to-end confession/comment/reaction/report/moderation journey | BLOCKED | Requires an isolated PostgreSQL database, seeded data, running API/apps, and authorized browser/deployment origins.                                                                                                           |

## 5. Bugs discovered and fixes applied

### Fixed — High operational defect: runtime migration command after pruning Prisma CLI

- **Root cause:** `Dockerfile` ran `pnpm prune --prod` in the build stage and then used `./node_modules/.bin/prisma migrate deploy` in the runtime command. Prisma is a root development dependency, so the runtime image is not guaranteed to contain that CLI. The command also contradicted `docs/deployment.md` and the release checklist, which require a dedicated migration/release job.
- **Fix:** Changed the runtime command to `CMD ["node", "apps/api/dist/main.js"]`.
- **File changed:** `Dockerfile`.
- **Regression evidence:** `git diff --check` passed; all local quality gates passed after the change. A Docker build could not be executed because Docker is unavailable in the sandbox.
- **Required release behavior:** Run `pnpm db:migrate:deploy` once from the exact release commit in a controlled migration job, then start the API image.

No other source defect was changed without a reproducible, low-risk fix. No production systems, environment variables, databases, migrations, DNS, or deployments were modified.

## 6. Security findings and limitations

- **Confirmed positive controls:** strict DTO validation with whitelist/forbid-unknown behavior; explicit public projections; server-side admin guards and permissions; HMAC access/refresh token separation; hashed refresh tokens; rotation/replay protection; session revocation; exact configured CORS origins; origin checks for state-changing commenter routes; Helmet; bounded JSON body size; safe production error handling; and append-only audit writes.
- **Operational risk — Medium:** the documented login, submission, report, reaction, and other abuse throttles are process-local. They are not sufficient for a multi-instance deployment without an edge or shared limiter. The documentation already records this limitation. Do not scale horizontally until a shared control is in place.
- **Privacy limitation — Informational:** commenter profiles retain the supplied display name and Instagram username, and report/reaction attribution uses IP-derived hashes. Public responses hide session credentials and internal fields, but commenter identity is pseudonymous rather than untraceable.
- **Dependency/security automation:** current CI and CodeQL passed. GitHub secret scanning and push protection were enabled at inspection time; Dependabot security updates were reported disabled. Dependency review is configured for pull requests, but no new dependency change was introduced by this audit.
- **Scope limitation:** this was primarily a repository/static audit. It was not a penetration test, backup-restore test, staging authorization review, or production configuration review.

## 7. Database and migration status

The full Prisma schema and migration history were inspected, including `20261021233000_confession_discussions`. The discussion migration is additive and includes the expected commenter, session, comment, reaction, report relation, indexes, and uniqueness constraints. Prisma schema validation and client generation passed.

The migration was **inspected and schema-validated only**. It was **not applied to PostgreSQL**. Local migration status was blocked by the absence of a PostgreSQL server, and no authorized staging database or backup evidence was available. No destructive database command was run.

## 8. UI/UX and responsive audit

Static component tests and Next.js builds passed. No real browser session was used for this audit, so screen widths 320, 375, 390, 768, 1024, and 1440; keyboard focus; modal behavior; screen-reader behavior; console errors; network failures; deep-link refreshes; and deployed cookie behavior are **NOT RUN**, not passed.

## 9. Deployment readiness

The repository contains separate Next.js web/admin apps, a NestJS API Dockerfile, local PostgreSQL Compose configuration, GitHub CI, CodeQL, and deployment/runbook documentation. Required production variables are documented and production configuration validation fails closed for missing/weak values.

The actual Vercel/Render project settings, live environment values, deployment logs, domain topology, backup/PITR readiness, and staging cookie/CORS behavior were not available. Values for `WEB_ORIGIN`, `ADMIN_ORIGIN`, `NEXT_PUBLIC_API_URL`, database URL, and proxy hops must be verified in the target deployment rather than inferred from local defaults.

## 10. GitHub changes

- Changed file: `Dockerfile`.
- Commit: `2a605ab777fce449acedfa99f7255490163e589b` (`fix: align API container startup with migration workflow`).
- Push status: **Pushed and confirmed** — `origin/main` points to the same SHA.
- Post-fix CI: **PASS** — [CI run 39660094438](https://github.com/gulshanverse/social-media-service/actions/runs/39660094438).
- Post-fix CodeQL: **PASS** — [CodeQL run 39660094427](https://github.com/gulshanverse/social-media-service/actions/runs/39660094427).

## 11. Remaining blockers

1. **Staging PostgreSQL and backup evidence:** provide an isolated staging `DATABASE_URL`, confirm it is not production, and confirm a restorable backup. Then run `pnpm db:migrate:deploy` and real persistence/integration tests.
2. **Hosted origin/cookie verification:** deploy or provide authorized staging web/admin/API origins and verify credentialed CORS, HttpOnly cookies, SameSite behavior, refresh/revocation, and exact-origin mutation checks.
3. **Browser QA:** run the documented public and admin journeys at the required viewport widths, including malformed routes, failure states, keyboard/focus behavior, console errors, and network failures.
4. **Container validation:** run a Docker build and start the fixed image with migrations already applied by the release job; verify `/health/live`, `/health/ready`, version metadata, and request IDs.
5. **Multi-instance rate limiting:** before horizontal scaling, add an approved shared/edge limiter and test bypass resistance.
6. **Post-fix GitHub validation:** commit the Dockerfile fix through the repository workflow and verify the new CI/CodeQL results before release.

## 12. Final verdict and prioritized release checklist

**BLOCKED — not ready for production release.** The codebase is suitable for the next isolated staging validation because local static gates and existing tests pass, but production readiness cannot be claimed without staging database, deployment, backup, browser, and post-fix CI evidence.

1. Review and commit the Dockerfile fix.
2. Run and pass GitHub CI and CodeQL for the fix commit.
3. Build the API image and run migrations from a dedicated staging migration job.
4. Confirm backup/restore readiness and migration status in isolated staging.
5. Execute real confession, commenter session, reaction, comment/reply, report, admin moderation, unauthorized-admin, expired-session, malformed-input, and reload/persistence journeys.
6. Verify exact origins, credentialed CORS, cookies, health/readiness endpoints, logging, and request IDs.
7. Review security and privacy findings, especially the process-local throttling limitation.
8. Obtain release approval, configure production secrets through the host, run the migration job against a verified backup, deploy web/admin/API from the same commit, and execute production smoke checks without exposing user data or credentials.
