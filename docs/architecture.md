# Architecture

The platform is a pnpm monorepo with clear boundaries between public web, admin web, API, and shared packages. The public and admin Next.js applications are independently deployable. The NestJS API owns validation, authorization, moderation state transitions, and persistence through Prisma.

Phase 2 adds a public confession module to the NestJS API. The module owns DTO validation, normalization, pending creation, published-only pagination/detail queries, view increments, and a process-local anonymous submission limiter. Public confession responses are explicit safe projections rather than Prisma models.

## Phase 3 administration

`apps/api` exposes an isolated `/admin/*` namespace. Short-lived HMAC access tokens carry only `sub` and `role`; refresh credentials are validated separately. `JwtAuthGuard` authenticates requests and `RolesGuard` enforces centralized role metadata. The `AdminService` maps request fields explicitly and records append-only audit entries for important mutations.

The admin app is an internal moderation workspace. The public app remains anonymous and the public API returns only `PUBLISHED` confessions. Login rate limiting and submission rate limiting are process-local; a multi-instance deployment will require shared state in a future infrastructure phase.

Admin roles are `SUPER_ADMIN`, `MODERATOR`, and `DESIGNER`. Moderators manage confession and report workflows, designers manage themes, and only super administrators can view audit logs or perform privileged administration.
