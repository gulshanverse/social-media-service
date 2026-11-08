import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * College confession recovery transfer.
 *
 * Safe default: read-only preflight. A write requires --execute plus the
 * explicit approval gates documented below. SOURCE_DATABASE_URL and
 * TARGET_DATABASE_URL are only connection routes: the script independently
 * asks each connected database for its actual Neon branch ID and rejects a
 * wrong connection.
 *
 * Confession content and originalContent are necessarily transferred for the
 * approved confession rows. They are never printed, logged, or written to
 * GitHub. No profiles, comments, sessions, token hashes, or unrelated rows
 * are copied.
 */

export type Args = { execute: boolean };
export type BranchIdentity = { branchId: string; projectId: string; databaseName: string };

const PROJECT_ID = 'frosty-boat-76582250';
const SOURCE_BRANCH_ID = 'br-shy-lab-aovf1xbg';
const ANCHOR_BRANCH_ID = 'br-green-math-aoh5tklp';
const TARGET_BRANCH_ID = 'br-tiny-bread-ao1quu8u';
const PRESERVED_SNAPSHOT_ID = 'snap-broad-wind-aoyjocno';
const STAGING_FORK_AT = new Date('2026-10-25T14:08:34.000Z');
const PRESERVED_CONFESSION_ID = 'cmw684l1r0001id01uhgpyj25';
const EXPECTED_RECOVERY_ID_SET_DIGEST =
  'd7c6ade13762566a3401f99221550e583ed22cfac6b5a4e99f69c537bfe32b9c';
const EXPECTED_RECOVERY_CONTENT_FINGERPRINT_SET_DIGEST =
  'a92627606ca9e8c6c68d2c650b104b524f9169b316e3ba79e96be891475a7fec';
const EXPECTED = {
  confessions: 93,
  commentsExcluded: 26,
  reactionsTotal: 52,
  reactionsEligible: 47,
  reactionsNullProfile: 36,
  reactionsExistingProfile: 11,
  reactionsExcluded: 5,
  auditLogs: 256,
  auditActions: { APPROVE: 93, ARCHIVE: 1, RESTORE: 1, EDIT: 105, PUBLISHED_CONFESSION_EDITED: 56 },
};

const confessionSelect = {
  id: true,
  publicId: true,
  content: true,
  originalContent: true,
  category: true,
  customCategory: true,
  status: true,
  themeId: true,
  editorId: true,
  viewCount: true,
  shareCount: true,
  reportCount: true,
  commentsLocked: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
} satisfies Prisma.ConfessionSelect;

type ConfessionRow = Prisma.ConfessionGetPayload<{ select: typeof confessionSelect }>;
type AuditRow = Prisma.AuditLogGetPayload<{
  select: {
    id: true;
    actorId: true;
    action: true;
    entity: true;
    entityId: true;
    metadata: true;
    createdAt: true;
  };
}>;

const reactionSelect = {
  id: true,
  confessionId: true,
  profileId: true,
  actorHash: true,
  emoji: true,
  createdAt: true,
} satisfies Prisma.ConfessionReactionSelect;

type ReactionRow = Prisma.ConfessionReactionGetPayload<{ select: typeof reactionSelect }>;

type TxTarget = {
  $transaction<T>(work: (tx: any) => Promise<T>): Promise<T>;
};

export function parseArgs(argv = process.argv.slice(2)): Args {
  const execute = argv.includes('--execute');
  const unknown = argv.filter((arg) => arg !== '--execute');
  if (unknown.length > 0) throw new Error(`Unknown argument: ${unknown[0]}`);
  return { execute };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function confessionFingerprint(
  row: Pick<ConfessionRow, 'content' | 'originalContent'>,
): string {
  return createHash('sha256').update(`${row.content}|${row.originalContent}`).digest('hex');
}

export function fullRecordFingerprint(row: ConfessionRow): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        row.id,
        row.publicId,
        row.content,
        row.originalContent,
        row.category,
        row.customCategory,
        row.status,
        row.themeId,
        row.editorId,
        row.viewCount,
        row.shareCount,
        row.reportCount,
        row.commentsLocked,
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
        row.publishedAt?.toISOString() ?? null,
      ]),
    )
    .digest('hex');
}

export function setDigest(values: string[]): string {
  return createHash('sha256').update(values.slice().sort().join(',')).digest('hex');
}

export function reactionRecordFingerprint(row: ReactionRow): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        row.id,
        row.confessionId,
        row.profileId,
        row.actorHash,
        row.emoji,
        row.createdAt.toISOString(),
      ]),
    )
    .digest('hex');
}

export function auditMappingDigest(rows: Array<Pick<AuditRow, 'id' | 'action'>>): string {
  return setDigest(rows.map((row) => `${row.id}:${row.action}`));
}

export function assertExactAuditMappings(
  expected: Array<Pick<AuditRow, 'id' | 'action'>>,
  actual: Array<Pick<AuditRow, 'id' | 'action'>>,
): void {
  assertDigest(
    auditMappingDigest(actual),
    auditMappingDigest(expected),
    'audit ID-to-action mapping',
  );
}

export function assertDigest(actual: string, expected: string, label: string): void {
  if (actual !== expected)
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
}

export function assertPreservedFingerprintMatch(
  anchorFingerprint: string,
  targetFingerprint: string,
): void {
  if (anchorFingerprint !== targetFingerprint) {
    throw new Error(
      `Preserved confession fingerprint mismatch: anchor=${anchorFingerprint}, target=${targetFingerprint}`,
    );
  }
}

export function assertNoGlobalCollisions(
  candidateIds: string[],
  existingIds: string[],
  label: string,
): void {
  const existing = new Set(existingIds);
  const collisions = candidateIds.filter((id) => existing.has(id));
  if (collisions.length > 0)
    throw new Error(`${label} global primary-key collision: ${collisions.length}`);
}

export function assertUniqueIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`${label} contains duplicate IDs`);
}

export function assertExactIdSet(actualIds: string[], expectedIds: string[], label: string): void {
  assertUniqueIds(actualIds, `${label} actual IDs`);
  assertUniqueIds(expectedIds, `${label} expected IDs`);
  assertDigest(setDigest(actualIds), setDigest(expectedIds), `${label} ID set`);
}

export type NeonSnapshot = {
  id: string;
  name: string;
  source_branch_id: string;
  created_at: string;
  manual: boolean;
};

type NeonSnapshotResponse = {
  snapshots?: NeonSnapshot[];
};

type NeonFetchResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type NeonFetch = (
  input: string,
  init: { headers: Record<string, string> },
) => Promise<NeonFetchResponse>;

export async function verifySnapshotFromNeonControlPlane(
  apiKey: string,
  fetchImpl: NeonFetch = fetch,
): Promise<NeonSnapshot> {
  const response = await fetchImpl(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/snapshots`,
    { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } },
  );
  if (!response.ok)
    throw new Error(`Neon control-plane snapshot lookup failed with HTTP ${response.status}`);
  const body = (await response.json()) as NeonSnapshotResponse;
  const snapshot = body.snapshots?.find((candidate) => candidate.id === PRESERVED_SNAPSHOT_ID);
  if (!snapshot) throw new Error('Neon control plane did not return the preserved snapshot');
  if (!snapshot.manual || snapshot.source_branch_id !== TARGET_BRANCH_ID) {
    throw new Error(
      'Neon control-plane snapshot provenance does not match the preserved manual production snapshot',
    );
  }
  return snapshot;
}

export function assertAuditEntity(rows: Array<Pick<AuditRow, 'entity'>>): void {
  if (rows.some((row) => row.entity !== 'CONFESSION')) {
    throw new Error('Recovery audit rows must use entity CONFESSION');
  }
}

export function assertSharedConfessionFingerprints(
  sourceRows: Array<Pick<ConfessionRow, 'id' | 'content' | 'originalContent'>>,
  anchorById: Map<string, Pick<ConfessionRow, 'content' | 'originalContent'>>,
): void {
  for (const sourceRow of sourceRows) {
    const anchorRow = anchorById.get(sourceRow.id);
    if (anchorRow && confessionFingerprint(anchorRow) !== confessionFingerprint(sourceRow)) {
      throw new Error(`Unexpected shared confession fingerprint mismatch for ${sourceRow.id}`);
    }
  }
}

export function assertNoMissingDependencies(
  requiredIds: string[],
  existingIds: string[],
  label: string,
): void {
  const existing = new Set(existingIds);
  const missing = requiredIds.filter((id) => !existing.has(id));
  if (missing.length > 0) throw new Error(`${label}: ${missing.length} dependencies are missing`);
}

export function assertExpectedAuditMetadata(
  rows: Array<Pick<AuditRow, 'action' | 'metadata'>>,
): void {
  const allowedChangedFields = new Set(['content', 'category', 'customCategory', 'themeId']);
  for (const row of rows) {
    if (['APPROVE', 'ARCHIVE', 'RESTORE'].includes(row.action)) {
      if (row.metadata !== null) throw new Error(`${row.action} audit metadata must be null`);
      continue;
    }
    if (!['EDIT', 'PUBLISHED_CONFESSION_EDITED'].includes(row.action)) {
      throw new Error(`Unexpected recovery audit action: ${row.action}`);
    }
    const metadata = row.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new Error(`${row.action} audit metadata must be an object`);
    }
    const record = metadata as Record<string, unknown>;
    if (
      Object.keys(record).length !== 1 ||
      !Array.isArray(record.changedFields) ||
      record.changedFields.length === 0
    ) {
      throw new Error(
        `${row.action} audit metadata must contain only a non-empty changedFields array`,
      );
    }
    if (
      record.changedFields.some(
        (field) => typeof field !== 'string' || !allowedChangedFields.has(field),
      )
    ) {
      throw new Error(`${row.action} audit metadata contains an invalid changedFields entry`);
    }
  }
}

export function assertExecutionApproval(actualScriptSha256: string): void {
  if (process.env.RECOVERY_APPROVED !== 'true')
    throw new Error('Refusing writes: RECOVERY_APPROVED=true is required');
  if (requiredEnv('RECOVERY_TARGET_BRANCH_ID') !== TARGET_BRANCH_ID)
    throw new Error('Refusing writes: target branch gate mismatch');
  if (requiredEnv('RECOVERY_SNAPSHOT_ID') !== PRESERVED_SNAPSHOT_ID)
    throw new Error('Refusing writes: snapshot gate mismatch');
  requiredEnv('RECOVERY_APPROVAL_REFERENCE');
  if (requiredEnv('RECOVERY_SCRIPT_SHA256') !== actualScriptSha256)
    throw new Error(`Refusing writes: checksum mismatch; actual=${actualScriptSha256}`);
  requiredEnv('NEON_API_KEY');
}

export async function readBranchIdentity(client: PrismaClient): Promise<BranchIdentity> {
  const rows = await client.$queryRaw<BranchIdentity[]>(Prisma.sql`
    SELECT
      current_setting('neon.branch_id', true) AS "branchId",
      current_setting('neon.project_id', true) AS "projectId",
      current_database() AS "databaseName"
  `);
  const identity = rows[0];
  if (!identity?.branchId || !identity.projectId || !identity.databaseName) {
    throw new Error('Connected database did not disclose a complete Neon branch identity');
  }
  return identity;
}

export async function assertBranchIdentity(
  client: PrismaClient,
  expectedBranchId: string,
  label: string,
): Promise<BranchIdentity> {
  const actual = await readBranchIdentity(client);
  if (actual.projectId !== PROJECT_ID || actual.branchId !== expectedBranchId) {
    throw new Error(
      `${label} connection identity mismatch: expected ${PROJECT_ID}/${expectedBranchId}, got ${actual.projectId}/${actual.branchId}`,
    );
  }
  return actual;
}

export async function runInTransaction<T>(
  target: TxTarget,
  work: (tx: any) => Promise<T>,
): Promise<T> {
  return target.$transaction(work);
}

function scriptSha256(): string {
  return createHash('sha256')
    .update(readFileSync(resolve(__dirname, 'college-confession-transfer.ts')))
    .digest('hex');
}

function assertCount(actual: number, expected: number, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function actionCounts(rows: Array<{ action: string }>): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.action] = (counts[row.action] ?? 0) + 1;
    return counts;
  }, {});
}

async function main(): Promise<void> {
  const args = parseArgs();
  const source = new PrismaClient({
    datasources: { db: { url: requiredEnv('SOURCE_DATABASE_URL') } },
  });
  const anchor = new PrismaClient({
    datasources: { db: { url: requiredEnv('ANCHOR_DATABASE_URL') } },
  });
  const target = new PrismaClient({
    datasources: { db: { url: requiredEnv('TARGET_DATABASE_URL') } },
  });

  try {
    const [sourceIdentity, anchorIdentity, targetIdentity] = await Promise.all([
      assertBranchIdentity(source, SOURCE_BRANCH_ID, 'source'),
      assertBranchIdentity(anchor, ANCHOR_BRANCH_ID, 'anchor'),
      assertBranchIdentity(target, TARGET_BRANCH_ID, 'target'),
    ]);
    if (args.execute) assertExecutionApproval(scriptSha256());

    const [sourcePublished, anchorPublished] = await Promise.all([
      source.confession.findMany({
        where: { status: 'PUBLISHED' },
        select: confessionSelect,
        orderBy: { id: 'asc' },
      }),
      anchor.confession.findMany({
        where: { status: 'PUBLISHED' },
        select: confessionSelect,
        orderBy: { id: 'asc' },
      }),
    ]);
    assertUniqueIds(
      sourcePublished.map((row) => row.id),
      'source confessions',
    );
    assertUniqueIds(
      anchorPublished.map((row) => row.id),
      'anchor confessions',
    );

    const anchorById = new Map(anchorPublished.map((row) => [row.id, row]));
    assertSharedConfessionFingerprints(sourcePublished, anchorById);
    const recoveryConfessions = sourcePublished.filter((row) => !anchorById.has(row.id));
    assertCount(
      recoveryConfessions.length,
      EXPECTED.confessions,
      'exact staging-only published confessions',
    );
    if (recoveryConfessions.some((row) => row.createdAt <= STAGING_FORK_AT)) {
      throw new Error('Recovery cohort contains a row at or before the staging fork boundary');
    }
    const recoveryIds = recoveryConfessions.map((row) => row.id);
    assertUniqueIds(recoveryIds, 'recovery confession IDs');
    assertDigest(
      setDigest(recoveryIds),
      EXPECTED_RECOVERY_ID_SET_DIGEST,
      'recovery confession ID set',
    );
    assertDigest(
      setDigest(recoveryConfessions.map((row) => `${row.id}:${confessionFingerprint(row)}`)),
      EXPECTED_RECOVERY_CONTENT_FINGERPRINT_SET_DIGEST,
      'recovery confession content-fingerprint set',
    );
    const approvedConfessionRecordDigest = setDigest(
      recoveryConfessions.map((row) => `${row.id}:${fullRecordFingerprint(row)}`),
    );

    const targetExisting = await target.confession.findMany({
      where: {
        OR: [
          { id: { in: recoveryIds } },
          { publicId: { in: recoveryConfessions.map((row) => row.publicId) } },
        ],
      },
      select: { id: true, publicId: true },
    });
    if (targetExisting.length > 0)
      throw new Error('Target already contains a recovery confession ID or publicId');

    const preservedBefore = await target.confession.findUnique({
      where: { id: PRESERVED_CONFESSION_ID },
      select: confessionSelect,
    });
    const preservedAnchor = await anchor.confession.findUnique({
      where: { id: PRESERVED_CONFESSION_ID },
      select: confessionSelect,
    });
    if (!preservedBefore)
      throw new Error('Preserved production-only confession is absent from target');
    if (!preservedAnchor)
      throw new Error('Preserved production-only confession is absent from recovery anchor');
    const preservedFingerprint = fullRecordFingerprint(preservedBefore);
    assertPreservedFingerprintMatch(fullRecordFingerprint(preservedAnchor), preservedFingerprint);

    const sourceComments = await source.confessionComment.findMany({
      where: { confessionId: { in: recoveryIds } },
      select: { id: true, profileId: true, parentId: true },
    });
    assertCount(sourceComments.length, EXPECTED.commentsExcluded, 'excluded comments');
    const commentProfiles = await target.commenterProfile.findMany({
      where: { id: { in: sourceComments.map((row) => row.profileId) } },
      select: { id: true },
    });
    if (commentProfiles.length > 0)
      throw new Error('A required comment profile exists in target; re-review the exclusion set');

    const sourceReactions = await source.confessionReaction.findMany({
      where: { confessionId: { in: recoveryIds } },
      select: reactionSelect,
      orderBy: { id: 'asc' },
    });
    assertCount(sourceReactions.length, EXPECTED.reactionsTotal, 'source recovery reactions');
    assertUniqueIds(
      sourceReactions.map((row) => row.id),
      'source reactions',
    );
    const linkedProfileIds = [
      ...new Set(sourceReactions.flatMap((row) => (row.profileId ? [row.profileId] : []))),
    ];
    const existingProfiles = await target.commenterProfile.findMany({
      where: { id: { in: linkedProfileIds } },
      select: { id: true },
    });
    const existingProfileIds = new Set(existingProfiles.map((row) => row.id));
    const eligibleReactions = sourceReactions.filter(
      (row) => row.profileId === null || existingProfileIds.has(row.profileId),
    );
    const excludedReactions = sourceReactions.filter(
      (row) => row.profileId !== null && !existingProfileIds.has(row.profileId),
    );
    assertCount(eligibleReactions.length, EXPECTED.reactionsEligible, 'eligible reactions');
    assertCount(
      eligibleReactions.filter((row) => row.profileId === null).length,
      EXPECTED.reactionsNullProfile,
      'null-profile reactions',
    );
    assertCount(
      eligibleReactions.filter((row) => row.profileId !== null).length,
      EXPECTED.reactionsExistingProfile,
      'reactions linked to existing profiles',
    );
    assertCount(excludedReactions.length, EXPECTED.reactionsExcluded, 'excluded reactions');
    const eligibleReactionIds = eligibleReactions.map((row) => row.id);
    assertUniqueIds(eligibleReactionIds, 'eligible reaction IDs');
    const eligibleReactionRecordDigest = setDigest(
      eligibleReactions.map((row) => `${row.id}:${reactionRecordFingerprint(row)}`),
    );

    const sourceAuditLogs = await source.auditLog.findMany({
      where: {
        entity: 'CONFESSION',
        entityId: { in: recoveryIds },
        action: { in: Object.keys(EXPECTED.auditActions) },
      },
      select: {
        id: true,
        actorId: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });
    assertCount(sourceAuditLogs.length, EXPECTED.auditLogs, 'recovery audit logs');
    assertAuditEntity(sourceAuditLogs);
    const counts = actionCounts(sourceAuditLogs);
    for (const [action, expected] of Object.entries(EXPECTED.auditActions))
      assertCount(counts[action] ?? 0, expected, `audit action ${action}`);
    assertExpectedAuditMetadata(sourceAuditLogs);
    const auditIds = sourceAuditLogs.map((row) => row.id);
    assertUniqueIds(auditIds, 'audit IDs');
    const approvedAuditMappingDigest = auditMappingDigest(sourceAuditLogs);

    const targetThemes = await target.theme.findMany({
      where: {
        id: { in: recoveryConfessions.flatMap((row) => (row.themeId ? [row.themeId] : [])) },
      },
      select: { id: true },
    });
    const targetThemeIds = new Set(targetThemes.map((row) => row.id));
    assertNoMissingDependencies(
      recoveryConfessions.flatMap((row) => (row.themeId ? [row.themeId] : [])),
      [...targetThemeIds],
      'target themes',
    );
    const actorIds = [
      ...new Set([
        ...recoveryConfessions.flatMap((row) => (row.editorId ? [row.editorId] : [])),
        ...sourceAuditLogs.flatMap((row) => (row.actorId ? [row.actorId] : [])),
      ]),
    ];
    const targetAdmins = await target.adminUser.findMany({
      where: { id: { in: actorIds } },
      select: { id: true },
    });
    const targetAdminIds = new Set(targetAdmins.map((row) => row.id));
    assertNoMissingDependencies(actorIds, [...targetAdminIds], 'target editors and audit actors');

    const targetReactionKeys = await target.confessionReaction.findMany({
      where: { id: { in: eligibleReactionIds } },
      select: reactionSelect,
    });
    assertNoGlobalCollisions(
      eligibleReactionIds,
      targetReactionKeys.map((row) => row.id),
      'reaction',
    );
    const targetUniqueKeys = new Set(
      targetReactionKeys.map(
        (row) => `${row.confessionId}\u001f${row.actorHash}\u001f${row.emoji}`,
      ),
    );
    for (const row of eligibleReactions) {
      if (targetUniqueKeys.has(`${row.confessionId}\u001f${row.actorHash}\u001f${row.emoji}`))
        throw new Error('A recovery reaction uniqueness key already exists in target');
    }
    const targetAuditIds = await target.auditLog.findMany({ select: { id: true } });
    assertNoGlobalCollisions(
      auditIds,
      targetAuditIds.map((row) => row.id),
      'audit-log',
    );

    console.log(
      JSON.stringify({
        mode: args.execute ? 'execute-after-approval' : 'read-only-preflight',
        identities: {
          source: sourceIdentity.branchId,
          anchor: anchorIdentity.branchId,
          target: targetIdentity.branchId,
        },
        counts: {
          confessions: recoveryConfessions.length,
          commentsExcluded: sourceComments.length,
          reactionsEligible: eligibleReactions.length,
          reactionsExcluded: excludedReactions.length,
          auditLogs: sourceAuditLogs.length,
        },
        recoveryIdSetDigest: setDigest(recoveryIds),
        recoveryContentFingerprintSetDigest: setDigest(
          recoveryConfessions.map((row) => `${row.id}:${confessionFingerprint(row)}`),
        ),
        auditActionCounts: counts,
        preservedConfessionFullRecordFingerprint: preservedFingerprint,
        profilesCopied: 0,
        commentsCopied: 0,
        sessionsCopied: 0,
      }),
    );

    if (!args.execute) return;
    await verifySnapshotFromNeonControlPlane(requiredEnv('NEON_API_KEY'));
    const confessionData = recoveryConfessions.map((row) => ({ ...row }));
    const reactionData = eligibleReactions.map((row) => ({ ...row }));
    const auditData = sourceAuditLogs.map((row) => ({ ...row }));
    await runInTransaction(target, async (tx) => {
      await tx.confession.createMany({ data: confessionData });
      await tx.confessionReaction.createMany({ data: reactionData });
      await tx.auditLog.createMany({ data: auditData });
      const postflightConfessions = await tx.confession.findMany({
        where: { id: { in: recoveryIds } },
        select: confessionSelect,
      });
      assertExactIdSet(
        postflightConfessions.map((row: ConfessionRow) => row.id),
        recoveryIds,
        'postflight confession',
      );
      assertCount(
        postflightConfessions.filter((row: ConfessionRow) => row.status === 'PUBLISHED').length,
        EXPECTED.confessions,
        'postflight published confessions',
      );
      assertDigest(
        setDigest(
          postflightConfessions.map(
            (row: ConfessionRow) => `${row.id}:${confessionFingerprint(row)}`,
          ),
        ),
        EXPECTED_RECOVERY_CONTENT_FINGERPRINT_SET_DIGEST,
        'postflight confession content-fingerprint set',
      );
      assertDigest(
        setDigest(
          postflightConfessions.map(
            (row: ConfessionRow) => `${row.id}:${fullRecordFingerprint(row)}`,
          ),
        ),
        approvedConfessionRecordDigest,
        'postflight full confession record set',
      );
      const postflightReactions = await tx.confessionReaction.findMany({
        where: { id: { in: eligibleReactionIds } },
        select: reactionSelect,
      });
      assertExactIdSet(
        postflightReactions.map((row: ReactionRow) => row.id),
        eligibleReactionIds,
        'postflight reaction',
      );
      assertDigest(
        setDigest(
          postflightReactions.map(
            (row: ReactionRow) => `${row.id}:${reactionRecordFingerprint(row)}`,
          ),
        ),
        eligibleReactionRecordDigest,
        'postflight full reaction record set',
      );
      const postflightAudit = await tx.auditLog.findMany({
        where: { id: { in: auditIds } },
        select: { id: true, action: true },
      });
      assertExactIdSet(
        postflightAudit.map((row: { id: string }) => row.id),
        auditIds,
        'postflight audit',
      );
      assertDigest(
        auditMappingDigest(postflightAudit),
        approvedAuditMappingDigest,
        'postflight audit ID-to-action mapping',
      );
      assertExactAuditMappings(sourceAuditLogs, postflightAudit);
      const postflightActionCounts = actionCounts(postflightAudit);
      for (const [action, expected] of Object.entries(EXPECTED.auditActions)) {
        assertCount(
          postflightActionCounts[action] ?? 0,
          expected,
          `postflight audit action ${action}`,
        );
      }
      const preservedAfter = await tx.confession.findUnique({
        where: { id: PRESERVED_CONFESSION_ID },
        select: confessionSelect,
      });
      if (!preservedAfter || fullRecordFingerprint(preservedAfter) !== preservedFingerprint)
        throw new Error('Preserved production-only confession changed during transaction');
    });
  } finally {
    await Promise.all([source.$disconnect(), anchor.$disconnect(), target.$disconnect()]);
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Recovery transfer failed');
    process.exitCode = 1;
  });
}
