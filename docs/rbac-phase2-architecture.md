# Phase 2 Dynamic RBAC Architecture

## Scope

This document replaces the unavailable Phase 1 audit with a repository-grounded design for the administrator API. The existing `AdminUser.role` enum remains authoritative during the compatibility window; dynamic assignments and overrides are additive and are evaluated from current database state on every protected request.

## Data model

- `Permission` is the code-owned catalog. Permission keys are stable strings and unknown keys are never accepted by the evaluator or management APIs.
- `AdminRoleDefinition` stores reusable custom roles. System definitions for `MODERATOR` and `DESIGNER` are seeded from the legacy capabilities.
- `AdminRolePermission` maps roles to catalog permissions.
- `AdminRoleAssignment` maps administrators to reusable roles.
- `AdminPermissionOverride` stores one per-admin `GRANT` or `DENY` per permission. A `DENY` always wins over inherited grants.
- The legacy `AdminRole` column is retained. `SUPER_ADMIN` remains a special legacy capability and receives all catalog permissions, including reserved administration permissions.

Custom roles and overrides cannot grant `SUPER_ADMIN` because there is no dynamic permission that represents that role, and reserved administration permissions are not assignable through custom-role or override paths.

## Authorization flow

1. `JwtAuthGuard` validates the short-lived access token, session ownership, session status, and current administrator status.
2. `RolesGuard` reads explicit `@Permissions(...)` metadata for each protected route.
3. The evaluator re-reads the current administrator role, role assignments, role grants, and individual override from Prisma.
4. An explicit `DENY` returns false before inherited grants. A `SUPER_ADMIN` legacy account retains full access.
5. Routes without permission metadata continue using the existing `@Roles(...)` compatibility guard.

This is default-deny for the dynamic policy path: missing, unknown, or unrecognized permissions do not authorize a request.

## Compatibility and backfill

The migration only creates tables, indexes, a permission-effect enum, catalog rows, system role definitions, grants, and assignments for existing `MODERATOR`/`DESIGNER` accounts. It does not rewrite administrator IDs, password hashes, sessions, status fields, audit rows, or the legacy role column. Seed operations use upserts/create-many-with-skip-duplicates and preserve production administrator credentials.

## Migration procedure

1. Take and verify a PostgreSQL backup.
2. From the exact release commit, run `pnpm db:generate`, `pnpm prisma validate`, and `pnpm db:migrate:deploy` in a dedicated migration job.
3. Run `pnpm db:seed` only when the controlled seed policy permits it; it is idempotent and does not overwrite an existing production administrator.
4. Verify the permission catalog, system role grants, existing administrator assignments, administrator login, and the authorization matrix before routing traffic.

Do not use `prisma db push` in staging or production.

## Rollback

Application rollback is safe only to a version that does not reference the new tables. Do not issue an ad-hoc reverse SQL migration because dropping RBAC tables would destroy assignments and overrides. If the migration must be reversed, restore the verified pre-release backup or use a tested provider point-in-time recovery procedure, then deploy the matching pre-migration application version.

## Protected endpoint policy inventory

The existing administrator controller now declares explicit policies for dashboard, administrator/session management, confession moderation, reports, audit activity, themes/profile settings, and Garba workflows. Legacy `@Roles` metadata remains alongside the new policy metadata during the compatibility window.
