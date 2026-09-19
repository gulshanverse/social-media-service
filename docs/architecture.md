# Architecture

The platform is a pnpm monorepo with clear boundaries between public web, admin web, API, and shared packages. The public and admin Next.js applications are independently deployable. The NestJS API owns validation, authorization, moderation state transitions, and persistence through Prisma.

Phase 2 adds a public confession module to the NestJS API. The module owns DTO validation, normalization, pending creation, published-only pagination/detail queries, view increments, and a process-local anonymous submission limiter. Public confession responses are explicit safe projections rather than Prisma models, so original content, internal IDs, moderation data, and reporter data cannot leak through public routes.

The web app consumes the public API through a small browser client. Landing, submission, feed, and detail routes share the existing theme definitions from `packages/themes`; the API verifies the selected theme against both the shared library and the database relation. The eight-theme seed is generated from the same shared source to prevent drift.

Admin authentication, moderation state transitions, publishing, reporting, and card generation remain outside the Phase 2 boundary.
