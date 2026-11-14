
## Audit fixes completed

The renderer stylesheet now lives in `packages/ui/src/HomepagePromotionBanner.css` and is imported by both applications. Public carousel controls and admin preview framing remain application-specific; the renderer’s theme tokens, artwork crop, shade, typography, spacing, responsive sizing, and reduced-motion behavior are shared exactly once.

Built-in theme input validation uses an explicit supported-ID set covering legacy promotion presets, the standard theme registry, Garba themes, and portable presets. Runtime resolution still has a separate safe fallback path and does not make unknown input appear valid.

Database theme lifecycle behavior is explicit: `ACTIVE` and `PUBLISHED` themes are eligible when their date window is open; `SCHEDULED` themes are eligible only during their configured window; `DRAFT`, future, expired, missing, and other unpublished themes cannot publish a promotion. Admin gallery cards show lifecycle state, draft/unavailable selections can be saved as drafts, and publication is blocked with a clear message. If an already-published promotion loses its theme, public rendering falls back to the legacy safe background projection without exposing private theme metadata.

Positioning uses separate text-alignment and flex-alignment mappings plus explicit nine-way translation values (`0`, `-50%`, `-100%`). Automatic mode retains sensible width defaults while preserving the selected position controls, and shared responsive rules keep long content inside the banner on narrow screens.

The audit extended API coverage for theme IDs, lifecycle windows, invalid layouts, malformed payloads, fallback behavior, and safe public projection. Remaining limitation: browser screenshot verification requires a running authenticated app/database environment and was not claimed without direct inspection.
