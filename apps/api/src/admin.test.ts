import 'reflect-metadata';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminRole, ConfessionStatus, ReportStatus } from '@prisma/client';
import { AdminController } from './admin.module';
import { AdminIdentity, issueAccessToken, RolesGuard, verifyToken } from './admin-auth';
import { UpdateConfessionDto, CreateThemeDto } from './admin.dto';
import { assertOpenReportTransition, assertPendingConfessionEdit } from './admin.service';

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
  assert.equal(payload.type, 'access');
  assert.throws(() => verifyToken('missing.segment'));
  assert.throws(() => verifyToken('a.b.c.d'));
  assert.throws(() => verifyToken(`${token}.extra`));
  assert.throws(() => verifyToken('!!!.eyJ4IjoxfQ.sig'));
  const missingSessionToken = issueAccessToken({ ...admin, sessionId: undefined });
  assert.equal('sid' in verifyToken(missingSessionToken), false);

  const protectedRoles = [AdminRole.SUPER_ADMIN, AdminRole.MODERATOR];
  for (const method of [
    'queue',
    'detail',
    'edit',
    'approve',
    'reject',
    'archive',
    'reports',
    'report',
  ]) {
    assert.deepEqual(
      Reflect.getMetadata('roles', AdminController.prototype[method as keyof AdminController]),
      protectedRoles,
    );
  }
  assert.deepEqual(Reflect.getMetadata('roles', AdminController.prototype.audit), [
    AdminRole.SUPER_ADMIN,
  ]);
  assert.deepEqual(Reflect.getMetadata('roles', AdminController.prototype.themes), [
    AdminRole.SUPER_ADMIN,
    AdminRole.MODERATOR,
    AdminRole.DESIGNER,
  ]);
  assert.deepEqual(Reflect.getMetadata('roles', AdminController.prototype.createTheme), [
    AdminRole.SUPER_ADMIN,
    AdminRole.DESIGNER,
  ]);
  assert.deepEqual(Reflect.getMetadata('roles', AdminController.prototype.updateTheme), [
    AdminRole.SUPER_ADMIN,
    AdminRole.DESIGNER,
  ]);
  const roleGuard = (roles: AdminRole[], role: AdminRole) =>
    new RolesGuard({ get: <T>() => roles as T }).canActivate({
      getHandler: () => AdminController.prototype.queue,
      getClass: () => AdminController,
      switchToHttp: () => ({ getRequest: () => ({ user: { ...admin, role } }) }),
    } as never);
  assert.throws(() => roleGuard(protectedRoles, AdminRole.DESIGNER));
  assert.doesNotThrow(() => roleGuard(protectedRoles, AdminRole.MODERATOR));
  assert.doesNotThrow(() =>
    roleGuard([AdminRole.SUPER_ADMIN, AdminRole.DESIGNER], AdminRole.DESIGNER),
  );

  assert.doesNotThrow(() => assertOpenReportTransition(ReportStatus.OPEN, 'resolve'));
  assert.doesNotThrow(() => assertOpenReportTransition(ReportStatus.OPEN, 'dismiss'));
  for (const status of [ReportStatus.RESOLVED, ReportStatus.DISMISSED, ReportStatus.ARCHIVED]) {
    assert.throws(() => assertOpenReportTransition(status, 'resolve'));
    assert.throws(() => assertOpenReportTransition(status, 'dismiss'));
  }
  assert.doesNotThrow(() => assertPendingConfessionEdit(ConfessionStatus.PENDING));
  for (const status of [
    ConfessionStatus.PUBLISHED,
    ConfessionStatus.REJECTED,
    ConfessionStatus.ARCHIVED,
  ])
    assert.throws(() => assertPendingConfessionEdit(status));
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
