# API

The API is hosted by NestJS on port 4000. `GET /health` is the foundation health endpoint. Public confession endpoints continue to expose only published content.

## Public endpoints

- `POST /confessions` creates a `PENDING` confession. `themeId` is the actual database Theme ID; built-in seed theme IDs match the shared theme IDs.
- `GET /confessions?page=1&limit=12`
- `GET /confessions/:publicId`

Public projections never include `originalContent`, editor data, reports, audit records, password hashes, session hashes, or administrator data.

## Admin authentication

- `POST /admin/auth/login` accepts email and password, returns a safe admin identity and short-lived access token, and sets the rotating refresh credential in an HttpOnly `admin_refresh` cookie.
- `POST /admin/auth/refresh` reads the HttpOnly cookie, validates the server-side session, atomically rotates the refresh credential, and returns a new access token.
- `POST /admin/auth/logout` and `GET /admin/auth/me` require a bearer access token.

Access tokens expire after 15 minutes, contain an explicit `type: access`, and are accepted only while their referenced active `AdminSession` remains unrevoked and unexpired. Refresh tokens expire after seven days, contain `type: refresh`, use a separate secret, and are never returned in JSON, stored in browser storage, logged, or stored raw in the database. Invalid refresh requests return a generic 401 and clear the cookie. Logout revokes the session so existing access tokens immediately stop working.

## Moderation

Confession reads, edits, and approve/reject/archive actions are restricted to `SUPER_ADMIN` and `MODERATOR`. Edits accept only `content`, `category`, and `themeId`, require a valid `ConfessionCategory` and database Theme ID, trim content, and are allowed only for `PENDING` records. `originalContent` and all protected persistence fields remain immutable.

## Reports, audit, and themes

`GET /admin/reports`, `GET /admin/reports/:id`, `POST /admin/reports/:id/resolve`, and `POST /admin/reports/:id/dismiss` are restricted to `SUPER_ADMIN` and `MODERATOR`. Only `OPEN` reports may transition to `RESOLVED` or `DISMISSED`. `GET /admin/audit-logs` is `SUPER_ADMIN` only. `GET /admin/themes` is available to all administrator roles; theme creation and editing are restricted to `SUPER_ADMIN` and `DESIGNER`, with immutable slugs. `GET /admin/dashboard` is available to any authenticated active administrator.

All admin response projections are intentional. Reporter identity, password hashes, JWTs, session refresh hashes, and internal secrets are never returned to frontend clients.

## Phase 4 admin workspace

The authenticated admin workspace uses these protected routes:

- `GET /admin/dashboard` returns aggregate operational metrics: pending, published, rejected, total confessions, open/resolved reports, and active themes.
- `GET /admin/confessions?page=1&limit=20&status=PENDING&category=CRUSH&search=campus&order=newest` supports server-side pagination, status/category/theme filtering, public ID/content search, and newest/oldest ordering.
- `GET /admin/reports?page=1&limit=20&status=OPEN&search=spam&order=newest` supports server-side report-reason/confession-reference search and consistent pagination.
- `GET /admin/audit?page=1&limit=30&action=EDIT&entity=CONFESSION` is a `SUPER_ADMIN`-only, newest-first audit workspace. `/admin/audit-logs` remains an alias.
- `GET /admin/themes`, `POST /admin/themes`, and `PATCH /admin/themes/:id` power theme listing, creation, editing, and live preview in the admin client.

All query parameters use strict runtime DTO validation. Admin list endpoints return `{ items, page, limit, total, hasMore }` where applicable. The admin client provides explicit loading, empty, error, success, confirmation, and responsive states. Theme previews use database Theme properties while `themeId` continues to mean `Theme.id`; slugs are immutable during updates.

## Phase 4 closure hardening

`GET /admin/themes?page=1&limit=20` now uses the same `{ items, page, limit, total, hasMore }` contract as the other admin workspaces. The confession queue theme filter loads human-readable theme names while sending the actual database `Theme.id` to the server. Theme updates preflight resource existence and return `404 Theme not found.` rather than leaking database exception details.

## Phase 5 operational contracts

The API exposes `GET /health` and `GET /health/live` for liveness, `GET /health/ready` for PostgreSQL readiness, `GET /health/version` for safe build metadata, and `GET /health/metrics` for lightweight operational counters. Every response includes `X-Request-ID`; a valid bounded incoming request ID is reused, otherwise one is generated.

Errors are normalized to `{ statusCode, message, code, requestId }` where a request ID is available. Production responses do not expose stack traces, Prisma errors, SQL, paths, secrets, tokens, cookies, or authorization headers. `429` responses include `Retry-After` where applicable.

Authenticated administrators may call `GET /admin/auth/sessions` to see safe metadata for their own active sessions and `POST /admin/auth/logout-all` to revoke all of their sessions. No session token or hash is returned. Moderators and super administrators may call `POST /admin/confessions/bulk` with `{ ids, action }`; the response contains `requested`, `processed`, `skipped`, and per-ID high-level outcomes. Each record is re-evaluated server-side and stale or invalid records are skipped safely.
