# Staging Verification Continuation — 2026-10-22

## Scope

This is a continuation of the production-readiness audit. The existing user-modified `docs/production-readiness-audit.md` was preserved unchanged. This record contains only newly obtained evidence and the focused remediation performed during this continuation.

## Current repository and GitHub state

- Repository: `gulshanverse/social-media-service`
- Branch before this change: `main`
- Existing remote HEAD before this change: `622c555b358d1ed8a68aa37a5fc1a34d53907a03`
- Previous commits `2a605ab` and `622c555` were present locally and on `origin/main`.
- Existing CI and CodeQL runs for `622c555` were successful.
- The working tree contained a user modification to `docs/production-readiness-audit.md`; it was not overwritten, reset, or staged by this continuation.

## Fresh staging API verification

The repository's existing deployment evidence identifies the authorized Render staging API as:

`https://social-media-service-staging-api.onrender.com`

Only safe, read-only HTTP requests were performed. No authentication, mutation, migration, or private-data operation was attempted.

| Request                                 | Result | Evidence                                                                                                                                        |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                           | PASS   | HTTP 200; API reported `status: ok`.                                                                                                            |
| `GET /health/live`                      | PASS   | HTTP 200; API reported `status: ok`.                                                                                                            |
| `GET /health/ready`                     | PASS   | HTTP 200; response reported `database: ok`.                                                                                                     |
| `GET /health/version`                   | PASS   | HTTP 200; deployed commit reported `622c555b358d1ed8a68aa37a5fc1a34d53907a03`; environment reported `production`.                               |
| `GET /health/metrics`                   | PASS   | HTTP 200; operational endpoint reachable. Response contents were not copied into this report.                                                   |
| `GET /confessions?page=0&limit=9999`    | PASS   | HTTP 200; public list endpoint returned a response. No private response data was retained here.                                                 |
| `GET /confessions/not-a-real-public-id` | PASS   | HTTP 404 with normalized `NOT_FOUND` response and request ID.                                                                                   |
| `GET /garba`                            | PASS   | HTTP 200; public list endpoint returned a response. No private response data was retained here.                                                 |
| `GET /garba/not-a-real-public-id`       | PASS   | HTTP 404 with normalized `NOT_FOUND` response and request ID.                                                                                   |
| Security headers                        | PASS   | Observed HTTPS/HSTS, CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, and `X-Request-ID`. |

The staging API was reachable and database-ready at verification time. This does not prove that the deployed frontend/admin applications, browser cookies, migrations, backups, or complete user journeys are production-ready.

## Defect discovered and fixed

### High — commenter identity route shadowed by dynamic confession route

**Observed staging behavior:** `GET /confessions/identity` returned HTTP 404 with the confession-detail error `Confession not found.` instead of reaching the commenter identity handler.

**Root cause:** `ConfessionsModule` registered `ConfessionsController` before `DiscussionController`. The public controller contains `GET /confessions/:publicId`, which captured the literal `identity` path before the discussion controller's fixed `GET /confessions/identity` route.

**Fix:** Registered `DiscussionController` before `ConfessionsController` in `apps/api/src/confessions/confessions.module.ts`, ensuring all fixed discussion paths are registered before the dynamic public identifier path.

**Regression coverage:** Added a controller-order assertion to `apps/api/src/confessions/discussion.test.ts`.

**Validation:**

- Targeted discussion regression test: PASS.
- API typecheck: PASS.
- API build: PASS.
- Complete API test suite: PASS.
- Local Nest route mapping after the fix showed `GET /confessions/identity` before `GET /confessions/:publicId`.

The already-running staging deployment still contains the previous commit until the new fix is deployed. A post-deployment request to `GET /confessions/identity` must be made before this specific staging behavior can be marked resolved remotely.

## Docker and database limitations

- Docker is unavailable in the sandbox (`docker` command not found), so production image build/startup and runtime dependency inspection remain BLOCKED.
- No local PostgreSQL server or authorized staging `DATABASE_URL` was available to this session. No migration was applied.
- No backup file, isolated recovery environment, or restore evidence was available. Backup/restore verification remains BLOCKED.
- The documented migration architecture remains a dedicated migration/release job followed by starting the runtime image; the Dockerfile runtime command does not invoke Prisma or migrations.

## Browser and hosted frontend limitations

The staging API was verified, but no public web origin or authorized admin web origin was identified in the repository evidence available to this session. Full browser journeys remain NOT RUN, including confession submission, commenter registration, reactions, comments/replies, report moderation, responsive viewport checks, and cookie behavior.

## Release decision

**BLOCKED — not ready for production release.** The focused route defect is fixed in source and covered by a regression test, and the documented staging API currently passes safe health/readiness checks. Release still requires deployment of this fix followed by the identity-route smoke test, Docker image validation, authorized staging migration/integration tests, backup/restore evidence, and hosted browser verification.

## Next exact actions

1. Deploy the new source commit to the authorized staging API.
2. Verify `GET /confessions/identity` returns the commenter identity response rather than confession detail 404.
3. Build and start the production Docker image in an environment with Docker, with migrations run separately by the release job.
4. Confirm the staging database identity and backup before applying any migration.
5. Run the full PostgreSQL persistence/moderation journey and browser tests from the existing release checklist.
6. Reassess the final production-readiness status only after those checks pass.
