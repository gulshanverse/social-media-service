# Production Security

The API retains session-backed HMAC access tokens, rotating HttpOnly refresh cookies, refresh-token hashing, replay protection, expiration checks, session ownership checks, inactive-admin rejection, and database-authoritative roles. Access tokens are sent in the `Authorization` header; the refresh cookie is scoped to `/admin/auth` and is never used as general API authentication. In production, cookies are secure and CORS origins must be explicitly configured through `WEB_ORIGIN` and `ADMIN_ORIGIN`; wildcard authenticated CORS is not supported.

Nest validation uses whitelist and unknown-field rejection. Admin responses use explicit Prisma projections. Passwords, password hashes, tokens, refresh hashes, cookies, authorization headers, secrets, and database URLs are not returned or written to structured logs. Errors use a stable `{ statusCode, message, code, requestId }` shape where applicable. Request IDs accept only bounded alphanumeric, dot, underscore, and hyphen values; unsafe values are replaced with a generated UUID.

Login and refresh endpoints have IP-aware process-local throttles with `429` and `Retry-After`. This is production-safe for a single API instance. If the deployment becomes multi-instance, move the limiter state to an organization-approved shared gateway or store; Redis is not required by the current single-instance architecture.

Admin roles remain backend-authoritative: `SUPER_ADMIN` has all intended operations, `MODERATOR` can moderate and process reports, and `DESIGNER` can read and manage themes but cannot moderate, process reports, or inspect audit logs. Audit logs are append-only through the application API; no edit or delete endpoint is exposed. Production database permissions should further restrict direct mutation of `AuditLog`.

## Administrator lifecycle security

Administrator state is backend-authoritative and derived from additive `isActive`, `bannedAt`, and `deletedAt` fields: `ACTIVE`, `INACTIVE`, `BANNED`, and `DELETED`. Login, refresh, and the bearer guard reject every non-active state. Deactivation, banning, deletion, and password reset revoke active `AdminSession` records; password reset also invalidates the old password.

Only `SUPER_ADMIN` can use administrator-management routes. New accounts are limited to `MODERATOR` and `DESIGNER`, and role changes cannot grant or remove `SUPER_ADMIN`. Self-lockout is blocked, as is disabling, banning, or deleting the last active `SUPER_ADMIN`. Lifecycle actions append safe audit metadata and never log passwords, hashes, tokens, cookies, or secrets.
