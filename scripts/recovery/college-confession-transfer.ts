import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * College confession recovery transfer.
 *
 * Safe default: read-only preflight. A write requires all of:
 *   --execute
 *   RECOVERY_APPROVED=true
 *   RECOVERY_TARGET_BRANCH_ID=br-tiny-bread-ao1quu8u
 *   RECOVERY_SNAPSHOT_ID=snap-broad-wind-aoyjocno
 *   RECOVERY_APPROVAL_REFERENCE=<external approval reference>
 *   RECOVERY_SCRIPT_SHA256=<sha256 of this file>
 *
 * The source and target URLs are supplied at runtime and are never logged:
 *   SOURCE_DATABASE_URL=<staging or approved recovery-anchor URL>
 *   TARGET_DATABASE_URL=<production URL>
 *
 * This script never copies CommenterProfile, CommenterSession, or comments.
 * It never prints confession content, profile values, tokens, or connection URLs.
 */

type Args = { execute: boolean };

const EXPECTED_TARGET_BRANCH_ID = 'br-tiny-bread-ao1quu8u';
const EXPECTED_SNAPSHOT_ID = 'snap-broad-wind-aoyjocno';
const EXPECTED_CONFESSIONS = 93;
const EXPECTED_ELIGIBLE_REACTIONS = 47;
const EXPECTED_NULL_PROFILE_REACTIONS = 36;
const EXPECTED_EXISTING_PROFILE_REACTIONS = 11;
const EXPECTED_EXCLUDED_REACTIONS = 5;
const EXPECTED_AUDIT_LOGS = 256;
const PRESERVED_CONFESSION_ID = 'cmw684l1r0001id01uhgpyj25';
const EXPECTED_AUDIT_ACTIONS = {
  APPROVE: 93,
  ARCHIVE: 1,
  RESTORE: 1,
  EDIT: 105,
  PUBLISHED_CONFESSION_EDITED: 56,
} as const;

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

type SourceConfession = Prisma.ConfessionGetPayload<{ select: typeof confessionSelect }>;
type SourceReaction = Prisma.ConfessionReactionGetPayload<{
  select: {
    id: true;
    confessionId: true;
    profileId: true;
    actorHash: true;
    emoji: true;
    createdAt: true;
  };
}>;
type SourceAuditLog = Prisma.AuditLogGetPayload<{
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

function parseArgs(): Args {
  const execute = process.argv.slice(2).includes('--execute');
  const unknown = process.argv.slice(2).filter((arg) => arg !== '--execute');
  if (unknown.length > 0) throw new Error(`Unknown argument: ${unknown[0]}`);
  return { execute };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function scriptSha256(): string {
  const path = resolve(__dirname, 'college-confession-transfer.ts');
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function assertExecutionApproval(): void {
  if (process.env.RECOVERY_APPROVED !== 'true') {
    throw new Error('Refusing writes: RECOVERY_APPROVED=true is required');
  }
  if (requiredEnv('RECOVERY_TARGET_BRANCH_ID') !== EXPECTED_TARGET_BRANCH_ID) {
    throw new Error('Refusing writes: target branch ID does not match production');
  }
  if (requiredEnv('RECOVERY_SNAPSHOT_ID') !== EXPECTED_SNAPSHOT_ID) {
    throw new Error(
      'Refusing writes: preserved snapshot ID does not match the verified manual snapshot',
    );
  }
  requiredEnv('RECOVERY_APPROVAL_REFERENCE');
  const approvedHash = requiredEnv('RECOVERY_SCRIPT_SHA256');
  const actualHash = scriptSha256();
  if (approvedHash !== actualHash) {
    throw new Error(`Refusing writes: script checksum mismatch; actual checksum is ${actualHash}`);
  }
}

function assertCount(actual: number, expected: number, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function summarizeActions(rows: Array<{ action: string }>): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.action] = (counts[row.action] ?? 0) + 1;
    return counts;
  }, {});
}

function assertExpectedAuditActions(rows: SourceAuditLog[]): void {
  const actual = summarizeActions(rows);
  for (const [action, expected] of Object.entries(EXPECTED_AUDIT_ACTIONS)) {
    assertCount(actual[action] ?? 0, expected, `AuditLog action ${action}`);
  }
  if (Object.keys(actual).some((action) => !(action in EXPECTED_AUDIT_ACTIONS))) {
    throw new Error('AuditLog set contains an unexpected action');
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  const sourceUrl = requiredEnv('SOURCE_DATABASE_URL');
  const targetUrl = requiredEnv('TARGET_DATABASE_URL');
  if (args.execute) assertExecutionApproval();

  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  try {
    const sourceConfessions = await source.confession.findMany({
      where: { status: 'PUBLISHED' },
      select: confessionSelect,
      orderBy: { id: 'asc' },
    });
    const sourceIds = sourceConfessions.map((row) => row.id);
    const sourcePublicIds = sourceConfessions.map((row) => row.publicId);
    const targetConfessions = await target.confession.findMany({
      where: { OR: [{ id: { in: sourceIds } }, { publicId: { in: sourcePublicIds } }] },
      select: { id: true, publicId: true },
    });
    const targetConfessionIds = new Set(targetConfessions.map((row) => row.id));
    const targetPublicIds = new Set(targetConfessions.map((row) => row.publicId));
    const recoveryConfessions = sourceConfessions.filter(
      (row) => !targetConfessionIds.has(row.id) && !targetPublicIds.has(row.publicId),
    );
    assertCount(
      recoveryConfessions.length,
      EXPECTED_CONFESSIONS,
      'staging-only published confessions',
    );

    if (recoveryConfessions.some((row) => row.id === PRESERVED_CONFESSION_ID)) {
      throw new Error(
        'Preservation failure: production-only latest confession appears in recovery set',
      );
    }
    const preserved = await target.confession.findUnique({
      where: { id: PRESERVED_CONFESSION_ID },
      select: { id: true },
    });
    if (!preserved)
      throw new Error(
        'Preservation failure: production-only latest confession is absent from target',
      );

    const recoveryIds = recoveryConfessions.map((row) => row.id);
    const recoveryIdSet = new Set(recoveryIds);
    const sourceReactions = await source.confessionReaction.findMany({
      where: { confessionId: { in: recoveryIds } },
      select: {
        id: true,
        confessionId: true,
        profileId: true,
        actorHash: true,
        emoji: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });
    const profileIds = sourceReactions.flatMap((row) => (row.profileId ? [row.profileId] : []));
    const targetProfiles = await target.commenterProfile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true },
    });
    const targetProfileIds = new Set(targetProfiles.map((row) => row.id));
    const eligibleReactions = sourceReactions.filter(
      (row) => row.profileId === null || targetProfileIds.has(row.profileId),
    );
    const excludedReactions = sourceReactions.filter(
      (row) => row.profileId !== null && !targetProfileIds.has(row.profileId),
    );
    assertCount(eligibleReactions.length, EXPECTED_ELIGIBLE_REACTIONS, 'eligible reactions');
    assertCount(
      eligibleReactions.filter((row) => row.profileId === null).length,
      EXPECTED_NULL_PROFILE_REACTIONS,
      'null-profile reactions',
    );
    assertCount(
      eligibleReactions.filter((row) => row.profileId !== null).length,
      EXPECTED_EXISTING_PROFILE_REACTIONS,
      'reactions linked to existing profiles',
    );
    assertCount(excludedReactions.length, EXPECTED_EXCLUDED_REACTIONS, 'excluded reactions');

    const sourceAuditLogs = await source.auditLog.findMany({
      where: { entity: 'Confession', entityId: { in: recoveryIds } },
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
    assertCount(sourceAuditLogs.length, EXPECTED_AUDIT_LOGS, 'recovery audit logs');
    assertExpectedAuditActions(sourceAuditLogs);

    const targetThemes = await target.theme.findMany({
      where: {
        id: { in: recoveryConfessions.flatMap((row) => (row.themeId ? [row.themeId] : [])) },
      },
      select: { id: true },
    });
    const targetThemeIds = new Set(targetThemes.map((row) => row.id));
    const missingThemeIds = recoveryConfessions
      .filter((row) => row.themeId && !targetThemeIds.has(row.themeId))
      .map((row) => row.themeId as string);
    if (missingThemeIds.length > 0)
      throw new Error(`Missing target themes: ${missingThemeIds.length}`);

    const editorIds = recoveryConfessions.flatMap((row) => (row.editorId ? [row.editorId] : []));
    const auditActorIds = sourceAuditLogs.flatMap((row) => (row.actorId ? [row.actorId] : []));
    const targetAdmins = await target.adminUser.findMany({
      where: { id: { in: [...new Set([...editorIds, ...auditActorIds])] } },
      select: { id: true },
    });
    const targetAdminIds = new Set(targetAdmins.map((row) => row.id));
    if (editorIds.some((id) => !targetAdminIds.has(id)))
      throw new Error('A confession editor is missing from target');
    if (auditActorIds.some((id) => !targetAdminIds.has(id)))
      throw new Error('An audit actor is missing from target');

    const targetReactionKeys = await target.confessionReaction.findMany({
      where: { confessionId: { in: recoveryIds } },
      select: { id: true, confessionId: true, actorHash: true, emoji: true },
    });
    const targetReactionIds = new Set(targetReactionKeys.map((row) => row.id));
    const targetReactionUniqueKeys = new Set(
      targetReactionKeys.map(
        (row) => `${row.confessionId}\u0000${row.actorHash}\u0000${row.emoji}`,
      ),
    );
    for (const row of eligibleReactions) {
      if (targetReactionIds.has(row.id))
        throw new Error('A recovery reaction ID already exists in target');
      const key = `${row.confessionId}\u0000${row.actorHash}\u0000${row.emoji}`;
      if (targetReactionUniqueKeys.has(key))
        throw new Error('A recovery reaction uniqueness key already exists in target');
    }

    console.log(
      JSON.stringify({
        mode: args.execute ? 'execute-after-approval' : 'read-only-preflight',
        counts: {
          confessions: recoveryConfessions.length,
          eligibleReactions: eligibleReactions.length,
          excludedReactions: excludedReactions.length,
          auditLogs: sourceAuditLogs.length,
        },
        auditActions: summarizeActions(sourceAuditLogs),
        preservedProductionConfessionPresent: true,
        profilesCopied: 0,
        commentsCopied: 0,
        sessionsCopied: 0,
      }),
    );

    if (!args.execute) return;

    const confessionData = recoveryConfessions.map(({ id, publicId, ...row }) => ({
      id,
      publicId,
      ...row,
    }));
    const reactionData = eligibleReactions.map((row) => ({ ...row }));
    const auditData = sourceAuditLogs.map((row) => ({ ...row }));

    await target.$transaction(async (tx) => {
      await tx.confession.createMany({ data: confessionData });
      await tx.confessionReaction.createMany({ data: reactionData });
      await tx.auditLog.createMany({ data: auditData });

      const postflightConfessions = await tx.confession.count({
        where: { id: { in: recoveryIds }, status: 'PUBLISHED' },
      });
      const postflightReactions = await tx.confessionReaction.count({
        where: { id: { in: eligibleReactions.map((row) => row.id) } },
      });
      const postflightAuditLogs = await tx.auditLog.count({
        where: { id: { in: sourceAuditLogs.map((row) => row.id) } },
      });
      assertCount(postflightConfessions, EXPECTED_CONFESSIONS, 'postflight published confessions');
      assertCount(postflightReactions, EXPECTED_ELIGIBLE_REACTIONS, 'postflight reactions');
      assertCount(postflightAuditLogs, EXPECTED_AUDIT_LOGS, 'postflight audit logs');

      const stillPreserved = await tx.confession.findUnique({
        where: { id: PRESERVED_CONFESSION_ID },
        select: { id: true },
      });
      if (!stillPreserved) throw new Error('Postflight preservation failure');
    });
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Recovery transfer failed');
  process.exitCode = 1;
});
