import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateConfessionDto } from './dto';
import { SubmissionRateLimiter } from './rate-limit';

async function run() {
  const valid = await validate(
    plainToInstance(CreateConfessionDto, {
      content: 'A real campus thought',
      category: 'CRUSH',
      themeId: 'midnight',
    }),
  );
  assert.equal(valid.length, 0);
  const invalidCategory = await validate(
    plainToInstance(CreateConfessionDto, {
      content: 'Still valid text',
      category: 'NOT_A_CATEGORY',
    }),
  );
  assert.ok(invalidCategory.some((error) => error.property === 'category'));
  const oversized = await validate(
    plainToInstance(CreateConfessionDto, { content: 'x'.repeat(1001) }),
  );
  assert.ok(oversized.some((error) => error.property === 'content'));

  const limiter = new SubmissionRateLimiter();
  assert.equal(limiter.check('student', 2, 60, 0).allowed, true);
  assert.equal(limiter.check('student', 2, 60, 1).allowed, true);
  const limited = limiter.check('student', 2, 60, 2);
  assert.equal(limited.allowed, false);
  assert.ok(limited.retryAfterSeconds > 0);
  assert.equal(limiter.check('student', 2, 60, 61_000).allowed, true);
  console.log('confessions: validation and rate-limit tests passed');
}

void run();
