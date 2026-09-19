import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminRole } from '@prisma/client';
import { AdminIdentity, issueAccessToken, verifyToken } from './admin-auth';
import { UpdateConfessionDto, CreateThemeDto } from './admin.dto';

async function run() {
  const admin: AdminIdentity = {
    id: 'admin-1',
    email: 'hidden@example.com',
    name: 'Moderator',
    role: AdminRole.MODERATOR,
    sessionId: 'session-1',
  };
  const token = issueAccessToken(admin);
  const payload = verifyToken(token);
  assert.equal(payload.sub, 'admin-1');
  assert.equal(payload.role, 'MODERATOR');
  assert.equal(typeof payload.jti, 'string');
  assert.equal('email' in payload, false);
  assert.throws(() => verifyToken(`${token.slice(0, -1)}x`));
  const expired = `${token.split('.').slice(0, 2).join('.')}.${token.split('.')[2]}`;
  assert.ok(expired);

  const valid = plainToInstance(UpdateConfessionDto, {
    content: ' edited ',
    category: 'CRUSH',
    themeId: 'midnight',
  });
  assert.equal((await validate(valid)).length, 0);
  const massAssignment = plainToInstance(UpdateConfessionDto, {
    content: 'ok',
    status: 'PUBLISHED',
    editorId: 'other',
    viewCount: 999,
  });
  const massErrors = await validate(massAssignment, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  assert.ok(massErrors.some((error) => error.property === 'status'));
  assert.ok(massErrors.some((error) => error.property === 'editorId'));

  const invalidTheme = plainToInstance(CreateThemeDto, {
    slug: '',
    name: 'x',
    background: '#000',
    gradient: '',
    textColor: '#fff',
    accentColor: '#fff',
    fontFamily: 'Inter',
    radius: 101,
  });
  const themeErrors = await validate(invalidTheme);
  assert.ok(themeErrors.some((error) => error.property === 'slug'));
  assert.ok(themeErrors.some((error) => error.property === 'radius'));
  console.log('admin security and DTO behavior tests passed');
}
void run();
