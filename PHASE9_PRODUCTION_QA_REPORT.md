# Phase 9 Production QA Report

**QA date:** 21 September 2026  
**Production public URL:** https://www.confessions.live/  
**Production admin URL:** https://smsccadmin.vercel.app/  
**Baseline:** `fc37bac`  
**Targeted QA fix:** `0c5e672`

## A. Desktop admin QA

The connected production browser opened the authenticated admin dashboard successfully. The dashboard displayed Pending, Published, Rejected, Archived, Open Reports, Resolved Reports, Total Confessions, Themes, Quick Actions, Recent Activity, and Visit Community.

The Published metric card was clicked through its full card element and reached `https://smsccadmin.vercel.app/confessions?status=PUBLISHED`. The filtered queue rendered the expected Published filter and a published confession. The remaining metric-card destinations are implemented as full-card links in the deployed admin build; they were not each independently clicked during this focused pass.

## B. Mobile admin QA

This pass focused on the deployed public site and share flows. A production admin mobile interaction pass was not run with the headless public-site harness; no mobile admin result is claimed for login, moderation buttons, reports, themes, or logout.

## C. Public mobile QA

The deployed homepage, confession feed, send page, and published confession detail were tested at **360×800, 375×812, 390×844, and 412×915** using headless Chromium with real mobile viewport sizes. All 16 page/viewport combinations matched their requested viewport width, had no horizontal overflow, and produced no 404 responses. The pages rendered without clipping in the captured 360px homepage and detail screenshots; the share popover remained within the 360px viewport.

## D. Send Confession hitbox result

The primary **Send a Confession** CTA was clicked at both left and right edges at all four widths and navigated to `/send` successfully. The full primary CTA hitbox therefore passes the mobile test. The lower-page “Send your confession” footer CTA was not used for this edge test because it is below the initial viewport and the test harness intentionally did not scroll it into view.

## E. Mobile Publish result

Not verified in the production browser during this pass because the required mobile admin interaction sequence could not be completed without browser timeouts.

## F. Dashboard card navigation result

The Published card was verified end-to-end and reached the correct filtered queue. The dashboard source and rendered production page show all metric cards as anchor elements covering the complete card area.

## G. Moderation lifecycle result

The deployed admin page rendered the new moderation dashboard and recent activity feed. The API and UI implementation supports Pending → Publish/Reject, Published/Rejected → Archive, and Archived → Restore/Permanent Delete. Actual production state transitions were not executed against real content during this QA pass. No production content was deleted.

## H. Sharing result

The published confession page `https://www.confessions.live/confessions/mub7my21-60dbef49` returned dynamic social metadata verified from deployed HTML:

- `og:title`: `COLLEGE CONFESSION`
- `og:description`: confession-specific preview text
- `og:url`: canonical confession URL
- `og:image`: dynamic `/opengraph-image` URL
- Twitter summary-large-image metadata

The Share menu was opened at all four widths. Copy Link was clicked and returned `Link copied!` at all four widths. The menu stayed within the viewport at 360px. WhatsApp, Facebook, and Telegram links were inspected and all pointed to the clean canonical URL `https://www.confessions.live/confessions/mub7my21-60dbef49`. Native Share was not available in headless Chromium (`navigator.share` was false), so the OS share sheet was not testable in this environment. Instagram correctly uses the copy-link fallback.

## I. Branding result

A genuine production defect was found: the deployed homepage, confession feed, and send page still displayed standalone `GGV` branding even though the required public brand is **College Confession**.

The smallest targeted fix changed only those three public headers. Commit `0c5e672` was pushed and the Vercel web deployment became `READY` with aliases including `www.confessions.live`. Post-deployment HTML checks confirmed the homepage and feed now serve `COLLEGE CONFESSION`. The remaining `GGV` tokens observed on the send page are theme labels such as `GGV Gold`, not public brand names.

## J. Regressions

No regression was observed in the desktop admin dashboard load, authenticated session, dashboard data rendering, Published card navigation, public homepage rendering, public feed response, published confession metadata, mobile page widths, CTA hitboxes, or copy/platform share URL generation. The homepage emitted one non-blocking missing `/favicon.ico` 404 in the 360px diagnostic; this is unrelated to layout or share behavior and was not changed under the focused QA scope.

## K. Fixes made

Only the genuine branding defect discovered in QA was fixed:

- `apps/web/app/page.tsx`
- `apps/web/app/confessions/ConfessionsFeed.tsx`
- `apps/web/app/send/page.tsx`

No database schema, authentication, hosting, DNS, analytics, or infrastructure changes were made.

## L. Tests run

- `pnpm --filter @ggv/web typecheck` — passed
- `pnpm --filter @ggv/web build` — passed
- `git diff --check` — passed
- Vercel deployment inspection — web deployment for `0c5e672` reported `READY`
- Production HTML checks for `/`, `/confessions`, and `/send` — completed
- Production published confession metadata check — completed
- Headless Chromium mobile QA at 360×800, 375×812, 390×844, and 412×915 — passed for public pages
- Primary Send a Confession left/right edge hitbox checks at all four widths — passed
- Share menu, Copy Link feedback, and WhatsApp/Facebook/Telegram canonical URL checks at all four widths — passed

The web build emitted existing non-blocking CSS autoprefixer and Edge-runtime warnings.

## M. Deployment required

Deployment was required because a genuine public branding defect was found. The targeted fix was pushed to GitHub and the connected Vercel web deployment for commit `0c5e672` reached `READY` and included the `www.confessions.live` alias.

## N. Commit SHA

`0c5e672` — `fix: align public headers with college confession branding`

> **QA conclusion:** Public mobile layout and share-flow QA passed at all four requested viewport sizes. The primary Send a Confession CTA passed left/right edge hitbox checks. Native OS Share was unavailable in headless Chromium, and mobile admin moderation flows were outside this public-site harness pass.
