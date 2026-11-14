# Homepage Promotions Theme Studio

## Implementation approach

Add theme-aware homepage promotions without replacing existing promotion workflows. `HomepagePromotion` will gain nullable `themeId` and nullable `layoutSettings` JSON fields. `backgroundPreset` remains the legacy compatibility source when no usable theme is selected. Theme resolution will prefer an eligible database theme by stable id, then a built-in theme registry preset by id/legacy preset, and finally a safe Midnight/Aurora fallback. Public responses will contain only normalized renderer-safe visual properties; admin theme browsing will reuse the existing authenticated `/admin/themes` endpoint and add built-in registry entries without exposing private metadata publicly.

Use a versioned, constrained `PromotionLayoutSettings` shape for automatic/manual layout, heading/body typography, alignment, position, width, padding, and spacing. Validate it server-side with explicit enums and numeric bounds; never accept arbitrary CSS. The renderer will convert the validated settings and normalized theme into CSS variables. A shared `HomepagePromotionBanner` in `packages/ui` will own banner markup and layout calculations; the admin editor will render it in desktop/mobile preview modes, and the public carousel will retain its carousel controls/autoplay/swipe behavior while using the shared banner presentation.

Add an additive Prisma migration only. Do not reset or push the database. Do not change upload validation, scheduling/publication, RBAC, carousel controls, or unrelated homepage sections.

## Project structure

- `packages/ui/src/HomepagePromotionBanner.tsx`: shared banner presentation, safe style variable generation, and renderer types.
- `packages/ui/src/index.tsx`: exports the shared presentation.
- `packages/types/src/index.ts`: public promotion/theme/layout contracts.
- `apps/api/src/homepage-promotions.dto.ts`: API boundary validation for theme and layout fields.
- `apps/api/src/homepage-promotions.service.ts`: stable theme resolution, safe projection, legacy fallback, and persistence.
- `apps/api/src/homepage-promotions.module.ts`: minimal public safe theme endpoint if required.
- `apps/admin/app/HomepagePromotions.tsx` and CSS: dynamic theme gallery, layout controls, and shared preview.
- `apps/web/components/HomepagePromotionCarousel.tsx` and `apps/web/app/globals.css`: public shared renderer integration and responsive styling.
- `prisma/schema.prisma` and additive migration: nullable relation/JSON persistence.

## Design

Three candidate styles: editorial campaign desk (0.07), neon control room (0.05), and premium festival poster studio (0.08). Choose **premium festival poster studio**.

- **Design movement:** modern festival-poster composition with restrained glass panels and vivid theme swatches.
- **Core principles:** hierarchy before decoration; theme preview before technical values; compact controls with advanced settings tucked away; safe defaults that look intentional.
- **Color philosophy:** retain the existing dark admin canvas, use selected theme colors as meaningful accents, and reserve high-contrast lime/pink for focus and action states.
- **Layout paradigm:** a split workspace with a sticky-ish preview rail and grouped editor sections rather than one large form grid.
- **Signature elements:** visual theme swatches, a compact viewport toggle, and a banner preview with layered artwork/shade/copy.
- **Interaction philosophy:** every visual control updates the preview immediately; failed theme loading falls back visibly and non-destructively.
- **Animation:** preserve existing carousel motion; use only subtle preview transitions and respect reduced motion.
- **Typography system:** inherit the selected theme by default, constrain choices to existing supported font families, and use theme-aware heading/body tokens with bounded scale controls.
- **Brand essence:** a fast campaign studio for the community team; vivid, safe, practical.
- **Brand voice:** direct and operational. Example lines: “Shape the moment.” and “Preview it before it goes live.”

## Validation

Run targeted admin/web/API tests and typechecks first, then repository format check and build. Use browser screenshots only if a running app/database is available and visual evidence is needed; do not claim visual verification without inspected screenshots.
