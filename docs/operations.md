# Production Operations Runbook

## Health and readiness

Check `GET /health` or `GET /health/live` to confirm that the process is alive. Check `GET /health/ready` before routing traffic; readiness verifies PostgreSQL connectivity and returns `503` when the database is unavailable. `GET /health/version` exposes only safe service, version, commit, and environment metadata. `GET /health/metrics` exposes in-process counters and request-duration aggregates suitable for scraping or forwarding to an external monitoring system.

## Incident response

When the API is unhealthy, check liveness, readiness, structured logs, the `X-Request-ID` from the failing response, database connectivity, and the most recent deployment. Do not place credentials, cookies, authorization headers, or tokens in tickets or logs. For a compromised admin account, use the authenticated `POST /admin/auth/logout-all` capability if the account is still accessible, then disable the admin account through the controlled database/admin process and review audit events. For refresh-token compromise, revoke the account sessions, rotate secrets if exposure is suspected, and review login/logout audit events. For rate-limit abuse, preserve the `429` and `Retry-After` evidence, identify the client source through infrastructure logs, and adjust the documented environment limits only after review. For unexpected moderation behavior, verify the current confession/report state, request ID, audit event, and whether another moderator changed the record concurrently.

## Backups and recovery

PostgreSQL production backups are an infrastructure responsibility, not a guarantee provided by this repository. Use encrypted daily full backups with point-in-time recovery where the hosting provider supports it, retain at least 30 days according to organizational policy, and verify restores in an isolated environment at least monthly. Apply Prisma migrations with `pnpm prisma migrate deploy`; never use `prisma db push` in production. Before schema changes, take a verified backup. During recovery, restore PostgreSQL, validate the target schema, deploy the matching application commit, run readiness checks, and inspect audit history. Rollback application code independently where possible; roll back database changes only with a tested reverse migration or restore plan.

## Operational signals

The API emits JSON logs with `level`, `event`, `timestamp`, request ID, route, status, and duration. It tracks `http_requests_total`, `http_errors_total`, `auth_login_failures`, `auth_logins_total`, `auth_logouts_total`, `confessions_submitted_total`, `moderation_actions_total`, `reports_processed_total`, and `theme_mutations_total`. Counters are process-local and should be exported to an external monitor for multi-instance aggregation.
