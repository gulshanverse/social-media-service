# College Confession Database Recovery Handover

**Status:** Documentation and handover only. No database writes have been executed.

**Last verified:** 2026-11-07

This document is the account-independent handover for the college confession recovery investigation. It is intentionally limited to operational metadata and recovery controls. It must not be expanded with confession text, commenter profile values, session data, token hashes, credentials, or database connection strings.

## Scope and objective

The recovery objective is to restore the 93 staging-only published confession records and their approved non-personal dependencies into production while preserving every existing production record, including the production-only latest confession.

The proposed recovery batch contains 443 rows:

- 93 `Confession`
- 26 `ConfessionComment`
- 52 `ConfessionReaction`
- 256 `AuditLog`
- 16 `CommenterProfile` dependencies

The 16 `CommenterProfile` rows contain personal information (`displayName` and `instagramUsername`). Their transfer is **not approved**. They must remain excluded unless a separate explicit approval is recorded and the transfer plan is reviewed again.

No `CommenterSession` rows, token hashes, or unrelated user records may be copied.

## Verified repository state

- Repository: `gulshanverse/social-media-service`
- GitHub URL: <https://github.com/gulshanverse/social-media-service>
- Default branch: `main`
- Main at verification: `1e08ad0f94b0876ac9117e6eebc0117edeb2fcb9`
- No existing college-confession recovery handover branch or dedicated recovery document was found.
- The existing manual snapshot `pre-reaction-migration-20261022` must not be deleted.

This document is a recovery handover, not an authorization to merge, deploy, change environment variables, or execute SQL.

## Verified Neon identity

Neon project:

- Name: `social-media-service`
- Project ID: `frosty-boat-76582250`
- Region: `aws-ap-southeast-1`
- Subscription observed at verification: free tier

Relevant branches, verified read-only:

| Role | Branch name | Branch ID | Parent / notes |
|---|---|---|---|
| Production | `production` | `br-tiny-bread-ao1quu8u` | Primary and default branch |
| Staging | `quick-play-staging-20261025` | `br-shy-lab-aovf1xbg` | Child of production |
| Recovery anchor | `confession-recovery-anchor-20261107` | `br-green-math-aoh5tklp` | Child of production; anchor timestamp `2026-11-07 10:16:38 UTC` |
| Existing manual snapshot branch | `pre-bawalbox-migration-20261025` | `br-round-term-aosi571r` | Separate existing branch; do not delete |

The recovery anchor was observed as ready and its parent was confirmed as production. Production, staging, and the recovery anchor were not modified during this verification.

## Investigation findings supplied for recovery

The completed investigation reported:

- Production: 516 confessions, of which 366 are published.
- Staging: 621 confessions, of which 458 are published.
- 515 shared confession records have matching content fingerprints.
- Staging-only published records: 93 confessions, 26 comments, and 52 reactions.
- The proposed dependency set includes 256 audit-log rows and 16 commenter profiles.
- The production-only latest confession `cmw684l1r0001id01uhgpyj25` must remain preserved.

These figures are recovery inputs from the prior investigation. Before any future copy operation, rerun the reconciliation queries against the immutable recovery anchor and record only aggregate counts, IDs needed for referential mapping, and fingerprints. Do not publish row content or profile values in GitHub.

## Non-negotiable safety rules

1. Do not change production `DATABASE_URL` or any hosted environment configuration.
2. Do not modify production, staging, or the recovery anchor.
3. Do not execute production SQL writes.
4. Do not copy the 16 personal-data profiles without separate explicit approval.
5. Do not delete branches, snapshots, or recovery artifacts.
6. Do not upgrade Neon or purchase a paid plan.
7. Do not copy sessions, token hashes, unrelated users, or unrelated rows.
8. Do not expose credentials, connection strings, confession content, profile information, or session data in GitHub, logs, PR comments, or task messages.
9. Never merge a recovery-related pull request automatically.
10. A step is complete only after its result is independently verified and recorded without sensitive data.

## Controlled recovery procedure

### Phase 0: Freeze and identity check

- Confirm the current production branch ID, staging branch ID, and recovery anchor branch ID against the Neon project record.
- Confirm the recovery anchor parent and timestamp.
- Confirm that the application deployment configuration still points to the intended production branch; inspect only, do not change it.
- Confirm that the manual snapshot `pre-reaction-migration-20261022` still exists.
- Stop if any identity, parent, timestamp, or snapshot check differs from this handover.

### Phase 1: Reconcile on an isolated disposable branch

Create a new disposable validation branch from the recovery anchor, not from production or staging. This branch is for read-only comparison and test planning only. Do not use it as an application database and do not expose a connection string in GitHub.

On the disposable branch, verify using aggregate or redacted results:

- the 515 shared confession fingerprints;
- the 93 staging-only published confession IDs and their dependency closure;
- comment and reaction foreign-key coverage;
- audit-log references and actor scope;
- the exclusion of all 16 commenter profiles unless separately approved;
- the preservation of the production-only latest confession;
- the absence of sessions, token hashes, and unrelated user rows in the proposed set.

Any mismatch blocks recovery. Do not repair the mismatch with ad hoc SQL.

### Phase 2: Prepare, do not execute, a migration plan

Prepare an idempotent, transactionally safe migration plan that:

- inserts only the approved staging-only published records and non-personal dependencies;
- uses stable IDs and explicit conflict handling;
- preserves all production rows and does not overwrite existing production values;
- excludes commenter profiles by default;
- excludes sessions, token hashes, and unrelated users;
- writes no secrets or content into logs;
- includes preflight counts, postflight counts, and rollback/abort conditions.

The plan must be reviewed on the disposable branch first. It must not target production until explicit recovery approval is given.

### Phase 3: Approval gate

Before any production write, obtain a separate explicit approval that names:

- the exact reviewed migration artifact or checksum;
- the exact target branch ID;
- the exact row categories and maximum counts;
- the exclusion of the 16 personal-data profiles;
- the backup/snapshot identifier to preserve;
- the validation and abort criteria.

A documentation PR, this handover, or a GitHub branch is not approval for production SQL.

### Phase 4: Production execution, only after approval

If and only if the approval gate is satisfied, execute the reviewed plan through the approved controlled migration path. Do not alter `DATABASE_URL`, Render, Vercel, branch topology, or snapshots. Use a transaction or provider-supported safe migration mechanism with an immediate abort on any preflight mismatch.

After execution, verify with aggregate results that:

- all 93 approved published confessions are present;
- all approved comment and reaction dependencies are present;
- the production-only latest confession remains present and unchanged;
- no excluded profiles, sessions, token hashes, or unrelated rows were copied;
- application read paths and moderation/audit invariants remain healthy.

Record only redacted evidence and aggregate counts in GitHub.

## Current checkpoint

As of the last verified investigation and this handover review:

- the recovery anchor exists and is verified;
- repository and Neon identities are verified read-only;
- no disposable test child branch was created by this handover;
- no reconciliation SQL writes were executed;
- no rows were copied;
- production, staging, and the recovery anchor remain unchanged;
- no documentation commit or push had previously been confirmed;
- the 16 personal-data profiles remain excluded and unapproved.

The next safe action is review of this documentation PR. The next database action, if ever approved, is an isolated read-only reconciliation—not a production write.

## Ownership-independent continuation checklist

A new operator should be able to continue using only:

1. this document;
2. the repository and PR history;
3. the Neon project and branch IDs above;
4. the approved recovery plan, once separately created and reviewed;
5. redacted validation evidence.

Never rely on an old Manus account, an undocumented browser session, a copied credential, or an untracked local file as the recovery source of truth.
