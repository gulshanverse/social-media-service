import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  auditMappingDigest,
  assertAuditEntity,
  assertDigest,
  assertExactAuditMappings,
  assertExpectedAuditMetadata,
  assertExactIdSet,
  assertNoGlobalCollisions,
  assertNoMissingDependencies,
  assertPreservedFingerprintMatch,
  assertSharedConfessionFingerprints,
  assertUniqueIds,
  assertBranchIdentity,
  reactionRecordFingerprint,
  runInTransaction,
  verifySnapshotAttestation,
} from './college-confession-transfer';

const confession = (id: string, content: string, originalContent = content) => ({
  id,
  content,
  originalContent,
});

test('rejects a connection whose actual Neon branch identity is wrong', async () => {
  const fakeClient = {
    $queryRaw: async () => [
      { branchId: 'br-wrong', projectId: 'frosty-boat-76582250', databaseName: 'neondb' },
    ],
  };
  await assert.rejects(
    () => assertBranchIdentity(fakeClient as never, 'br-shy-lab-aovf1xbg', 'source'),
    /identity mismatch/,
  );
});

test('rejects wrong audit entity casing', () => {
  assert.throws(() => assertAuditEntity([{ entity: 'Confession' }]), /entity CONFESSION/);
  assert.doesNotThrow(() => assertAuditEntity([{ entity: 'CONFESSION' }]));
});

test('rejects unexpected shared confession fingerprints', () => {
  assert.throws(
    () =>
      assertSharedConfessionFingerprints(
        [confession('c1', 'new')],
        new Map([['c1', confession('c1', 'old')]]),
      ),
    /fingerprint mismatch/,
  );
});

test('rejects missing dependencies', () => {
  assert.throws(
    () => assertNoMissingDependencies(['theme-a', 'theme-b'], ['theme-a'], 'themes'),
    /1 dependencies/,
  );
  assert.doesNotThrow(() => assertNoMissingDependencies(['theme-a'], ['theme-a'], 'themes'));
});

test('rejects duplicate IDs', () => {
  assert.throws(() => assertUniqueIds(['c1', 'c1'], 'confessions'), /duplicate IDs/);
});

test('rejects a pinned SHA-256 digest mismatch', () => {
  assert.throws(() => assertDigest('actual', 'expected', 'recovery cohort'), /mismatch/);
});

test('rejects an anchor-versus-production preservation mismatch', () => {
  assert.throws(
    () => assertPreservedFingerprintMatch('anchor-fp', 'target-fp'),
    /fingerprint mismatch/,
  );
});

test('rejects forged or tampered snapshot provenance', () => {
  const signingKey = 'test-control-plane-key';
  const payload = {
    projectId: 'frosty-boat-76582250',
    snapshotId: 'snap-broad-wind-aoyjocno',
    sourceBranchId: 'br-tiny-bread-ao1quu8u',
    manual: true,
    verifiedAt: new Date(1_700_000_000_000).toISOString(),
  };
  const signature = createHmac('sha256', signingKey)
    .update(
      JSON.stringify([
        payload.projectId,
        payload.snapshotId,
        payload.sourceBranchId,
        payload.manual,
        payload.verifiedAt,
      ]),
    )
    .digest('hex');
  const attestation = { provider: 'neon-control-plane-signed', payload, signature };
  assert.doesNotThrow(() =>
    verifySnapshotAttestation(attestation, signingKey, 1_700_000_000_000 + 60_000),
  );
  assert.throws(
    () =>
      verifySnapshotAttestation(
        { ...attestation, signature: '00' },
        signingKey,
        1_700_000_000_000 + 60_000,
      ),
    /forged/,
  );
  assert.throws(
    () =>
      verifySnapshotAttestation(
        { ...attestation, payload: { ...payload, snapshotId: 'wrong' } },
        signingKey,
        1_700_000_000_000 + 60_000,
      ),
    /forged/,
  );
  assert.throws(
    () =>
      verifySnapshotAttestation(
        { provider: 'neon-control-plane', payload, signature: '' },
        signingKey,
        1_700_000_000_000 + 60_000,
      ),
    /trusted/,
  );
  const stalePayload = {
    ...payload,
    verifiedAt: new Date(1_700_000_000_000 - 16 * 60_000).toISOString(),
  };
  const staleSignature = createHmac('sha256', signingKey)
    .update(
      JSON.stringify([
        stalePayload.projectId,
        stalePayload.snapshotId,
        stalePayload.sourceBranchId,
        stalePayload.manual,
        stalePayload.verifiedAt,
      ]),
    )
    .digest('hex');
  assert.throws(
    () =>
      verifySnapshotAttestation(
        { ...attestation, payload: stalePayload, signature: staleSignature },
        signingKey,
        1_700_000_000_000,
      ),
    /missing, invalid, or stale/,
  );
});

test('rejects global reaction and audit primary-key collisions', () => {
  assert.throws(
    () => assertNoGlobalCollisions(['r1', 'r2'], ['r2'], 'reaction'),
    /global primary-key collision/,
  );
  assert.throws(
    () => assertNoGlobalCollisions(['a1'], ['a1'], 'audit-log'),
    /global primary-key collision/,
  );
});

test('rejects an exact postflight ID or fingerprint mismatch', () => {
  assert.throws(() => assertExactIdSet(['c1'], ['c2'], 'postflight confession'), /ID set mismatch/);
  assert.throws(
    () => assertDigest('postflight-bad', 'expected-content-set', 'postflight content fingerprint'),
    /mismatch/,
  );
});

test('compares exact reaction record contents and audit ID-to-action mappings', () => {
  const reaction = {
    id: 'r1',
    confessionId: 'c1',
    profileId: null,
    actorHash: 'actor',
    emoji: 'heart',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const changedReaction = { ...reaction, emoji: 'laugh' };
  assert.notEqual(reactionRecordFingerprint(reaction), reactionRecordFingerprint(changedReaction));
  const expectedAudit = [
    { id: 'a1', action: 'APPROVE' },
    { id: 'a2', action: 'EDIT' },
  ];
  assert.equal(
    auditMappingDigest(expectedAudit),
    auditMappingDigest(expectedAudit.slice().reverse()),
  );
  assert.throws(
    () =>
      assertExactAuditMappings(expectedAudit, [
        { id: 'a1', action: 'EDIT' },
        { id: 'a2', action: 'APPROVE' },
      ]),
    /mismatch/,
  );
});

test('validates action-specific audit metadata', () => {
  assert.doesNotThrow(() =>
    assertExpectedAuditMetadata([
      { action: 'APPROVE', metadata: null },
      { action: 'ARCHIVE', metadata: null },
      { action: 'RESTORE', metadata: null },
      { action: 'EDIT', metadata: { changedFields: ['content'] } },
      { action: 'PUBLISHED_CONFESSION_EDITED', metadata: { changedFields: ['themeId'] } },
    ]),
  );
  assert.throws(
    () =>
      assertExpectedAuditMetadata([
        { action: 'EDIT', metadata: { changedFields: ['displayName'] } },
      ]),
    /invalid changedFields/,
  );
  assert.throws(
    () => assertExpectedAuditMetadata([{ action: 'APPROVE', metadata: { source: 'bulk' } }]),
    /must be null/,
  );
});

test('propagates transaction errors so the database transaction can roll back', async () => {
  let callbackStarted = false;
  let callbackFailed = false;
  const fakeTarget = {
    async $transaction<T>(work: (tx: unknown) => Promise<T>): Promise<T> {
      callbackStarted = true;
      try {
        return await work({});
      } catch (error) {
        callbackFailed = true;
        throw error;
      }
    },
  };
  await assert.rejects(
    () =>
      runInTransaction(fakeTarget, async () => {
        throw new Error('postflight failure');
      }),
    /postflight failure/,
  );
  assert.equal(callbackStarted, true);
  assert.equal(callbackFailed, true);
});
