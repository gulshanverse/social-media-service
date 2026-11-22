# Dependency security audit

Date: 2026-11-22

## Verified counts

The baseline `pnpm audit --json` run on the remediation branch reported **43 advisory records** across 683 dependency entries: **0 critical, 18 high, 20 moderate, and 5 low**. GitHub Dependabot separately reported **65 alerts** on the repository default branch: **1 critical, 23 high, 35 moderate, and 6 low**. These are different signals and are not directly additive.

This branch is based on `origin/main`, not PR #71. No database migration, production environment, secret, merge, deployment, or production data change was performed.

## Focused compatible remediation

The branch already contains the compatible Next.js, Vitest, jsdom, Vite, and related updates from the original security work. This follow-up adds scoped root `pnpm.overrides` entries for patched same-major or patch-level transitive versions:

- `body-parser@1.20.4` → `1.20.9`
- `effect@3.21.0` → `3.22.1`
- `multer` → `2.5.0`
- `postcss@8.4.31` → `8.5.33`
- `qs` → `6.16.1`

The lockfile was regenerated with pnpm **9.15.4**, the version declared by the repository. The override behavior was verified with `corepack pnpm install --frozen-lockfile`.

## Post-remediation result

The pnpm 9.15.4 audit reports **23 advisory records** across 675 dependencies: **0 critical, 7 high, 13 moderate, and 3 low**. This resolves the audited body-parser, effect, multer, PostCSS, and qs chains that can be safely addressed without changing their major compatibility contract, along with related transitive findings.

The remaining high-severity records are concentrated in these intentionally unchanged chains:

- `undici@5.29.0` through `@vercel/blob@0.27.3`; patched versions require the undici 6 line.
- `@fastify/busboy@2.1.1` through the same Blob/undici chain; patched versions require the busboy 3 line.
- `deepmerge-ts@7.1.5` through Prisma 6 tooling; the patched version requires deepmerge-ts 8.

Other remaining moderate/low findings include major-line decisions involving `file-type@20`, `minimatch@10`, NestJS 10, and the undici 5 chain. Major upgrades were not attempted blindly. They require separate compatibility work and application-level testing, especially for `@vercel/blob`, NestJS, and Prisma.

## Validation

Using pnpm 9.15.4, the branch passed dependency installation, Prisma generation and schema validation with a placeholder local `DATABASE_URL`, formatting, lint, typecheck, the full test suite, production builds for API/admin/web, and `git diff --check`. Existing lint/build warnings remain non-blocking and are recorded in `/home/ubuntu/audit-data/pr72-pnpm9-validation.log`.

The audit is package-manager evidence, not proof that every GitHub Dependabot alert has disappeared. The saved JSON result is `/home/ubuntu/audit-data/pr72-pnpm9-audit.json`.

## Migration status

No migration was applied. PR #71's additive comment soft-delete migration still requires validation against an explicitly identified disposable or staging database before any production migration workflow is considered.

## References

- Saved baseline audit JSON: `/home/ubuntu/audit-data/pnpm-audit-pr72.json`
- Saved pnpm 9.15.4 post-remediation audit JSON: `/home/ubuntu/audit-data/pr72-pnpm9-audit.json`
- GitHub security alerts: https://github.com/gulshanverse/social-media-service/security/dependabot
