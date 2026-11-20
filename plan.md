# College Confession Minimal X Refinement

## Approved direction

Refine the existing College Confession detail experience using the user's supplied mobile screenshot as the surrounding-UI reference. Keep the existing confession card strictly locked: do not alter its dimensions, gradient, typography, content, padding, metadata, date, category, or theme integration. Do not substitute mocks for existing API-backed replies and reactions.

## Design

- **Design movement:** Minimal X-inspired campus conversation UI.
- **Core principles:** compact controls, clear conversation hierarchy, quiet separators, and accessible touch targets.
- **Color philosophy:** retain the existing dark canvas and use the existing lime accent for active/selected states.
- **Layout paradigm:** one horizontal six-item engagement toolbar, a light reaction strip, divider-based replies, and a compact composer that respects safe-area insets.
- **Signature elements:** icon-and-count engagement row, emoji counts beneath reactions, and an understated Popular/Latest discussion header.
- **Interaction philosophy:** preserve current server-backed actions, optimistic feedback/rollback, anonymous identity/registration, reporting/moderation, and threaded-reply behavior.
- **Animation:** retain existing reaction animation and reduced-motion support; add no decorative motion.
- **Typography:** inherit current application typography and preserve the confession-card typography exactly.
- **Brand essence:** a low-friction anonymous campus conversation surface; calm, inclusive, and direct.
- **Brand voice:** retain existing reply and moderation guidance.
- **Signature brand color:** existing lime `#c8ff00`.

## Implementation

Make a focused frontend-only change to the existing detail experience. Use the current `DiscussionSection` state and API functions; do not create mock data, a second reaction system, a database migration, or production configuration changes. Keep new visual rules scoped to `.detail-page` and below the protected card. Preserve current reaction options, the custom-reaction control, selected state, animation, save persistence, share destinations, report routes, comment sorting, nested-reply collapse/expand, guest registration, validation, and moderation messages.

## Project structure

- `apps/web/app/confessions/[publicId]/DiscussionSection.tsx` owns the engagement toolbar, reactions, reply sorting/thread controls, and compact reply composer.
- `apps/web/app/confessions/[publicId]/DiscussionSection.test.tsx` protects toolbar semantics and existing interaction behavior.
- `apps/web/app/globals.css` contains scoped detail-page styling; confession-card selectors and source remain unchanged.
- `apps/web/components/ConfessionCard.tsx` and `packages/ui/src/ConfessionCard.tsx` are protected from modification.

# Premium Confession Sharing Experience (2026-11-20)

## Investigation findings

- Existing sharing is isolated in `apps/web/components/ShareMenu.tsx`, rendered from the detail-page engagement toolbar. The existing dynamic preview routes and canonical metadata are preserved.
- The social preview campus illustrations used empty CSS-bordered elements. These were replaced with explicit SVG `rect` geometry so Satori renders the illustration reliably without empty-square artifacts.
- The sharing dialog already handled lifecycle and focus restoration but did not constrain keyboard navigation. A document-level Tab and Shift+Tab trap now cycles through the dialog's currently focusable controls.
- The original `TODO.md` and `plan.md` history from `origin/main` is retained verbatim; this section is appended as the feature record.

## Implementation record

1. Preserved the existing responsive ShareMenu, platform destinations, canonical URL handling, manual-copy fallback, native-share behavior, gesture guards, and reduced-motion styles.
2. Added a Satori-compatible SVG campus illustration to both the individual and general Open Graph image routes without changing the confession card design.
3. Added focused tests covering forward Tab wrapping, reverse Shift+Tab wrapping, and the existing sharing flows.
4. Regenerated and inspected both preview screenshots and ran the requested focused/full test, lint, typecheck, formatting, and production-build checks.

## Project structure

- `apps/web/components/ShareMenu.tsx`: existing sharing state machine plus keyboard focus trap.
- `apps/web/app/ShareMenu.test.tsx`: sharing behavior and focus-trap regression tests.
- `apps/web/app/confessions/[publicId]/opengraph-image.tsx`: individual confession preview with SVG campus geometry.
- `apps/web/app/confessions/opengraph-image.tsx`: general confession preview with SVG campus geometry.
- `TODO.md` and `plan.md`: original project history followed by this appended feature record.
