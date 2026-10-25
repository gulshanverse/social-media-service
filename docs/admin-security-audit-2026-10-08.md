# Admin Security Audit — 2026-10-08

## Executive summary

The College Confession / Garba admin surface was audited against the supplied brief, with emphasis on authentication, session handling, role-based authorization, administrator lifecycle controls, audit integrity, validation, sensitive response fields, operational protections, and deployed health.

**Result:** one confirmed integrity flaw was found and fixed. No privilege-escalation, stale-role, refresh-token replay, audit-actor spoofing, mass-assignment, or admin-secret disclosure vulnerability was confirmed in the reviewed implementation.

The confirmed flaw was a **TOCTOU race in the last-active `SUPER_ADMIN` safeguard**: concurrent disable/delete operations could each observe more than one active super-admin and then both commit, leaving zero active super-admins. The status mutation is now performed inside a **serializable Prisma transaction**, with the count check, target mutation, and session revocation in the same transaction.

## Scope and method

- Repository: `gulshanverse/social-media-service`
- Branch audited: `main`
- Reviewed areas:
  - `apps/api/src/admin-auth.ts`
  - `apps/api/src/admin.controller.ts`
  - `apps/api/src/admin.module.ts`
  - `apps/api/src/admin.service.ts`
  - `apps/api/src/admin.dto.ts`
  - API bootstrap/configuration and module composition
  - administrator lifecycle tests and admin frontend client/role gates
  - theme, confession, report, Garba moderation, profile, dashboard, and audit-log paths
  - provisioning script, Prisma schema/migrations, CI/deployment documentation
- Static searches covered guards/decorators, direct Prisma writes, request-body spread patterns, audit writers, secret/token fields, dynamic action routes, and response projections.
- Runtime checks covered the complete local test suite, API tests, typecheck, production build, and the public Render staging API health surface.

## Findings

### F-01 — Last active `SUPER_ADMIN` safeguard was raceable — **Medium / fixed**

**Affected path:** administrator status changes (`INACTIVE`, `BANNED`, `DELETED`).

**Root cause:** the previous implementation performed:

1. a count of active super-admins;
2. a separate administrator update;
3. a separate session revocation.

Two authorized requests could interleave between steps 1 and 2. Both could pass the `count > 1` check and disable different super-admins, violating the stated invariant that at least one active super-admin must remain.

**Fix applied:**

- The full lifecycle mutation now runs in `prisma.$transaction`.
- The transaction uses `Prisma.TransactionIsolationLevel.Serializable`.
- The active-super-admin count is evaluated through the transaction client.
- The administrator update and session revocation are part of the same transaction.
- Audit recording remains after the transaction commits, preserving the existing audit semantics.
- The administrator-management test double now supports the transaction path.

**Files changed:**

- `apps/api/src/admin.service.ts`
- `apps/api/src/admin-management.test.ts`

### Observations / residual risks (not confirmed vulnerabilities)

1. **In-memory rate limiting is process-local.** The API rate limiter is effective for the current single-instance Render deployment, but it will not coordinate limits across multiple API instances. If horizontal scaling is introduced, move counters to a shared store or enforce limits at the edge.
2. **Admin moderation projections intentionally expose moderation content and pseudonymous hashes.** The reviewed admin endpoints do not return password hashes, refresh-token hashes, or other authentication secrets. Reconfirm the minimum necessary data policy before adding more roles or non-moderation operators.
3. **Dynamic moderation action parameters are typed at compile time but not DTO-validated at the HTTP boundary.** The service allow-lists supported transitions and rejects invalid state transitions; adding explicit route-param validation would improve error quality and reduce malformed-input noise.
4. **Build warnings remain** for React hook dependency arrays, an `<img>` element, and CSS autoprefixer compatibility. They did not block the security gates and were not changed because they are outside the confirmed security finding.
5. The latest CI run before this audit had a **format-check failure in `apps/admin/app/AdminClient.test.tsx`**, unrelated to the security fix. Local formatting, typecheck, tests, and build passed after the fix.

## Controls verified

### Authentication and sessions

- Passwords are hashed; raw passwords are not persisted or returned.
- Access tokens carry a session identifier and are checked against current database state.
- Refresh tokens are stored hashed and rotated with a compare-and-consume update.
- Refresh reuse/replay is rejected by the stored-hash match and single-use update.
- Logout and password changes revoke sessions as expected.
- Banned, inactive, deleted, expired, and revoked administrators are rejected.
- The frontend does not use localStorage for admin bearer secrets; refresh handling is cookie-based and access-token handling is in memory.

### Authorization and RBAC

- Backend guards enforce authentication and role requirements independently of frontend navigation.
- Moderator, designer, and super-admin capabilities are separated in route declarations and service checks.
- Super-admin creation and role promotion are protected.
- Admin lifecycle operations reject self-disable and preserve the last-active-super-admin invariant after the fix.
- Dashboard activity is scoped by role where required.

### Audit integrity

- Audit records use the authenticated server-side actor identity rather than caller-controlled actor fields.
- Reviewed audit call sites do not accept actor identity from request bodies.
- Authentication audit events avoid storing raw credentials or refresh tokens.

### Input handling and data access

- Global validation is enabled with whitelist/forbid-non-whitelisted behavior.
- Admin DTOs constrain writable fields and password policy.
- Theme import/preview normalization handles malformed legacy data without crashing the Themes page.
- Reviewed admin writes use explicit data objects rather than unrestricted request-body assignment.
- Reviewed responses exclude password hashes and refresh-token hashes.

## Deployment verification

### Render staging API

Read-only Render inspection identified:

- Service: `social-media-service-staging-api`
- URL: <https://social-media-service-staging-api.onrender.com>
- Health check: `/health/live`
- Current live commit at audit time: `5e14503bd7da5759c2cbd7f8591c536c7e43550f`

Public checks at audit time:

- `/health` — HTTP 200
- `/health/live` — HTTP 200
- `/health/ready` — HTTP 200 and database `ok`
- `/health/version` — HTTP 200, production environment reported
- Security headers observed: CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, COOP/CORP, and request IDs.

After the fix was pushed, Render auto-deployed commit `850518ab024335a09ec3840f4f0d658951dfd2d7`. A bounded post-deploy check confirmed `/health/version` reported that commit and `/health/ready` returned HTTP 200 with `database: ok`.

### Vercel admin deployment

The authorized project list exposed `social-media-service-admin`, but project/deployment detail calls were rejected by Vercel with HTTP 403 because the configured credential is not authorized for the `gulshanverse` team scope. No claim is made about the live Vercel deployment beyond that access limitation.

## Validation

After the fix:

- Prettier check: **passed** for changed files
- API test suite: **passed**
- Repository typecheck: **passed**
- Repository production build: **passed**
- Full repository test suite: **passed**

## Recommendation

The fix has been promoted and verified on staging. If the API is later scaled beyond one instance, replace the process-local rate limiter with a shared or edge-enforced mechanism.
