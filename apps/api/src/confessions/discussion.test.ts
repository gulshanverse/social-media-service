import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertCommenterOrigin } from './discussion.controller';
import { normalizeEmoji, normalizeInstagramUsername } from './discussion.dto';
import { ConfessionsModule } from './confessions.module';
import { ConfessionsController } from './confessions.controller';
import { DiscussionController } from './discussion.controller';

assert.equal(normalizeInstagramUsername(' @campus.wall '), 'campus.wall');
assert.throws(() => normalizeInstagramUsername('bad username'), /valid Instagram/);
assert.equal(normalizeEmoji('🫶'), '🫶');
assert.throws(() => normalizeEmoji('hello'), /valid emoji/);
assert.throws(() => normalizeEmoji(''), /valid emoji/);
assert.throws(() => assertCommenterOrigin({ headers: {} } as any), /trusted browser origin/);
assert.throws(
  () => assertCommenterOrigin({ headers: { origin: 'https://evil.example' } } as any),
  /trusted browser origin/,
);
assert.doesNotThrow(() =>
  assertCommenterOrigin({ headers: { origin: 'http://localhost:3000' } } as any),
);
const originalWebOrigin = process.env.WEB_ORIGIN;
process.env.WEB_ORIGIN = 'https://web.example.com/';
assert.doesNotThrow(() =>
  assertCommenterOrigin({ headers: { origin: 'https://web.example.com' } } as any),
);
if (originalWebOrigin === undefined) delete process.env.WEB_ORIGIN;
else process.env.WEB_ORIGIN = originalWebOrigin;
const schema = readFileSync(join(process.cwd(), '../../prisma/schema.prisma'), 'utf8');
assert.match(schema, /@@unique\(\[confessionId, actorHash, emoji\]\)/);
assert.match(schema, /model ConfessionCommentReaction/);
assert.match(schema, /@@unique\(\[commentId, actorHash, emoji\]\)/);
const reactionMigration = readFileSync(
  join(
    process.cwd(),
    '../../prisma/migrations/20261022040000_allow_multiple_confession_reactions/migration.sql',
  ),
  'utf8',
);
assert.match(reactionMigration, /DROP INDEX "ConfessionReaction_confessionId_actorHash_key"/);
assert.match(reactionMigration, /ConfessionReaction_confessionId_actorHash_emoji_key/);
const commentReactionMigration = readFileSync(
  join(
    process.cwd(),
    '../../prisma/migrations/20261116010000_confession_comment_reactions/migration.sql',
  ),
  'utf8',
);
assert.match(commentReactionMigration, /CREATE TABLE "ConfessionCommentReaction"/);
assert.match(commentReactionMigration, /ConfessionCommentReaction_commentId_actorHash_emoji_key/);
const commentReactionRepairMigration = readFileSync(
  join(
    process.cwd(),
    '../../prisma/migrations/20261119030000_repair_confession_comment_reactions/migration.sql',
  ),
  'utf8',
);
assert.match(
  commentReactionRepairMigration,
  /CREATE TABLE IF NOT EXISTS "ConfessionCommentReaction"/,
);
assert.match(commentReactionRepairMigration, /CREATE UNIQUE INDEX IF NOT EXISTS/);
assert.match(commentReactionRepairMigration, /ConfessionCommentReaction_commentId_fkey/);
assert.match(commentReactionRepairMigration, /ConfessionCommentReaction_profileId_fkey/);
const registeredControllers = Reflect.getMetadata('controllers', ConfessionsModule) as unknown[];
assert.ok(
  registeredControllers.indexOf(DiscussionController) <
    registeredControllers.indexOf(ConfessionsController),
  'fixed discussion routes must precede the dynamic confession identifier route',
);
assert.equal(typeof DiscussionController.prototype.reactToComment, 'function');
console.log('confession discussion input validation tests passed');
