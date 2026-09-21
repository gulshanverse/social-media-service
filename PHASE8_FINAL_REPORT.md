# PHASE 8 — FINAL REPORT

## 1. Executive Summary

Overall status: **PASS WITH UNVERIFIED ITEMS**.

The Phase 8 audit confirmed that the existing Vercel web project is the intended production project and that `confessions.live` plus `www.confessions.live` are attached and provider-verified. Vercel currently configures the apex to redirect to `www.confessions.live` with HTTP 308, while the existing `collegeconfession.vercel.app` alias remains attached. The existing admin project and Render PostgreSQL instance were left unchanged.

The API custom hostname `api.confessions.live` is not currently verified as attached, DNS-ready, TLS-ready, or reachable. The authenticated Render connector exposed the existing API service and its deployment settings but no custom-domain mutation, and the Render dashboard requested an interactive login. Because the API prerequisite was not verified, the production `NEXT_PUBLIC_API_URL` and API `WEB_ORIGIN` were intentionally not changed. No infrastructure, database, secret, or application behavior was changed in this pass.

## 2. Final Architecture

| Component  | Target architecture                                                                          | Verified state                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public Web | `https://confessions.live` with Vercel project `social-media-service-staging-web`            | Vercel association and domain verification PASS; live HTTPS request from this sandbox UNVERIFIED. Provider canonical redirect is to `https://www.confessions.live`. |
| API        | `https://api.confessions.live` on existing Render service `social-media-service-staging-api` | UNVERIFIED; custom hostname was not reachable and was not present in returned Render service metadata.                                                              |
| Admin      | `https://smsccadmin.vercel.app` on existing Vercel project `social-media-service-admin`      | Existing domain association PASS; no Phase 8 change made. Authenticated browser workflow UNVERIFIED.                                                                |
| Database   | Existing Render PostgreSQL `social-media-service-staging-db`                                 | Instance exists and was reported `available`; no database change made.                                                                                              |

## 3. Domain Configuration

| Component     | Old URL                                                 | New URL                        | Status                                              | Evidence                                                                                                                  |
| ------------- | ------------------------------------------------------- | ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Public Web    | `https://collegeconfession.vercel.app`                  | `https://confessions.live`     | PASS provider association / UNVERIFIED live HTTPS   | Vercel reported both domains on `social-media-service-staging-web` with `verified: true`; the old alias remains attached. |
| Web canonical | N/A                                                     | `https://www.confessions.live` | PASS provider configuration / UNVERIFIED live HTTPS | Vercel reported `confessions.live` redirecting to `www.confessions.live` with status `308`.                               |
| API           | `https://social-media-service-staging-api.onrender.com` | `https://api.confessions.live` | UNVERIFIED                                          | Render reported the existing `onrender.com` URL only; the custom hostname returned no successful HTTPS response.          |
| Admin         | `https://smsccadmin.vercel.app`                         | unchanged                      | PASS association / UNVERIFIED authenticated flow    | Vercel reported the domain verified on `social-media-service-admin`; no admin domain change was made.                     |

## 4. DNS / TLS

Vercel provider evidence reports `confessions.live` and `www.confessions.live` as verified and reports the apex-to-`www` 308 redirect. A direct request to `https://confessions.live` from this sandbox did not complete TLS successfully, so live browser HTTPS remains UNVERIFIED.

The API hostname `api.confessions.live` did not complete HTTPS requests for `/health/live`, `/health/ready`, `/health/version`, or `/metrics`. Render service metadata did not expose that custom hostname, and the available authenticated dashboard session was not available for configuration. DNS records and API TLS are therefore **UNVERIFIED**. No DNS records were invented or changed.

## 5. Environment Changes

No production environment changes were made because the custom API domain was not confirmed healthy first.

| Variable              | Current evidence                                                                                                   | Phase 8 status                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | Production value on both Vercel web and admin projects is `https://social-media-service-staging-api.onrender.com`. | Target `https://api.confessions.live` NOT APPLIED; safe rollback preserved.    |
| `WEB_ORIGIN`          | Render environment values were not decrypted or printed. Repository configuration requires an explicit origin.     | Target `https://confessions.live` NOT APPLIED pending API-domain verification. |
| `ADMIN_ORIGIN`        | Required existing admin origin is `https://smsccadmin.vercel.app`.                                                 | Unchanged; no wildcard origin introduced.                                      |

No secret values were read, printed, committed, or changed.

## 6. CORS

The application continues to use exact-origin credentialed CORS rather than wildcard credentialed CORS. The intended final allowlist remains the public web origin `https://confessions.live` and admin origin `https://smsccadmin.vercel.app`, but target-origin browser requests were not run because the API custom hostname was not healthy. Existing old-domain traffic was preserved.

## 7. Authentication

No authentication code or configuration was changed. The previously implemented cross-site session behavior was preserved. The intended production refresh cookie attributes remain **HttpOnly**, **Secure**, and **SameSite=None** according to the Phase 8 requirements, but hosted login, refresh, cookie-attribute inspection, logout, and session persistence against the target API are **UNVERIFIED**. Cookie values were not accessed or logged.

## 8. Production Smoke Test

| Check                                | Result     | Evidence                                                                                                                                          |
| ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing web homepage                | PASS       | `https://collegeconfession.vercel.app` returned HTTP 200.                                                                                         |
| Custom web homepage                  | UNVERIFIED | `https://confessions.live` did not complete a successful HTTPS request from this sandbox.                                                         |
| Existing API live health             | PASS       | `https://social-media-service-staging-api.onrender.com/health/live` returned HTTP 200 and `{"status":"ok","service":"social-media-service-api"}`. |
| Custom API live health               | UNVERIFIED | `https://api.confessions.live/health/live` did not complete HTTPS.                                                                                |
| Custom API readiness/version/metrics | UNVERIFIED | Target hostname was not reachable.                                                                                                                |
| Public submission                    | UNVERIFIED | No production record was created while the target API was unverified.                                                                             |
| Moderation and admin                 | UNVERIFIED | No authenticated hosted browser session was available; no credentials were exposed.                                                               |
| Published/rejected visibility        | UNVERIFIED | No production test record was created or moderated.                                                                                               |
| Admin refresh/session persistence    | UNVERIFIED | Requires authenticated browser verification.                                                                                                      |

## 9. Analytics

**Implementation verified.** The repository contains `@vercel/analytics@^2.0.1`, imports `Analytics` from `@vercel/analytics/next`, and renders `<Analytics />` in `apps/web/app/layout.tsx`.

**Dashboard traffic verified: UNVERIFIED.** No live Vercel Analytics dashboard page-view data was independently observed. A successful build or component presence is not dashboard traffic evidence.

## 10. CI

The latest GitHub Actions CI run observed for `main` was `35571160035` with result **PASS**. The previously documented Phase 7 baseline `35566560035` also passed. Local validation for the checked-out `main` revision also passed: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## 11. Security

| Area              | Result                                                         | Evidence                                                                                                      |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| HTTPS             | UNVERIFIED for target live endpoints                           | Vercel provider verification exists, but target live web/API TLS requests did not both complete successfully. |
| CORS              | UNVERIFIED for target domains                                  | Exact-origin behavior remains; custom-domain browser requests were not verified.                              |
| Cookies           | PASS implementation unchanged / hosted verification UNVERIFIED | No cookie code or configuration was changed; target authenticated flow was not available.                     |
| Secrets           | PASS                                                           | No secret values were read, printed, committed, or changed.                                                   |
| Mixed content     | UNVERIFIED                                                     | No successful target-domain browser session was available.                                                    |
| Redirect behavior | PASS provider configuration / live behavior UNVERIFIED         | Vercel reported apex-to-`www` 308; live redirect completion was not observed.                                 |
| Database exposure | PASS no change                                                 | Existing Render PostgreSQL was retained; no migration, `db push`, or exposure change was made.                |

## 12. Remaining Unverified Items

The genuine gaps are: Render attachment and DNS/TLS for `api.confessions.live`; live HTTPS/browser verification for `confessions.live` and its configured `www` canonical redirect; production updates for `NEXT_PUBLIC_API_URL` and `WEB_ORIGIN`; target-domain CORS; public submission; moderation; published/rejected visibility; authenticated admin login, refresh, cookie attributes, logout, and session persistence; target API health/readiness/version/metrics; and live Vercel Analytics dashboard traffic.

## 13. Rollback Plan

The existing working domains remain available. If a future custom-domain rollout fails, keep `https://collegeconfession.vercel.app` and `https://social-media-service-staging-api.onrender.com` attached, restore production `NEXT_PUBLIC_API_URL` to the existing Render URL, restore `WEB_ORIGIN` to the existing public web origin, redeploy the affected service, and verify the old-domain flow. Do not delete old aliases until custom-domain API, CORS, authentication, submission, and admin checks pass.

## 14. Git

- Commit SHA before this report update: `1e73333` (`docs: add phase 8 domain launch evidence`)
- Commit SHA for this report update: `cef4e93`
- Commit message: `docs: finalize phase 8 launch evidence`
- Branch: `main`
- Working tree: clean after push

No production source, authentication, CORS, database migration, or deployment configuration files were modified.
