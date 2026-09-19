# Architecture

The platform is a pnpm monorepo with public web, admin web, API, and shared packages. NestJS owns validation, authorization, moderation state transitions, and Prisma persistence. The public confession module retains explicit safe projections and published-only queries.

## Phase 3 repair architecture

The API exposes an isolated `/admin/*` namespace. `JwtAuthGuard` verifies a short-lived HMAC access token and loads the current `AdminUser` on every request; the database role and active status are authoritative. `RolesGuard` applies centralized role metadata. Strict global validation rejects unknown fields, while confession and theme DTOs constrain editable properties and values.

Login creates an `AdminSession` with a SHA-256 refresh-token hash. Refresh credentials are rotated in an HttpOnly cookie and never returned to JavaScript or stored raw. Logout revokes the session and clears the cookie. Helmet and explicit credentialed CORS origins provide baseline browser/API hardening. Missing production JWT secrets fail closed.

The admin Next.js app uses one centralized session client. It keeps only the short-lived access token in runtime state, sends credentialed requests for the HttpOnly cookie, refreshes once after a 401, and returns to login when refresh fails. Routes provide dashboard, queue, confession detail/edit/actions, reports, audit logs, and themes. Role-aware navigation is UX only; API guards remain the security boundary.

The public app remains anonymous. Public feed and detail endpoints expose only `PUBLISHED` confessions and never return original content, editor data, reports, audit data, or admin identity.

## Phase 4 operations workspace

Phase 4 builds on the secure Phase 3 admin client rather than introducing a second application architecture. The client now provides operational metric cards, server-filtered confession and report workspaces, a confession review/editor screen, a `SUPER_ADMIN` audit activity screen, and a role-aware theme management screen with a reusable public-card preview. Search, sorting, and pagination are handled by Prisma-backed API filters, so the browser never fetches an entire table for client-side searching.

The UI deliberately treats role hiding as usability only. Moderation routes remain protected by the existing session-backed `JwtAuthGuard` and `RolesGuard`; theme mutations remain restricted to `SUPER_ADMIN` and `DESIGNER`, while audit activity remains `SUPER_ADMIN` only. Successful moderation and theme mutations continue through `AdminService` and create audit records. No schema changes or new environment variables were required for Phase 4.
