# Social Media Service

A production-minded foundation for community: public submissions, moderated publishing, themed message cards, reporting, and lightweight analytics.

## Phase 3 status

The platform now includes an internal admin authentication and moderation foundation. Administrators can sign in, work within role-based permissions, review and edit pending confessions, approve/reject/archive content, manage reports, view audit history, and manage themes. The public experience remains anonymous and exposes published content only.

## Architecture

- `apps/web`: Next.js public web application (port 3000)
- `apps/admin`: Next.js internal moderation application (port 3001)
- `apps/api`: NestJS API (port 4000), including isolated `/admin/*` APIs
- `packages/ui`: shared React UI primitives and visual tokens
- `packages/types`: shared domain types and enums
- `packages/config`: centralized application configuration
- `packages/themes`: data-driven confession card themes
- `prisma`: PostgreSQL schema, seed, admin identity, reports, and audit records

## Admin workflow

`PENDING` content can be edited, approved to `PUBLISHED`, rejected to `REJECTED`, or archived. Published and rejected content can be archived. Public endpoints return only `PUBLISHED` records. Admin roles are `SUPER_ADMIN`, `MODERATOR`, and `DESIGNER`; API guards enforce permissions independently of UI navigation.

For setup, copy `.env.example`, provide database and JWT secrets, optionally provide `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD`, then run `pnpm db:generate`, `pnpm db:push`, `pnpm db:seed`, and `pnpm dev`. See `docs/api.md`, `docs/moderation.md`, and `docs/deployment.md` for endpoint and security details.

## Commands

| Command             | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | Start web, admin, and API in parallel      |
| `pnpm build`        | Build every workspace                      |
| `pnpm lint`         | Run workspace lint checks                  |
| `pnpm typecheck`    | Run TypeScript checks                      |
| `pnpm test`         | Run workspace test commands                |
| `pnpm format:check` | Verify Prettier formatting                 |
| `pnpm db:generate`  | Generate Prisma client                     |
| `pnpm db:push`      | Apply Prisma schema                        |
| `pnpm db:seed`      | Seed themes and optional development admin |
