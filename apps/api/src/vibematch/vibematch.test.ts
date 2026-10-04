import assert from 'node:assert/strict';
import { createToken, emailHash, hashValue, normalizeEmail } from './auth';
import { DevelopmentEmailProvider } from './email-provider';
import {
  addContribution,
  emptyDna,
  findOption,
  findQuestion,
  normalizeDna,
  selectQuestions,
} from './questions';

(async function run() {
  assert.equal(normalizeEmail('  Person@Example.COM '), 'person@example.com');
  assert.equal(emailHash('Person@example.com'), emailHash(' person@EXAMPLE.COM '));
  const token = createToken();
  assert.equal(token.length > 30, true);
  assert.notEqual(token, hashValue(token));

  const selected = selectQuestions(42);
  assert.equal(selected.length, 7);
  assert.equal(new Set(selected.map((question) => question.id)).size, 7);
  assert.equal(
    selected.every((question) => question.active),
    true,
  );
  const option = findOption(selected[0], selected[0].answerOptions[0].id);
  assert.ok(option);
  assert.equal(findOption(selected[0], 'tampered-option'), undefined);

  const dna = addContribution(emptyDna(), option.dnaContribution);
  const normalized = normalizeDna(dna);
  assert.equal(Object.keys(normalized).length, 6);
  assert.equal(
    Object.values(normalized).every((value) => value >= 0 && value <= 100),
    true,
  );
  assert.equal(findQuestion('not-a-server-question'), undefined);

  const provider = new DevelopmentEmailProvider();
  const expiresAt = new Date(Date.now() + 60_000);
  await provider.sendMagicLink({ email: 'person@example.com', token, expiresAt });
  assert.equal(provider.delivered[0].token, token);
  assert.equal(provider.delivered[0].email, 'person@example.com');
  console.log(
    'VibeMatch auth, question ownership, deterministic scoring, and provider tests passed',
  );
})();
