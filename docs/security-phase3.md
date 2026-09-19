# Phase 3 security repair

Admin access tokens are HMAC-signed, contain only `sub`, `role`, `sid`, `iat`, `exp`, and `jti`, and expire after 15 minutes. Refresh credentials expire after seven days and are issued only in the `admin_refresh` HttpOnly cookie. The cookie is `Secure` in production, uses `SameSite=Lax`, and is scoped to `/admin/auth`.

Each login creates an `AdminSession` containing only a SHA-256 refresh-token hash. Refresh validates the signature, expiration, token type, session, active administrator, and stored hash, then rotates the credential by replacing the stored hash. Reuse of the previous credential fails. Logout revokes the session, clears the cookie, and records an audit event. Missing JWT secrets fail closed in production.

`JwtAuthGuard` loads the current administrator on every request, so database role changes and deactivation take effect immediately. `RolesGuard` uses the current database role, not stale token claims. Strict Nest validation rejects unknown request fields. Theme and confession DTOs constrain fields, lengths, enums, and radius values.

The admin frontend keeps only the short-lived access token in runtime state. It sends credentialed requests so the browser manages the HttpOnly refresh cookie, centrally retries one request after a 401, and returns to login if refresh fails. Confession content is rendered as plain text. API CORS uses explicit web and admin origins and Helmet adds baseline security headers.
