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

A full 360×800, 375×812, 390×844, and 412×915 interactive browser pass could not be completed in the connected browser. Later dynamic browser inspection and click calls timed out. No mobile pass result is claimed for login, moderation buttons, reports, themes, or logout.

The source contains responsive admin layout rules and 44px-or-larger touch controls, but this is not a substitute for production device verification.

## C. Public mobile QA

A complete production mobile viewport pass could not be completed because the connected browser timed out while waiting for dynamic public pages. No mobile visual pass is claimed.

## D. Send Confession hitbox result

The public homepage loaded and exposed the Send a confession route. A full browser click verification of the CTA could not be completed because the connected browser timed out during the click operation. Therefore the entire hitbox is **not marked verified** in this report.

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

The page HTML includes the Share control. Individual Copy Link, Native Share, WhatsApp, Facebook, and Telegram interactions were not completed because the connected browser timed out on dynamic page inspection. No claim of successful platform-share interaction is made.

## I. Branding result

A genuine production defect was found: the deployed homepage, confession feed, and send page still displayed standalone `GGV` branding even though the required public brand is **College Confession**.

The smallest targeted fix changed only those three public headers. Commit `0c5e672` was pushed and the Vercel web deployment became `READY` with aliases including `www.confessions.live`. Post-deployment HTML checks confirmed the homepage and feed now serve `COLLEGE CONFESSION`. The remaining `GGV` tokens observed on the send page are theme labels such as `GGV Gold`, not public brand names.

## J. Regressions

No regression was observed in the desktop admin dashboard load, authenticated session, dashboard data rendering, Published card navigation, public homepage rendering, public feed response, or published confession metadata. Full mobile and interactive share regression coverage remains outstanding because of browser timeouts.

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

The web build emitted existing non-blocking CSS autoprefixer and Edge-runtime warnings.

## M. Deployment required

Deployment was required because a genuine public branding defect was found. The targeted fix was pushed to GitHub and the connected Vercel web deployment for commit `0c5e672` reached `READY` and included the `www.confessions.live` alias.

## N. Commit SHA

`0c5e672` — `fix: align public headers with college confession branding`

> **QA conclusion:** Partial production QA completed with one genuine branding defect fixed and deployed. Mobile interaction, CTA hitbox, moderation transition, and platform-share interactions remain unverified rather than being reported as passed because the connected browser timed out.
