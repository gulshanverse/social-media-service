# Social Media Service

A production-minded foundation for community: public submissions, moderated publishing, themed message cards, reporting, and lightweight analytics.

## Phase 2 status

The public confession experience is implemented. Students can submit anonymous, categorized, themed confessions; submissions enter `PENDING` and remain private until a later moderation phase publishes them. The admin workflows, card studio, safety controls, and analytics remain intentionally deferred.

## Architecture

- `apps/web`: Next.js public web application (port 3000)
- `apps/admin`: Next.js admin application (port 3001)
- `apps/api`: NestJS API (port 4000)
- `packages/ui`: shared React UI primitives and visual tokens
- `packages/types`: shared domain types and enums
- `packages/config`: centralized application configuration
- `packages/themes`: data-driven confession card themes
- `prisma`: PostgreSQL schema and seed entry point

## Local setup

1. Install Node.js 22 and pnpm 9.
2. Copy `.env.example` to `.env` and update secrets.
3. Run `pnpm install`.
4. Start PostgreSQL with `docker compose up -d postgres`.
5. Generate Prisma client with `pnpm db:generate`.
6. Apply the schema with `pnpm db:push` and seed the eight shared themes with `pnpm db:seed`.
7. Run the apps with `pnpm dev`.

The public web app uses `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`) to reach the NestJS API.

## Public routes

| Route                     | Purpose                                |
| ------------------------- | -------------------------------------- |
| `/`                       | Landing page and community explanation |
| `/send`                   | Anonymous confession submission        |
| `/confessions`            | Published confession feed              |
| `/confessions/[publicId]` | Published confession detail            |

Only `PUBLISHED` records are returned by public API routes. Pending, rejected, archived, and otherwise unpublished content is never exposed.

## Commands

| Command             | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Start web, admin, and API in parallel          |
| `pnpm build`        | Build every workspace                          |
| `pnpm lint`         | Run workspace lint checks                      |
| `pnpm typecheck`    | Run TypeScript checks                          |
| `pnpm test`         | Run workspace test commands                    |
| `pnpm format:check` | Verify Prettier formatting                     |
| `pnpm db:push`      | Apply Prisma schema to the configured database |
| `pnpm db:seed`      | Seed development themes                        |

## Environment variables

See `.env.example`. Production deployments must provide a strong `AUTH_SECRET`, a managed PostgreSQL `DATABASE_URL`, public app/API URLs, and configured rate-limit/storage/analytics values.

## Deployment overview

The Next.js applications are Vercel-compatible. The NestJS API and PostgreSQL database are Railway-compatible. Docker Compose is provided for local PostgreSQL development.
