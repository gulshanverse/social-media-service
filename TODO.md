# TODO

## Dynamic theme-aware promotion data and safe resolution
- [x] Existing promotions without a selected theme continue rendering through Aurora/Sunset/Ocean/Midnight compatibility.
- [x] A promotion can persist a nullable stable theme identifier and resolve the eligible database-backed theme at render time.
- [x] Built-in theme registry entries and available database themes are represented dynamically without hardcoded duplication in the promotion editor or public renderer.
- [x] Missing, deleted, unpublished, invalid, or unsafe themes resolve to a stable safe fallback and never blank the banner.
- [x] Public theme/promotion responses expose only renderer-safe normalized visual properties.

## Banner layout and shared rendering
- [x] Desktop, tablet, and mobile banners use responsive content-aware sizing without arbitrary fixed heights or excessive empty space.
- [x] Long titles/descriptions wrap safely, content does not clip, and CTA remains visible on narrow screens.
- [x] Admin preview and public homepage use the same banner presentation and theme/layout calculations.
- [x] Existing carousel navigation, autoplay, pause, swipe, artwork precedence, and no-active-promotions behavior remain intact.

## Studio controls and persistence
- [x] Admin editor provides campaign content, visual theme gallery, artwork, layout/typography, live preview, and publication sections.
- [x] Typography, alignment, positioning, width, padding, spacing, and automatic/manual layout settings are constrained, validated, and persist across save/edit/refresh/reopen.
- [x] Theme loading, empty registry, and failed request states are handled gracefully.
- [x] Existing upload behavior and background-only campaigns remain intact.

## Regression coverage and delivery
- [x] Admin, public component, and API tests cover dynamic themes, legacy backgrounds, artwork variants, fallback cases, layout validation, and preserved workflows.
- [x] Targeted typechecks/tests, format check, and build pass without weakening existing checks.
- [x] Diff contains only the scoped feature changes; feature branch is ready for a PR against `main` and is not merged or deployed.
