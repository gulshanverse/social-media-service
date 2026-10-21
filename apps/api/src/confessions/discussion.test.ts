import assert from 'node:assert/strict';
import { assertCommenterOrigin } from './discussion.controller';
import { normalizeEmoji, normalizeInstagramUsername } from './discussion.dto';

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
console.log('confession discussion input validation tests passed');
