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
