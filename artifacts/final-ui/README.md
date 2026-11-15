# Final UI evidence

These screenshots were captured from the local optimized Next.js build using a localhost-only, GET-only proxy to the verified staging API. They are not Vercel Preview screenshots. No reactions, replies, writes, or database migrations were submitted.

- `mobile-360-local-staging.png`: full-page detail view at 360px; six toolbar controls in two rows, each 48px tall; composer is non-sticky initially.
- `desktop-1440-local-staging.png`: full-page detail view at 1440px.
- `mobile-reply-composer-local-staging.png`: reply shortcut opened the existing quick-reply composer on mobile; no submission occurred.

Responsive measurements passed at 360, 375, 390, 430, 768, and 1440px with no document-level horizontal overflow. Card source SHA-256 is unchanged from `main`.
