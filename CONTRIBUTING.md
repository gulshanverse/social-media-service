# Contributing to College Confession

Thank you for contributing to the `social-media-service` monorepo. College Confession is implemented as a public Next.js application, an administrative Next.js workspace, and a NestJS API backed by PostgreSQL and Prisma. Contributions should preserve the contracts between those layers.

## Before you start

Read the relevant repository documentation before making a change:

- [Architecture](docs/architecture.md)
- [API contracts](docs/api.md)
- [Moderation rules](docs/moderation.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [Production runbook](docs/production-runbook.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

For security vulnerabilities, do not open a public issue with exploit details. Contact the repository maintainers privately through the project’s established security channel.

## Development setup

Use Node.js 22 and pnpm 9.15.4.

```bash
git clone https://github.com/gulshanverse/social-media-service.git
cd social-media-service
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

`pnpm db:push` is for local development. Use versioned migrations with `pnpm db:migrate:deploy` in staging and production workflows.

## Branches and commits

Create a focused branch from `main`:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feat/short-description
```

Keep commits small and describe the change directly. Use imperative, scoped messages where practical, such as:

```text
feat(api): add report pagination
fix(admin): preserve published edit status
docs: clarify deployment migration order
```

Do not commit `.env` files, credentials, generated secrets, local database files, build output, or unrelated formatting changes.

## Change boundaries

Keep changes within the layer that owns the behavior:

- Public UI changes belong in `apps/web`.
- Administrative UI changes belong in `apps/admin`.
- HTTP contracts, validation, authorization, and persistence behavior belong in `apps/api`.
- Shared types, themes, configuration, and UI primitives belong in the corresponding `packages/*` package.
- Database changes require a Prisma migration and an update to the relevant documentation.

API validation and authorization are authoritative. UI-only role hiding is not a substitute for backend guards. Public response projections must not expose administrative identity, audit records, reports, password hashes, session hashes, tokens, or internal secrets.

## Pull request requirements

A pull request should include:

1. A concise summary of the behavior or documentation change.
2. The affected application, package, endpoint, or database model.
3. Any migration or environment-variable impact.
4. Screenshots or a short recording for meaningful UI changes, when available.
5. Test coverage or a clear explanation of why tests are not applicable.
6. Manual verification steps for workflows that cannot be fully exercised in automated tests.

Avoid combining unrelated refactors with a feature or defect fix. Update `README.md` or `docs/` when an API contract, operational behavior, setup command, security boundary, or deployment assumption changes.

## Required checks

Run the checks that apply to the change. The CI workflow runs the full set:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm prisma validate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The API test suite requires a usable `DATABASE_URL` for Prisma validation and database-backed tests where applicable. Do not use destructive reset commands against shared environments.

## Database and API changes

Use additive, reviewable migrations. Consider compatibility between the previous application version, the migration, and the next application version. For API changes:

- Validate request bodies and query parameters with the existing DTO patterns.
- Preserve explicit response projections.
- Document status codes and response shapes in `README.md` and `docs/api.md`.
- Add or update tests for authorization, invalid input, lifecycle transitions, and error responses.
- Preserve request identifiers and normalized production error responses.

Published records may be edited in place through the protected administrative endpoint. Such edits retain the public identifier and status, preserve `originalContent`, retain report associations, and produce the published-edit audit action. Rejected and archived records remain non-editable.

## Review and merge

Maintainers review correctness, security boundaries, migration safety, API compatibility, tests, documentation, and operational impact. A pull request may be returned for changes when behavior is undocumented, checks fail, the scope is unclear, or the implementation weakens an existing authorization or data-projection boundary.

By opening a pull request, you agree that your contribution is provided under the repository’s currently applicable licensing terms and that you will follow the [Code of Conduct](CODE_OF_CONDUCT.md).
