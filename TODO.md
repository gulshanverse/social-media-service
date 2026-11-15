# College Confession Engagement Redesign

- [ ] Preserve the existing confession card exactly, including dimensions, layout, typography, green gradient, padding, metadata, category/date presentation, and theme-engine integration.
- [ ] Add accurate views, total reactions, and reply statistics using the existing confession and discussion data paths; preserve save/bookmark and sharing/report destinations.
- [ ] Implement horizontal emoji reaction tiles using existing reaction types, actual counts, selected state, optimistic updates, server reconciliation, rollback on API failure, duplicate-click protection, and reduced-motion behavior.
- [ ] Implement touch-friendly Reply, Share, and Report action surfaces without changing existing moderation or abuse-prevention flows.
- [ ] Implement clean anonymous comment cards, popular/latest sorting, nested reply collapse/expand, comment reaction and reply actions, and loading, empty, error, and pending-moderation states.
- [ ] Implement a sticky mobile quick-reply input and a keyboard-aware expanded composer with anonymous identity, moderation guidance, character counter, validation, and existing supported behavior only.
- [ ] Add only the smallest additive persistence/API change needed for real comment reactions; do not change production data or apply migrations to production.
- [ ] Add and run focused frontend/API tests plus typecheck, format, lint, build, and diff checks; fix all failures caused by this work.
- [ ] Review the complete diff, commit to `feat/college-confession-engagement-redesign`, push the branch, and create a PR against `main` without merging.
- [ ] Verify the Vercel Preview uses the staging API configuration, capture mobile and desktop screenshots, and record any backend-preview or authentication blocker without claiming success.
