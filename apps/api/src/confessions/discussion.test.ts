import assert from 'node:assert/strict';
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
const registeredControllers = Reflect.getMetadata('controllers', ConfessionsModule) as unknown[];
assert.ok(
  registeredControllers.indexOf(DiscussionController) <
    registeredControllers.indexOf(ConfessionsController),
  'fixed discussion routes must precede the dynamic confession identifier route',
);
console.log('confession discussion input validation tests passed');
