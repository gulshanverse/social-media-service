# Public SEO and Route Policy

This policy reflects the Next.js routes under `apps/web/app`, the separate admin app under `apps/admin/app`, and the API controllers under `apps/api/src`. The generated sitemap is deliberately narrower than the route inventory: it contains only entries in `apps/web/lib/seo-routes.ts`.

Canonical public origin: `https://www.confessions.live`. Public pages use that origin for canonicals. Query strings and session data are not canonical URL variants.

## Public information and feature landing pages

| Route                   | Indexing                       | Canonical                      | Sitemap | Public access                                                                 | Ads                                                                 |
| ----------------------- | ------------------------------ | ------------------------------ | ------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `/`                     | Index                          | `https://www.confessions.live` | Yes     | Public                                                                        | Ineligible: the client-rendered community preview includes live UGC |
| `/about`                | Index                          | Exact path                     | Yes     | Public                                                                        | Eligible under the same opt-in flag                                 |
| `/how-it-works`         | Index                          | Exact path                     | Yes     | Public                                                                        | Eligible under the same opt-in flag                                 |
| `/faq`                  | Index                          | Exact path                     | Yes     | Public                                                                        | Eligible under the same opt-in flag                                 |
| `/community-guidelines` | Index                          | Exact path                     | Yes     | Public                                                                        | Eligible under the same opt-in flag                                 |
| `/safety`               | Index                          | Exact path                     | Yes     | Public                                                                        | No ad script placement                                              |
| `/privacy`              | Index                          | Exact path                     | Yes     | Public                                                                        | No ad script placement                                              |
| `/terms`                | Index                          | Exact path                     | Yes     | Public                                                                        | No ad script placement                                              |
| `/contact`              | Index                          | Exact path                     | Yes     | Public                                                                        | No ad script placement                                              |
| `/bawalbox`             | Indexable feature landing page | Exact path                     | Yes     | Public; live prompts/answers are returned only by the public feature endpoint | No ad script placement                                              |
| `/vibematch`            | Indexable feature landing page | Exact path                     | Yes     | Public explanation/entry point                                                | No ad script placement                                              |

Only `/about`, `/how-it-works`, `/faq`, and `/community-guidelines` are current call sites for `AdSenseScript`. The home page is deliberately excluded because its client-rendered community preview contains live UGC. The shared component defaults to disabled and requires both an exact route allowlist match and the opt-in build-time environment flag. There are no ad-unit placements in the application source identified by this review; loading the publisher script does not itself guarantee ads will appear.

## Public user-generated-content routes

| Route                              | Indexing                                           | Canonical                 | Sitemap               | Public access                                                                                             | Ads |
| ---------------------------------- | -------------------------------------------------- | ------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------- | --- |
| `/confessions`                     | Noindex; feed is dynamic/user-generated            | Exact route canonical     | No                    | Public feed API, published items only                                                                     | No  |
| `/confessions/{publicId}`          | Noindex, follow                                    | Exact encoded detail path | No                    | Published detail only; unavailable content returns not found                                              | No  |
| `/garba`                           | Noindex; dynamic feed and submission feature       | Exact route canonical     | No                    | Public posts are published-only; submission is moderated                                                  | No  |
| `/garba/{publicId}`                | Noindex, follow                                    | Exact encoded detail path | No                    | Published detail only; missing/unpublished records return 404; upstream failures show a distinct fallback | No  |
| `/bawalbox` prompt/archive content | Covered by the landing-page URL; no per-prompt URL | Landing canonical         | No separate item URLs | Only server-returned public questions and approved answers                                                | No  |

No per-record user-generated-content URLs are submitted to the sitemap. A later indexing policy for reviewed UGC would require an explicit quality/moderation gate, stable per-item canonicals, removal handling, tests, and a deliberate sitemap decision.

## Private, transactional, utility, and session routes

| Route                                     | Indexing                                    | Canonical               | Sitemap | Access / eligibility                     |
| ----------------------------------------- | ------------------------------------------- | ----------------------- | ------- | ---------------------------------------- |
| `/send`                                   | Noindex, follow                             | Exact route             | No      | Public submission form; no ads           |
| `/collegeconfession`                      | Noindex, follow                             | Exact route             | No      | Submission flow; no ads                  |
| `/report`                                 | Noindex, follow                             | Exact route             | No      | Public report form; no ads               |
| `/vibematch/create`                       | Noindex, follow                             | Exact route             | No      | Session-dependent creation; no ads       |
| `/vibematch/play`                         | Noindex, follow                             | Exact route             | No      | Session-dependent gameplay; no ads       |
| `/vibematch/quick-play`                   | Noindex, follow                             | Exact route             | No      | Session-dependent guest gameplay; no ads |
| `/vibematch/results`                      | Noindex, follow                             | Exact route             | No      | Personalized/session result; no ads      |
| `/vibematch/verify`                       | Noindex, follow                             | Exact route             | No      | Authentication/verification; no ads      |
| `/confessions/{publicId}/not-found` state | Noindex inherited or not indexed as a route | No standalone canonical | No      | Unavailable state; no ads                |
| Framework not-found/error routes          | Not indexable                               | No standalone canonical | No      | Error state; no ads                      |

`robots.txt` disallows `/admin`, `/private`, `/pending`, and `/api` for crawler efficiency. These directives are not access control; application authentication, authorization, and public query filters remain the security boundary. User-facing noindex metadata is used on crawlable private/transactional routes so search engines that can reach them can observe it.

## Administrative and API routes

The admin interface is a separate Next.js application. Its current route files are `/`, `/audit-logs`, `/audit`, `/confessions`, `/confessions/{id}`, `/garba`, `/login`, `/profile-page`, `/reports`, and `/themes`. These are not public-search destinations, must remain protected according to their existing authentication/RBAC behavior, are excluded from the public sitemap, and are never ad eligible. Robots rules do not replace those controls.

The Nest API route inventory (methods are shown explicitly; `:id`, `:publicId`, and similar tokens are path parameters) is:

- Confessions and discussion: `GET/POST /confessions`; `GET /confessions/profile-settings`; `GET /confessions/theme/active`; `GET /confessions/:publicId`; `POST /confessions/:publicId/report`; `GET/POST/DELETE /confessions/identity`; `GET/POST /confessions/:publicId/reactions`; `GET/POST /confessions/:publicId/comments`; `POST /confessions/:publicId/comments/:commentId/report`.
- BawalBox: `GET /bawalbox`; `POST /bawalbox/questions/:id/responses`.
- Garba: `GET /garba/season`; `GET/POST /garba`; `GET /garba/:publicId`; `POST /garba/:publicId/react`; `POST /garba/:publicId/comments`; `POST /garba/:publicId/report`; `POST /garba/:publicId/comments/:commentId/report`.
- VibeMatch authentication and session APIs: `POST /vibematch/auth/guest/start`; `POST /vibematch/auth/magic-link`; `POST /vibematch/auth/verify`; `POST /vibematch/auth/eligibility`; `POST /vibematch/auth/logout`; `GET /vibematch/colleges`; `GET /vibematch/discovery`; `POST /vibematch/blocks`; `DELETE /vibematch/blocks/:matchKey`; `GET/POST/PATCH/DELETE /vibematch/profile`; `POST /vibematch/sessions`; `GET /vibematch/sessions/:id`; `GET /vibematch/sessions/:id/current-round`; `POST /vibematch/sessions/:id/answers`; `POST /vibematch/sessions/:id/complete`; `GET /vibematch/sessions/:id/result`.
- Administrative authentication: `POST /admin/auth/login`, `/admin/auth/refresh`, `/admin/auth/logout`, `/admin/auth/logout-all`; `GET /admin/auth/sessions` and `/admin/auth/me`. Session-bound routes require authentication.
- Administrative operations and moderation: `/admin/dashboard`; `/admin/confession-comments` and `/admin/confession-comments/:id/:action`; `/admin/users` and `/admin/users/:id` (including role, status, password-reset, revoke-session, and delete actions); `/admin/garba`, `/admin/garba/posts`, `/admin/garba/posts/:id`, `/admin/garba/posts/:id/:action`, `/admin/garba/posts/:id/comments-lock`, `/admin/garba/comments`, `/admin/garba/comments/:id`, `/admin/garba/comments/:id/:action`, `/admin/garba/reports`, `/admin/garba/reports/:id/:action`, `/admin/garba/seasons`; `/admin/confessions`, `/admin/confessions/:id` (including approve, reject, archive, restore, bulk, and delete actions); `/admin/reports`, `/admin/reports/:id` (resolve/dismiss actions); `/admin/audit` and `/admin/audit-logs`; `/admin/themes` (including import/export, publish, activate, duplicate, favorite, and delete actions); `/admin/profile-settings`; `/admin/profile-image`; and `/admin/bawalbox/settings`, `/admin/bawalbox/questions`, `/admin/bawalbox/questions/:id`, `/admin/bawalbox/questions/:id/responses`, `/admin/bawalbox/responses/:id`.
- RBAC: `/admin/rbac/permissions`; `/admin/rbac/users/:id/access`; `/admin/rbac/roles` and `/admin/rbac/roles/:key`; `/admin/rbac/users/:id/roles`, `/admin/rbac/users/:id/roles/:key`, `/admin/rbac/users/:id/overrides`, `/admin/rbac/users/:id/overrides/:key`.
- Operations: `GET /health`, `/health/live`, `/health/ready`, `/health/version`, `/health/metrics`, and `/metrics`.

API JSON endpoints are not page destinations: they are excluded from the sitemap, are not ad eligible, and must retain their existing public/private query filters, DTO validation, rate limits, authentication, and RBAC. No API contract or database schema change is part of this SEO route policy.

## Maintenance rules

- Add static public pages to `INDEXABLE_STATIC_ROUTES` only after checking that their visible content warrants search indexing.
- Keep canonical origin, sitemap origin, and robots sitemap reference aligned through the shared origin constant.
- Do not add `lastModified` unless a reliable content source timestamp is available.
- Keep dynamic UGC, submission, report, authentication, result, admin, API, and error routes out of the static sitemap.
- Review ad eligibility independently of indexability; being indexable does not make a route ad eligible.
