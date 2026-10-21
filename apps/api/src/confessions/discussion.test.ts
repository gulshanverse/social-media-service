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
const schema = readFileSync(join(process.cwd(), '../../prisma/schema.prisma'), 'utf8');
assert.match(schema, /@@unique\(\[confessionId, actorHash, emoji\]\)/);
const reactionMigration = readFileSync(
  join(
    process.cwd(),
    '../../prisma/migrations/20261022040000_allow_multiple_confession_reactions/migration.sql',
  ),
  'utf8',
);
assert.match(reactionMigration, /DROP INDEX "ConfessionReaction_confessionId_actorHash_key"/);
assert.match(reactionMigration, /ConfessionReaction_confessionId_actorHash_emoji_key/);
const registeredControllers = Reflect.getMetadata('controllers', ConfessionsModule) as unknown[];
assert.ok(
  registeredControllers.indexOf(DiscussionController) <
    registeredControllers.indexOf(ConfessionsController),
  'fixed discussion routes must precede the dynamic confession identifier route',
);
console.log('confession discussion input validation tests passed');
