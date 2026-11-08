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

The Neon provider manual-snapshot inventory was checked read-only at preflight time through the Neon control-plane tool. The preserved snapshot exists:

- Name: `pre-reaction-migration-20261022`
- Snapshot ID: `snap-broad-wind-aoyjocno`
- Source branch: production `br-tiny-bread-ao1quu8u`
- Provider flag: `manual: true`

The transfer script no longer accepts a local JSON manifest or an HMAC supplied by the caller. Immediately before a future write transaction, it makes an authenticated `GET https://console.neon.tech/api/v2/projects/frosty-boat-76582250/snapshots` request to the official Neon Management API using `NEON_API_KEY`. Neon authenticates that bearer credential and returns the provider-owned snapshot inventory; the script then requires the exact snapshot ID, `manual: true`, and production source branch. A manually created or tampered local object cannot satisfy this gate. The API credential must be held by the controlled execution environment as a secret and is never logged or committed.

## Exact confession reconciliation

The source staging branch contains 458 published confessions. The immutable recovery anchor contains 366 published confessions. The exact source-minus-anchor recovery cohort was independently reconciled as:

- Recovery cohort: **93** published confessions.
- Staging fork boundary: `2026-10-25 14:08:34 UTC`.
- All 93 cohort rows are after the staging fork boundary.
- Exact cohort ID-set digest (SHA-256): `d7c6ade13762566a3401f99221550e583ed22cfac6b5a4e99f69c537bfe32b9c`.
- Exact ID-plus-content-fingerprint set digest (SHA-256): `a92627606ca9e8c6c68d2c650b104b524f9169b316e3ba79e96be891475a7fec`.
- The same 93 IDs were checked against the immutable anchor: **0 present**.
- The same 93 IDs were checked against current production: **0 present**.
- Shared source/anchor confession content fingerprints were checked; no mismatch was returned.

The pinned ID digest is SHA-256 over the comma-joined ascending ID list. The pinned content digest is SHA-256 over the comma-joined ascending `id:sha256(content || '|' || originalContent)` values. The script uses a separate SHA-256 full-record fingerprint for preservation and postflight checks. Confession `content` and `originalContent` are necessarily transferred for the approved rows, but neither is logged or exposed.

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

The transfer script captures the target fingerprint before a future transaction, compares it against the anchor before proceeding, and compares it after the transaction; a mismatch aborts the transaction. It also compares exact approved confession full-record fingerprints, exact reaction record contents, and exact audit ID-to-action mappings inside the transaction.

## Script and test evidence

The corrected transfer script is dry-run by default and now includes:

- actual connected Neon branch identity checks;
- source/anchor SHA-256 fingerprint reconciliation with pinned expected digests;
- exact target collision checks;
- uppercase `CONFESSION` audit filtering;
- action-specific audit metadata validation;
- theme, editor, audit-actor, reaction-profile, and comment dependency checks;
- preserved-record full-field fingerprint checks;
- explicit transaction postflight checks for full confession records, full reaction records, and audit ID-to-action mappings;
- write gates requiring exact target branch, snapshot, approval reference, script checksum, and a fresh direct Neon Management API lookup immediately before the transaction. A local JSON file, HMAC, or caller-supplied `verifiedAt` value cannot satisfy the gate.

Tests cover wrong branch identity, wrong entity casing, SHA-256 digest mismatch, unexpected fingerprints, missing dependencies, duplicate IDs, wrong or tampered provider snapshot responses, HTTP authentication failure, global ID collisions, exact reaction-content and audit-mapping mismatches, invalid audit metadata, and transaction error propagation for rollback.

Test result: **13 passed, 0 failed**.

- Script SHA-256: `7b97ce7ed37bc3d5bd7768d6f7625fb924e780242b1e63ba9e803053e4808243`
- Test SHA-256: `870abcb644507e3a6257eb60b45869356e3444a1399a76670b267145d10e8613`

No production transfer was executed. Independent review is required before any production execution.
