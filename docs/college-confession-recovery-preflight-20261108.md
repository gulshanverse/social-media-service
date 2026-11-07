# College Confession Recovery — Redacted Read-Only Preflight

**Date:** 2026-11-08

**Status:** Preflight and script validation only. No transfer SQL writes were executed.

This report contains aggregate counts and deterministic digests only. It does not contain confession content, `originalContent`, commenter details, credentials, connection strings, session data, or token hashes.

## Independently verified Neon identities

The connected database itself reported the following provider settings through read-only SQL (`current_setting('neon.branch_id', true)` and `current_setting('neon.project_id', true)`):

| Role                      | Expected branch          | Connected branch reported by database | Project                | Database |
| ------------------------- | ------------------------ | ------------------------------------- | ---------------------- | -------- |
| Source staging            | `br-shy-lab-aovf1xbg`    | `br-shy-lab-aovf1xbg`                 | `frosty-boat-76582250` | `neondb` |
| Immutable recovery anchor | `br-green-math-aoh5tklp` | `br-green-math-aoh5tklp`              | `frosty-boat-76582250` | `neondb` |
| Target production         | `br-tiny-bread-ao1quu8u` | `br-tiny-bread-ao1quu8u`              | `frosty-boat-76582250` | `neondb` |

The script now performs the same identity check itself. Environment variable names are not treated as proof of branch identity.

## Snapshot control-plane check

The Neon provider manual-snapshot inventory was checked read-only at preflight time. The preserved snapshot exists:

- Name: `pre-reaction-migration-20261022`
- Snapshot ID: `snap-broad-wind-aoyjocno`
- Source branch: production `br-tiny-bread-ao1quu8u`
- Provider flag: `manual: true`

## Exact confession reconciliation

The source staging branch contains 458 published confessions. The immutable recovery anchor contains 366 published confessions. The exact source-minus-anchor recovery cohort was independently reconciled as:

- Recovery cohort: **93** published confessions.
- Staging fork boundary: `2026-10-25 14:08:34 UTC`.
- All 93 cohort rows are after the staging fork boundary.
- Exact cohort ID-set digest (source SQL MD5): `318793c9a787a94541f2595fe801096e`.
- Exact ID-plus-content-fingerprint set digest (source SQL MD5): `5ad19af3fafa50fc4f1cf213306ff410`.
- The same 93 IDs were checked against the immutable anchor: **0 present**.
- The same 93 IDs were checked against current production: **0 present**.
- Shared source/anchor confession content fingerprints were checked; no mismatch was returned.

The SQL fingerprint is computed from `md5(content || '|' || originalContent)`. The transfer script computes a stronger SHA-256 fingerprint internally. Confession `content` and `originalContent` are necessarily transferred for the approved rows, but neither is logged or exposed.

## Dependency reconciliation

Read-only source checks returned:

- 26 comments excluded because their required commenter profiles are not present in target.
- 52 reactions total.
- 36 reactions with `profileId IS NULL`.
- 16 profile-linked reactions.
- 1 distinct linked profile exists in production, accounting for 11 eligible reactions.
- 5 reactions linked to missing profiles are excluded.
- Eligible reactions: **47**.
- No commenter profiles are copied.

## Audit reconciliation

The exact cohort was used to scope audit rows, and the repository’s actual entity casing was applied: `entity = 'CONFESSION'`.

Read-only result:

- Total audit rows: **256**
- `APPROVE`: 93
- `ARCHIVE`: 1
- `RESTORE`: 1
- `EDIT`: 105
- `PUBLISHED_CONFESSION_EDITED`: 56
- Invalid action-specific metadata rows: **0**
- Audit ID/action set digest: `f170584aa26f925c4a616db7ea91fa9e`

Metadata validation matches the repository code:

- `APPROVE`, `ARCHIVE`, and `RESTORE` require `metadata IS NULL`.
- `EDIT` and `PUBLISHED_CONFESSION_EDITED` require an object containing only a non-empty `changedFields` array of allowed confession fields.

## Preservation check

The production-only confession `cmw684l1r0001id01uhgpyj25` was present in both the recovery anchor and production. Its redacted full-record fingerprint matched across both read-only checks:

`dd0246efb4724b4de70724245c878625`

The transfer script captures the target fingerprint before a future transaction and compares it after the transaction; a mismatch aborts the transaction.

## Script and test evidence

The corrected transfer script is dry-run by default and now includes:

- actual connected Neon branch identity checks;
- source/anchor fingerprint reconciliation;
- exact target collision checks;
- uppercase `CONFESSION` audit filtering;
- action-specific audit metadata validation;
- theme, editor, audit-actor, reaction-profile, and comment dependency checks;
- preserved-record full-field fingerprint checks;
- explicit transaction postflight checks;
- write gates requiring exact target branch, snapshot, approval reference, snapshot-manual confirmation, and script checksum.

Tests cover wrong branch identity, wrong entity casing, unexpected fingerprints, missing dependencies, duplicate IDs, invalid audit metadata, and transaction error propagation for rollback.

Test result: **7 passed, 0 failed**.

- Script SHA-256: `349d37ec5229d0faf50b6681b0bf2762f800cbe837ff88a3553e705c891afe7e`
- Test SHA-256: `d209189e673f53df0d2d25e86aafdeaa2c73417350ce1b7f1f5eb573714526ac`

No production transfer was executed. Independent review is required before any production execution.
