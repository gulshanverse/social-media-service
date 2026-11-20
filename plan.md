# Premium Confession Sharing Experience

## Investigation findings

- Existing sharing is isolated in `apps/web/components/ShareMenu.tsx`, rendered only from the detail-page engagement toolbar in `DiscussionSection.tsx`.
- The current menu supports a basic copy fallback, native share, WhatsApp, Facebook, Telegram, and Instagram copy-link fallback, but it is a small absolute popover with no mobile bottom sheet, no Snapchat option, no outside/Escape lifecycle, and no focus management.
- The detail carousel owns pointer/touch/wheel navigation in `ConfessionDetailClient.tsx`. It already treats links, buttons, and `[data-no-confession-swipe]` as interactive; the share panel will add that marker and stop propagation so platform gestures cannot navigate confessions.
- Clipboard and status feedback are currently local to `ShareMenu`; there is no shared toast primitive in the web app, so feedback will remain an accessible local live region rather than adding a dependency or duplicate global system.
- `page.tsx` currently emits generic non-indexable metadata for every public confession. The existing route has a dynamic Open Graph image, but metadata does not currently reference it or include confession-specific title/description.
- The six-child engagement-toolbar contract and existing card source must remain unchanged outside the share feature. No database/API changes are required because published confession URLs are already stable at `/confessions/:publicId`.

## Design

- **Design movement:** premium glassmorphism layered onto the existing dark, neon-lime College Confession system.
- **Core principles:** keep the confession visible, make sharing immediate, preserve touch ergonomics, and keep every action honest about platform limitations.
- **Color philosophy:** near-black surfaces keep attention on the confession; violet glass borders signal the transient sharing layer; neon lime marks the active trigger and successful copy state.
- **Layout paradigm:** desktop uses a connected floating panel anchored to the toolbar; mobile uses a fixed bottom sheet with a backdrop and horizontally scrollable action rail.
- **Signature elements:** violet edge glow, lime active share trigger, and consistent platform-colored icon tiles with short supporting labels.
- **Interaction philosophy:** explicit actions only; no automatic external navigation before a successful copy/handoff; Copy Link keeps the panel open while handoff actions close it after launch.
- **Animation:** short fade/scale on desktop and slide-up on mobile; drag-handle dismissal; all motion disabled or reduced under `prefers-reduced-motion`.
- **Typography:** inherit the existing DM Sans / Space Grotesk system; compact uppercase eyebrow labels and clear 15px action titles.
- **Brand essence:** an effortless, trustworthy way to pass anonymous campus conversations along; warm, polished, direct.
- **Brand voice:** concise and transparent. Example: “Send this confession to your friends” and “Link copied! Open Instagram and share it with your friends.”
- **Signature brand color:** existing lime `#c8ff00`.

## Implementation

1. Replace the basic `ShareMenu` popover with a self-contained responsive client component that manages open/close state, focus restore, Escape/outside dismissal, body-scroll locking on mobile, drag-handle dismissal, duplicate-action prevention, manual-copy fallback, and reduced-motion-safe transitions.
2. Use the exact public confession URL passed from `DiscussionSection` (`https://www.confessions.live/confessions/${publicId}`), never `window.location.href` with query parameters.
3. Implement Instagram and Snapchat as honest copy-first flows with explicit “Open Instagram/Snapchat” actions; WhatsApp and Facebook use their supported encoded share URLs; More uses `navigator.share` and falls back to Copy Link when unsupported or unavailable.
4. Add scoped styles at the end of `globals.css`, leaving the protected confession card, existing carousel, reactions, comments, and toolbar structure intact.
5. Add focused component tests for opening/closing, canonical URLs, platform destinations, copy failure fallback, native-share cancellation, and the Instagram/Snapchat copy-first behavior.
6. Update confession metadata to use the published confession content for title/description and reference the existing dynamic `opengraph-image` route, while retaining the public-only fetch and non-indexable policy.

## Project structure

- `apps/web/components/ShareMenu.tsx`: sharing state machine, action handlers, accessible responsive panel markup.
- `apps/web/components/ShareMenu.test.tsx`: focused sharing behavior tests.
- `apps/web/app/confessions/[publicId]/DiscussionSection.tsx`: passes the stable canonical confession URL into the existing share trigger.
- `apps/web/app/globals.css`: scoped share-panel, backdrop, bottom-sheet, icon-tile, and responsive rules only.
- `apps/web/app/confessions/[publicId]/page.tsx`: confession-specific canonical, Open Graph, and Twitter metadata.
- `apps/web/app/confessions/[publicId]/ConfessionDetailClient.tsx`: unchanged carousel implementation; only existing interaction guard is reused by share-panel markers.
- `apps/web/components/ConfessionCard.tsx` and `packages/ui/src/ConfessionCard.tsx`: protected; no changes.
