# AdSense, SEO, Content Quality, and Production Crawl Audit

**Audit date:** 2026-10-29 (Asia/Kolkata)
**Repository:** `gulshanverse/social-media-service`
**Production origin:** `https://www.confessions.live`
**Production crawl user agent:** `Mozilla/5.0 (compatible; ConfessionsReadinessAudit/1.0)`
**Production crawl:** 2026-10-29 22:21:52 +05:30; focused session-route probes at 22:52:57 +05:30.

## A. Executive summary

**Repository implementation: PASS. Production readiness: BLOCKED pending deployment and owner-only checks.** The clean `main` checkout at baseline commit `4dc8d065b535c1d3d56eaf040832b130cf4a756c` was audited and updated in place. Verified code issues were fixed, regression tests added, and the complete workspace format, lint, typecheck, test, and build gates passed. The production site was not changed.

The highest-priority source issue was a public Garba API serializer that spread Prisma rows—including stable IP-derived abuse-prevention hashes and internal moderation/database fields—into list/detail responses. Public post/comment projections are now explicit allowlists, including the comment-create response, and regression tests verify sensitive fields are absent. Other fixes cover VibeMatch session-page indexing/canonicals, inaccurate sitemap freshness/completeness, home-page ad eligibility despite a client-rendered UGC preview, and unavailable-page status/metadata.

The live site remains on the pre-fix build. Its sitemap still omits BawalBox and VibeMatch and publishes a fixed `lastmod`; live VibeMatch session routes currently inherit the homepage canonical and are not noindexed; and an unknown confession 404 inherits homepage metadata. Do not treat this report as Google AdSense approval or as evidence that Google Search Console checks passed.

## B. Files changed

There are **28 changed files** in total: 22 modified and 6 added (including this report). All changes remain uncommitted.

| File                                                | Reason and behavior changed                                                                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                         | Corrected stale AdSense route guidance, documented the build-time flag/rebuild behavior, and linked the route-policy document.                                 |
| `apps/api/src/garba/garba.service.ts`               | Replaced Prisma-row spreading with public allowlists for posts, comments, replies, and comment-create responses; excluded author hashes and internal fields.   |
| `apps/api/src/garba/garba.service.test.ts`          | Added regression assertions that list/detail/create responses retain public fields but never expose IP-derived hashes or internal identifiers/status fields.   |
| `apps/web/app/about/page.tsx`                       | Uses exact `/about` route eligibility for the publisher script.                                                                                                |
| `apps/web/app/bawalbox/page.tsx`                    | Uses shared canonical metadata and a descriptive, accurate feature title/description.                                                                          |
| `apps/web/app/community-guidelines/page.tsx`        | Uses exact `/community-guidelines` route eligibility for the publisher script.                                                                                 |
| `apps/web/app/confessions/[publicId]/not-found.tsx` | Adds noindex unavailable-state metadata and prevents inheriting the homepage canonical.                                                                        |
| `apps/web/app/faq/page.tsx`                         | Uses exact `/faq` route eligibility for the publisher script.                                                                                                  |
| `apps/web/app/garba/[publicId]/page.tsx`            | Adds route-specific noindex canonical metadata; returns a true 404 for missing/unpublished API records and distinguishes upstream errors from removed content. |
| `apps/web/app/how-it-works/page.tsx`                | Uses exact `/how-it-works` route eligibility for the publisher script.                                                                                         |
| `apps/web/app/layout.tsx`                           | Uses the shared canonical production origin for metadata base, root canonical, and root Open Graph URL.                                                        |
| `apps/web/app/page.tsx`                             | Removes AdSense loading from the homepage because its JavaScript community preview contains live UGC.                                                          |
| `apps/web/app/robots.ts`                            | References the sitemap via the shared production origin.                                                                                                       |
| `apps/web/app/sitemap.ts`                           | Generates URLs from a centralized eligible-route inventory, uses the canonical root form, and omits unreliable fixed `lastModified` values.                    |
| `apps/web/app/vibematch/create/page.tsx`            | Adds an exact canonical and `noindex,follow` metadata for the session-creation utility.                                                                        |
| `apps/web/app/vibematch/page.tsx`                   | Adds a specific public landing-page description and canonical.                                                                                                 |
| `apps/web/app/vibematch/play/page.tsx`              | Adds an exact canonical and `noindex,follow` metadata for session gameplay.                                                                                    |
| `apps/web/app/vibematch/quick-play/page.tsx`        | Adds an exact canonical and `noindex,follow` metadata for guest sessions.                                                                                      |
| `apps/web/app/vibematch/results/page.tsx`           | Adds an exact canonical and `noindex,follow` metadata for personalized results.                                                                                |
| `apps/web/app/vibematch/verify/page.tsx`            | Adds an exact canonical and `noindex,follow` metadata for authentication verification.                                                                         |
| `apps/web/app/not-found.tsx`                        | Adds an accessible site-level not-found page with noindex metadata and no inherited homepage canonical.                                                        |
| `apps/web/app/adsense-policy.test.tsx`              | Tests exact ad-route allowlisting, off-by-default behavior, and exclusion of UGC/session/utility routes.                                                       |
| `apps/web/app/seo-route-policy.test.tsx`            | Tests sitemap membership, canonical origin/root behavior, robots sitemap reference, and index/noindex/error metadata.                                          |
| `apps/web/components/AdSenseScript.tsx`             | Requires the explicit opt-in flag and an exact four-route allowlist; no substring/path-prefix matching.                                                        |
| `apps/web/lib/metadata.ts`                          | Centralizes canonical construction and adds named private/unavailable-page metadata helpers.                                                                   |
| `apps/web/lib/seo-routes.ts`                        | Adds the canonical origin and testable indexable static route inventory.                                                                                       |
| `docs/seo-route-policy.md`                          | Documents public, UGC, utility, admin, and API route policies and their sitemap/ad/access behavior.                                                            |
| `docs/adsense-readiness-audit-2026-10-29.md`        | This evidence-based completion and blocker report.                                                                                                             |

No database schema, migrations, production environment variables, DNS, deployment settings, or production records were changed. No commits or pushes were made.

## C. Findings and fixes

### High — Garba API exposed internal data and IP-derived hashes

**Evidence:** `safePost()` in `apps/api/src/garba/garba.service.ts` previously returned `{ ...post }`. Prisma queries return scalar columns by default. The `GarbaPost.authorHash` field is populated from an IP hash; comments and replies also contain author hashes and internal state. The public list and detail endpoints used this serializer, and the comment-create endpoint returned a raw Prisma row.

**Root cause:** Public projections were implemented as database-row spreading with a few overwritten fields instead of an explicit allowlist.

**Fix:** Constructed public DTOs for posts/comments/replies and a minimal comment-create result. Kept the fields used by public UI while dropping author hashes, moderation state, internal post/season IDs, update timestamps, and other unneeded scalars.

**Regression test:** Garba unit tests assert expected visible fields remain and sensitive fields/recognizable fake hash values are absent from list, detail, nested replies, and comment-create responses.

### High — VibeMatch session routes were indexable and canonicalized to the homepage

**Evidence:** Live production GETs for `/vibematch/create`, `/vibematch/play`, `/vibematch/quick-play`, `/vibematch/results`, and `/vibematch/verify` returned 200 with the homepage canonical; most inherited the generic homepage description and none exposed a robots noindex directive. `/vibematch` itself also canonicalized to the homepage.

**Root cause:** Several page modules declared only a title (or title/description) and inherited root metadata for canonical and robots policy.

**Fix:** Added dedicated landing metadata for `/vibematch`; session/play/result/verification routes now receive exact path canonicals and `noindex,follow` metadata. Local built-site smoke checks confirmed the intended metadata.

**Regression test:** Shared metadata helper tests verify canonical origin/path and noindex behavior; the sitemap regression test excludes all session-dependent routes.

### Medium — Sitemap was stale and incomplete

**Evidence:** The production sitemap returned 200 with nine URLs. Every listed URL returned 200, but the sitemap included a fixed `lastmod` of `2026-10-01`, omitted the public BawalBox and VibeMatch landing pages, and its root URL included a trailing slash while the live root canonical did not.

**Root cause:** Routes were maintained in a local array with a fabricated/stale date rather than a centralized route policy.

**Fix:** Added `INDEXABLE_STATIC_ROUTES` and `SITE_ORIGIN`; included BawalBox and VibeMatch as useful standalone feature landings, normalized the root URL, omitted `lastModified`, and aligned robots and metadata with the shared origin. Dynamic UGC and session routes remain excluded.

**Regression test:** Web tests assert exact sitemap membership, canonical origin, no query variants, no fabricated last-modified values, and exclusion of private/session/UGC paths.

### Medium — Homepage ad script could load on a page with live UGC

**Evidence:** The live homepage’s post-JavaScript browser view showed the community-preview section populated from the public confession feed. Source showed `AdSenseScript` was included on the homepage when the opt-in flag was true. No ad unit placement was found in application source, and the live browser DOM contained zero AdSense serving-script URLs at crawl time; the production flag itself was not accessible.

**Root cause:** The homepage was in the informational-page ad call sites despite embedding dynamic user-submitted content.

**Fix:** Removed the publisher component from the homepage and restricted the component to exact paths `/about`, `/how-it-works`, `/faq`, and `/community-guidelines`, in addition to the disabled-by-default build-time flag. No ads are added to BawalBox, Garba, VibeMatch, feeds/details, submissions, reports, authentication, or admin pages.

**Regression test:** AdSense tests cover the exact route allowlist, reject path-prefix/query variants and UGC/session routes, and verify a safe-off default.

### Medium — Error states inherited misleading canonical/title metadata; Garba unavailable pages could return 200

**Evidence:** A production request to an unknown confession URL returned HTTP 404 but had the homepage title/description/canonical. Source also returned a generic Garba “unavailable” page with HTTP 200 for any non-success API response, conflating a missing/unpublished post with upstream errors.

**Root cause:** The site lacked a root `not-found.tsx`; the nested confession not-found state had no metadata override; Garba treated all non-2xx responses identically.

**Fix:** Added accessible site-level 404 UI with `noindex` and no canonical, applied the same unavailable metadata to confession detail not-found, and made Garba API 404s call Next `notFound()` while network/upstream errors show a distinct fallback.

**Regression test:** Tests assert unavailable metadata clears inherited canonical; local built-site smoke returned HTTP 404 for an unknown route with `noindex` and no canonical. The existing full test/build suite passed.

### Moderate — A live homepage preview warrants content-owner review

**Evidence:** The read-only browser view rendered live user submissions after JavaScript; at least some wording appeared to contain identifying campus cues or an external social handle. No submission text or personal detail is reproduced here.

**Action taken:** Excluded the homepage from AdSense script eligibility. The API source uses published-only public reads; no production content was edited because production database changes were explicitly out of scope.

**Remaining action:** A moderator with production access should review the affected public items under existing community rules and use the established edit/archive/remove workflow if appropriate. This is an owner moderation decision, not a safe automated SEO rewrite.

## D. Verification results

| Check                                 | Result                                               | Evidence / limitations                                                                                                                                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format                                | **PASS**                                             | `pnpm format:check`; final documentation changes were formatted and rechecked.                                                                                                                                                                                                              |
| Lint                                  | **PASS**                                             | `pnpm lint`; no lint errors. Existing tooling emitted deprecation/config warnings.                                                                                                                                                                                                          |
| Typecheck                             | **PASS**                                             | `pnpm typecheck` across shared packages, API, admin, and web.                                                                                                                                                                                                                               |
| Tests                                 | **PASS**                                             | `pnpm test`; API scripted tests passed, admin Vitest: 22 tests, web Vitest: 34 tests (including new route/AdSense tests).                                                                                                                                                                   |
| Build                                 | **PASS**                                             | `pnpm build`; API, admin Next app, and web Next app built.                                                                                                                                                                                                                                  |
| Whitespace/secrets review             | **PASS**                                             | `git diff --check` clean; targeted scan of changed source/docs found no credential patterns.                                                                                                                                                                                                |
| Production HTTP crawl                 | **PASS with findings**                               | Bounded crawl visited 18 internally discoverable URLs at 0.25-second spacing. All 18 returned HTTP 200; sitemap URLs were separately fetched and all nine returned 200. Production metadata/sitemap defects listed above remain live until deployment.                                      |
| Production redirect/canonical probes  | **PASS with findings**                               | HTTP and apex-domain variants resolved to `https://www.confessions.live/`; `/about/` resolved to `/about`. Live VibeMatch canonical defects and root sitemap slash inconsistency were found.                                                                                                |
| Production `robots.txt`               | **PASS**                                             | HTTP 200; references `https://www.confessions.live/sitemap.xml`; blocks `/admin`, `/private`, `/pending`, and `/api`. These are crawl directives, not authorization.                                                                                                                        |
| Production sitemap                    | **FAIL (source fix ready, not deployed)**            | HTTP 200 and all nine current entries returned 200, but BawalBox/VibeMatch are absent and a fixed `lastmod` is present.                                                                                                                                                                     |
| Production AdSense endpoints          | **PASS, account state BLOCKED**                      | `/ads.txt` returned 200 with valid Google seller syntax; the numeric publisher ID matches the single visible verification meta. Live homepage browser DOM showed no serving script at that time. The actual production build flag and publisher-account relationship could not be verified. |
| Local sitemap/robots/metadata smoke   | **PASS**                                             | Built app on localhost: selected public/private pages returned expected metadata; sitemap contains 11 canonical-origin routes with no dates; robots points to canonical sitemap; ads.txt served expected line.                                                                              |
| Local 404 smoke                       | **PASS**                                             | Unknown path returned 404, no canonical, and `noindex`; local VibeMatch utility pages returned their own canonical and `noindex,follow`.                                                                                                                                                    |
| UGC moderation/privacy                | **PASS at source/unit level; production DB BLOCKED** | Source review confirmed public feed/detail queries are status-filtered; Garba DTO regression tests pass. Live database moderation states and individual records cannot be verified without authorized DB/admin access.                                                                      |
| Browser-rendered DOM                  | **PASS, limited**                                    | My Browser rendered the desktop homepage after an initial navigation timeout; live community-preview text appeared after client fetch. Browser console execution was unsupported by this browser adapter.                                                                                   |
| Mobile/console/network browser QA     | **BLOCKED**                                          | This browser session did not expose a working console/network action or mobile viewport control. No forms were submitted.                                                                                                                                                                   |
| Database migration/schema validation  | **NOT RUN**                                          | No schema changed; no migration was required or executed. `prisma validate` was not run in this session.                                                                                                                                                                                    |
| Docker/security/dependency checks     | **NOT RUN**                                          | No dependency changes were made. Docker/dependency review was not executed.                                                                                                                                                                                                                 |
| Production deployment/settings        | **BLOCKED**                                          | No deployment or environment change was authorized. Vercel project listing exposed a staging web project and admin project, but no production public-web project; the production flag could not be inspected.                                                                               |
| Search Console/AdSense account review | **BLOCKED**                                          | No Google Search Console or AdSense account access was available. Google approval is not claimed.                                                                                                                                                                                           |

The initial checkout was clean at baseline. A separate baseline test run was not captured before edits; the final full quality suite passed.

## E. Remaining blockers and exact next actions

1. **Production public-web deployment/configuration:** provide or connect the actual production web-hosting project (the authorized Vercel list showed only `social-media-service-staging-web` and `social-media-service-admin`). Confirm whether `NEXT_PUBLIC_ADSENSE_INFO_PAGES_ENABLED` is intentionally enabled for the production web build. If changed, rebuild and redeploy because it is a `NEXT_PUBLIC_` build-time variable.
2. **Production API deployment:** deploy the updated API service so Garba responses stop exposing stored hashes/internal values. No database migration is needed.
3. **Live content moderation:** have an authorized moderator review current homepage-preview items that appear to include identifying cues, using existing moderation controls. No live records were changed during this audit.
4. **Post-deployment verification:** re-run the route crawl and verify all 11 sitemap URLs, all VibeMatch session routes’ `noindex`/canonical tags, 404 behavior for removed confession/Garba detail URLs, and public Garba list/detail/comment payloads with a safe staging fixture. Confirm the AdSense script appears only on the four exact eligible routes if the production flag is deliberately enabled.
5. **Google account checks:** use Search Console to inspect indexing/crawl reports and the AdSense account to verify site ownership, publisher relationship, policy status, and actual serving behavior. These require owner credentials and cannot be inferred from source or `ads.txt` alone.
6. **Browser/device QA:** rerun desktop/mobile console and network diagnostics with a browser session that supports console, network, and viewport controls; keep all form submission and content publication actions out of the crawl.

## F. Safe deployment instructions

1. Review this diff and merge/deploy through the repository’s normal release workflow; do not deploy this sandbox checkout directly.
2. Deploy the API change and public web changes from the same reviewed release. The API projection change needs **no migration**. Do not run `db push`, change DNS, or edit production records for this release.
3. Verify the production web build environment. Keep `NEXT_PUBLIC_ADSENSE_INFO_PAGES_ENABLED` unset/false unless monetization is intentionally enabled after content and consent review. If changed, rebuild the public web app; do not expect a runtime-only change to affect the built client.
4. After rollout, run read-only checks such as:

   ```bash
   curl -sS -D - https://www.confessions.live/robots.txt
   curl -sS -D - https://www.confessions.live/sitemap.xml
   curl -sS -D - https://www.confessions.live/ads.txt
   curl -sS -D - https://www.confessions.live/vibematch/create
   curl -sS -D - https://www.confessions.live/vibematch/results
   curl -sS -D - https://www.confessions.live/does-not-exist-audit-check
   ```

   Then parse every `<loc>` from `sitemap.xml`, confirm canonical equality and expected 2xx status, confirm unavailable detail URLs return 404/noindex, and check publisher script presence only on the exact allowlisted routes. Use a non-production/staging record for API privacy-response checks.

## G. Final diff and commit status

- Branch: `main`
- Base commit: `4dc8d065b535c1d3d56eaf040832b130cf4a756c`
- Changed files: 28 (22 modified, 6 added including this report)
- `git diff --check`: clean
- Commit/push: **not performed**
- Working tree: changes intentionally remain uncommitted
