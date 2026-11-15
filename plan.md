# College Confession Engagement Redesign

## Approved direction

Implement the supplied “College Confession 2.0 — Clean Social + Animated Reaction Interactions” reference around the existing confession detail view. The confession card itself is a protected surface: its dimensions, typography, green gradient, padding, metadata, category/date presentation, and theme-engine integration remain unchanged. All new work belongs to the engagement and discussion surfaces below it.

## Design

- **Design movement:** polished mobile-first social conversation UI with restrained neon utility accents.
- **Core principles:** readable hierarchy, tactile controls, quiet dark surfaces, and motion that confirms intent without distracting from the confession.
- **Color philosophy:** retain the dark campus-night canvas and use neon lime as the owned interaction color; borders and surfaces stay blue-black so reactions and actions feel earned rather than over-glowed.
- **Layout paradigm:** one narrow conversation rail on desktop that becomes a full-width vertical thread on mobile, with the quick reply docked to the viewport only at small widths.
- **Signature elements:** compact engagement-stat rail, horizontal emoji reaction tiles with a floating emoji response, and anonymous avatar/comment cards with a visible reply spine.
- **Interaction philosophy:** every tap gives immediate local feedback, then reconciles with the server; errors restore the prior state and explain what happened.
- **Animation:** 160–240ms scale/pop and restrained floating emoji; all motion is disabled or minimized under `prefers-reduced-motion`.
- **Typography:** preserve the project’s DM Sans body and Space Grotesk display pairing; use compact uppercase eyebrow labels and generous line-height for user content.
- **Brand essence:** a safer, warmer campus conversation layer for anonymous thoughts; calm, tactile, inclusive.
- **Brand voice:** “Keep it kind, specific, and safe.” and “Your reply will be reviewed before it appears publicly.”
- **Signature brand color:** `#c8ff00` neon lime.

## Implementation

- Extend the public confession projection with `viewCount` so the detail UI can show actual views.
- Add an additive `ConfessionCommentReaction` table and API route using the same actor/session hashing and emoji normalization rules as confession reactions.
- Extend the existing discussion payload with per-comment reaction counts and selected reactions; do not create a duplicate reaction system.
- Rewrite only the discussion client presentation: optimistic confession/comment reactions, selected state, animation, action bar, latest/popular sorting, nested reply collapse/expand, loading/empty/error/pending states, and quick/full reply composers.
- Keep existing registration, moderation, reporting, session cookie, and attachment behavior unchanged; no unsupported attachment controls are added.

## Project structure

- `apps/web/app/confessions/[publicId]/ConfessionDetailClient.tsx` owns the detail shell and passes the protected confession card into the engagement section.
- `apps/web/app/confessions/[publicId]/DiscussionSection.tsx` owns engagement state, composers, reaction interactions, comment sorting, and threaded comment rendering.
- `apps/web/app/globals.css` owns the reference-aligned engagement surfaces without changing confession-card rules.
- `apps/api/src/confessions/*` owns public counts, comment reaction routes, and response shaping.
- `prisma/schema.prisma` and the additive migration own comment-reaction persistence.
- Focused web/API tests cover optimistic updates, rollback, sorting, nested reply visibility, composer submission, and comment reaction toggling.
