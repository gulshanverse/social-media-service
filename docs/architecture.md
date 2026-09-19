# Architecture

The platform is a pnpm monorepo with clear boundaries between public web, admin web, API, and shared packages. The public and admin Next.js applications are independently deployable. The NestJS API owns validation, authorization, moderation state transitions, and persistence through Prisma.

Phase 1 establishes the boundaries and shared contracts without implementing product workflows prematurely. Public confession data will be projected from moderation-safe fields; sensitive abuse-prevention metadata will remain server-side and outside public response shapes.
