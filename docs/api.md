# API

The API is hosted by NestJS on port 4000. `GET /health` is the foundation health endpoint. Public confession endpoints continue to expose only published content.

## Public endpoints

- `POST /confessions`
- `GET /confessions?page=1&limit=12`
- `GET /confessions/:publicId`

## Admin authentication

- `POST /admin/auth/login` accepts email and password and returns a safe admin identity plus short-lived access and refresh credentials.
- `POST /admin/auth/refresh` exchanges a valid refresh credential for a new access token.
- `POST /admin/auth/logout` and `GET /admin/auth/me` require a bearer access token.

Passwords are bcrypt-hashed, secrets come from `JWT_SECRET` and `JWT_REFRESH_SECRET`, and login failures use a generic response. Do not log or return password hashes or secrets.

## Moderation

All endpoints below require authentication. `GET /admin/confessions` supports `status`, `category`, `theme`, `page`, and `limit`. `GET /admin/confessions/:id` returns moderation detail. `PATCH /admin/confessions/:id` explicitly accepts only `content`, `category`, and `themeId`; `POST` actions are `/approve`, `/reject`, and `/archive`.

## Reports, audit, and themes

`GET /admin/reports`, `GET /admin/reports/:id`, `POST /admin/reports/:id/resolve`, and `POST /admin/reports/:id/dismiss` manage report history. `GET /admin/audit-logs` is super-admin only. `GET /admin/themes` is available to administrators and designers; theme creation and editing are restricted to super administrators and designers. `GET /admin/dashboard` returns basic moderation counts.

All admin response projections are intentional. Reporter identity, password hashes, JWTs, and internal secrets are never part of public responses.
