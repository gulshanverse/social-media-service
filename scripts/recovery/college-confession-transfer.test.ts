import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertAuditEntity,
  assertExpectedAuditMetadata,
  assertNoMissingDependencies,
  assertSharedConfessionFingerprints,
  assertUniqueIds,
  assertBranchIdentity,
  runInTransaction,
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
