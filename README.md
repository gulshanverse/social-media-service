# Social Media Service

A production-minded foundation for community: public submissions, moderated publishing, themed message cards, reporting, and lightweight analytics.

## Phase 1 status

This repository currently contains the stable foundation only. The public experience, admin workflows, card studio, safety controls, and analytics are intentionally staged for later phases as specified in the product brief.

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
6. Run the apps with `pnpm dev`.

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
