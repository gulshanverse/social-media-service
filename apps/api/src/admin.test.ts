import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminRole, ConfessionStatus, ReportStatus } from '@prisma/client';
import { AdminAuthController } from './admin.controller';
import { AdminController } from './admin.module';
import {
  AdminIdentity,
  accessSecret,
  hashPassword,
  issueAccessToken,
  issueRefreshToken,
  JwtAuthGuard,
  prisma,
  refreshSecret,
  RolesGuard,
  setPrismaForTests,
  verifyToken,
} from './admin-auth';
import {
  AdminQueueQueryDto,
  AdminReportQueryDto,
  CreateThemeDto,
  UpdateConfessionDto,
} from './admin.dto';
import {
  AdminService,
  assertOpenReportTransition,
  assertPendingConfessionEdit,
} from './admin.service';

const realPrisma = prisma;
const admin: AdminIdentity = {
  id: 'admin-1',
  email: 'hidden@example.com',
  name: 'Moderator',
  role: AdminRole.MODERATOR,
  sessionId: 'session-1',
};
const now = () => new Date(Date.now() + 60_000);
function context(token: string) {
  const request: { headers: Record<string, string>; user?: AdminIdentity } = {
    headers: { authorization: `Bearer ${token}` },
  };
  return {
    request,
    execution: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never,
  };
}
function signed(
  payload: Record<string, unknown>,
  key = accessSecret(),
  header = { alg: 'HS256', typ: 'JWT' },
) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode(header)}.${encode(payload)}`;
  return `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`;
}
function fakeDatabase(overrides: Record<string, unknown> = {}) {
  return {
    adminSession: {
      findUnique: async () => ({
        adminId: admin.id,
        revokedAt: null,
        expiresAt: now(),
        refreshTokenHash: '',
      }),
      updateMany: async () => ({ count: 1 }),
    },
    adminUser: { findUnique: async () => ({ ...admin, isActive: true }) },
    auditLog: { create: async () => ({}) },
    confession: {},
    report: {},
    theme: {},
    ...overrides,
  } as any;
}
async function testJwtParsingAndTypes() {
  const access = issueAccessToken(admin);
  const refresh = issueRefreshToken(admin, admin.sessionId!);
  assert.equal(verifyToken(access, accessSecret(), 'access').type, 'access');
  assert.equal(verifyToken(refresh, refreshSecret(), 'refresh').type, 'refresh');
  assert.throws(() => verifyToken(refresh, 'wrong-secret', 'refresh'));
  assert.throws(() => verifyToken(access, 'wrong-secret', 'refresh'));
  assert.throws(() => verifyToken('missing.segment'));
  assert.throws(() => verifyToken('a.b.c.d'));
  assert.throws(() => verifyToken(`${access}.extra`));
  const accessParts = access.split('.');
  const tamperedSignature = accessParts[2][0] === 'a' ? 'b' : 'a';
  assert.throws(() =>
    verifyToken(
      `${accessParts[0]}.${accessParts[1]}.${tamperedSignature}${accessParts[2].slice(1)}`,
    ),
  );
  assert.throws(() =>
    verifyToken(signed({ ...verifyToken(access), exp: Math.floor(Date.now() / 1000) - 1 })),
  );
  assert.throws(() => verifyToken(signed({ sub: admin.id, sid: admin.sessionId, type: 'access' })));
  assert.throws(() =>
    verifyToken(signed({ ...verifyToken(access), type: 'refresh' }), accessSecret(), 'access'),
  );
  assert.throws(() =>
    verifyToken(signed({ ...verifyToken(access) }, accessSecret(), { alg: 'HS512', typ: 'JWT' })),
  );
  assert.throws(() =>
    verifyToken(
      signed({ ...verifyToken(access) }, accessSecret(), { alg: 'HS256', typ: 'NOT-JWT' }),
    ),
  );
  assert.throws(() => verifyToken('!!!.eyJ4IjoxfQ.sig'));
}
async function testGuardSessionInvalidation() {
  const access = issueAccessToken(admin);
  const cases = [
    ['valid', fakeDatabase(), false],
    [
      'revoked',
      fakeDatabase({
        adminSession: {
          findUnique: async () => ({ adminId: admin.id, revokedAt: new Date(), expiresAt: now() }),
        },
      }),
      true,
    ],
    [
      'expired',
      fakeDatabase({
        adminSession: {
          findUnique: async () => ({
            adminId: admin.id,
            revokedAt: null,
            expiresAt: new Date(Date.now() - 1),
          }),
        },
      }),
      true,
    ],
    [
      'wrong owner',
      fakeDatabase({
        adminSession: {
          findUnique: async () => ({ adminId: 'other', revokedAt: null, expiresAt: now() }),
        },
      }),
      true,
    ],
    ['missing', fakeDatabase({ adminSession: { findUnique: async () => null } }), true],
    [
      'inactive',
      fakeDatabase({ adminUser: { findUnique: async () => ({ ...admin, isActive: false }) } }),
      true,
    ],
  ] as const;
  for (const [label, database, rejected] of cases) {
    setPrismaForTests(database);
    const guard = new JwtAuthGuard();
    const { execution, request } = context(access);
    if (rejected)
      await assert.rejects(() => guard.canActivate(execution), /Authentication|Invalid/);
    else {
      assert.equal(await guard.canActivate(execution), true, label);
      assert.equal(request.user?.role, AdminRole.MODERATOR);
    }
  }
  const changedRoleDb = fakeDatabase({
    adminUser: { findUnique: async () => ({ ...admin, role: AdminRole.DESIGNER, isActive: true }) },
  });
  setPrismaForTests(changedRoleDb);
  const changed = context(access);
  await new JwtAuthGuard().canActivate(changed.execution);
  assert.equal(changed.request.user?.role, AdminRole.DESIGNER);
}
async function testRefreshRotation() {
  let storedHash = '';
  const session: any = {
    id: 'session-1',
    adminId: admin.id,
    revokedAt: null,
    expiresAt: now(),
    get refreshTokenHash() {
      return storedHash;
    },
    admin: { ...admin, isActive: true },
  };
  let updateCount = 0;
  const database = fakeDatabase({
    adminSession: {
      findUnique: async () => session,
      updateMany: async ({ where, data }: any) => {
        if (where.refreshTokenHash !== storedHash || where.revokedAt !== null) return { count: 0 };
        storedHash = data.refreshTokenHash;
        updateCount += 1;
        return { count: 1 };
      },
    },
  });
  setPrismaForTests(database);
  const controller = new AdminAuthController();
  const old = issueRefreshToken(admin, session.id);
  storedHash = (await import('./admin-auth')).hashToken(old);
  const response = { cookie: () => undefined, clearCookie: () => undefined } as any;
  const result = await controller.refresh(
    { body: {} } as any,
    { headers: { cookie: `admin_refresh=${old}` } } as any,
    response,
  );
  assert.equal(typeof result.accessToken, 'string');
  assert.equal(updateCount, 1);
  await assert.rejects(
    () =>
      controller.refresh(
        { body: {} } as any,
        { headers: { cookie: `admin_refresh=${old}` } } as any,
        response,
      ),
    /Invalid refresh token/,
  );
  assert.equal(updateCount, 1);
  session.revokedAt = new Date();
  await assert.rejects(
    () =>
      controller.refresh(
        { body: {} } as any,
        { headers: { cookie: `admin_refresh=${old}` } } as any,
        response,
      ),
    /Invalid refresh token/,
  );
  session.revokedAt = null;
  session.expiresAt = new Date(Date.now() - 1);
  await assert.rejects(
    () =>
      controller.refresh(
        { body: {} } as any,
        { headers: { cookie: `admin_refresh=${old}` } } as any,
        response,
      ),
    /Invalid refresh token/,
  );
  const access = issueAccessToken(admin);
  await assert.rejects(
    () =>
      controller.refresh(
        { body: {} } as any,
        { headers: { cookie: `admin_refresh=${access}` } } as any,
        response,
      ),
    /Invalid refresh token/,
  );
  await assert.rejects(
    () =>
      controller.refresh(
        { body: {} } as any,
        { headers: { cookie: 'admin_refresh=broken' } } as any,
        response,
      ),
    /Invalid refresh token/,
  );
}
async function testAuthAuditEvents() {
  const audit: any[] = [];
  const passwordHash = await hashPassword('correct-password');
  let createdSession: any;
  const database = fakeDatabase({
    adminUser: { findUnique: async () => ({ ...admin, passwordHash, isActive: true }) },
    adminSession: {
      create: async ({ data }: any) => {
        createdSession = data;
        return data;
      },
      updateMany: async () => ({ count: 1 }),
    },
    auditLog: {
      create: async ({ data }: any) => {
        audit.push(data);
        return data;
      },
    },
  });
  setPrismaForTests(database);
  const controller = new AdminAuthController();
  const response = { cookie: () => undefined, clearCookie: () => undefined } as any;
  const login = await controller.login(
    { email: admin.email, password: 'correct-password' },
    { ip: '127.0.0.1' } as any,
    response,
  );
  assert.equal(typeof login.accessToken, 'string');
  assert.equal('refreshToken' in login, false);
  assert.equal(typeof createdSession.refreshTokenHash, 'string');
  assert.equal(audit.at(-1).action, 'LOGIN');
  await controller.logout({ user: { ...admin, sessionId: createdSession.id } } as any, response);
  assert.equal(audit.at(-1).action, 'LOGOUT');
}
async function testDtosAndServiceState() {
  const reportValid = await validate(
    plainToInstance(AdminReportQueryDto, { page: '1', limit: '20', status: 'OPEN' }),
  );
  assert.equal(reportValid.length, 0);
  for (const input of [
    { status: 'NOT_A_STATUS' },
    { page: '0' },
    { page: '-1' },
    { limit: '101' },
    { unknown: 'x' },
  ])
    assert.ok(
      (
        await validate(plainToInstance(AdminReportQueryDto, input), {
          whitelist: true,
          forbidNonWhitelisted: true,
        })
      ).length > 0,
    );
  const queue = plainToInstance(AdminQueueQueryDto, {
    status: 'PENDING',
    category: 'CRUSH',
    page: '1',
  });
  assert.equal((await validate(queue)).length, 0);
  const validTheme = plainToInstance(CreateThemeDto, {
    slug: 'x',
    name: 'X',
    background: '#000',
    gradient: 'none',
    textColor: '#fff',
    accentColor: '#fff',
    fontFamily: 'Inter',
    radius: 20,
  });
  assert.equal((await validate(validTheme)).length, 0);
  const invalidTheme = plainToInstance(CreateThemeDto, {
    ...validTheme,
    background: '',
    gradient: '',
    textColor: '',
    accentColor: '',
    fontFamily: '',
  });
  assert.ok((await validate(invalidTheme)).length > 0);
  const mass = plainToInstance(UpdateConfessionDto, {
    content: 'ok',
    id: 'x',
    publicId: 'x',
    originalContent: 'x',
    status: 'PUBLISHED',
    viewCount: 1,
    editorId: 'other',
  });
  assert.ok((await validate(mass, { whitelist: true, forbidNonWhitelisted: true })).length > 0);

  const audit: any[] = [];
  let confessionStatus: ConfessionStatus = ConfessionStatus.PENDING;
  let reportStatus: ReportStatus = ReportStatus.OPEN;
  let updatedData: any;
  const database = fakeDatabase({
    auditLog: {
      create: async ({ data }: any) => {
        audit.push(data);
        return data;
      },
    },
    confession: {
      findUnique: async () => ({ status: confessionStatus }),
      update: async ({ data }: any) => {
        updatedData = data;
        return {
          id: 'c1',
          publicId: 'p1',
          content: data.content,
          originalContent: 'original',
          status: confessionStatus,
          theme: { id: 'theme-db-id', slug: 'midnight', name: 'Midnight' },
        };
      },
    },
    report: {
      findUnique: async () => ({ status: reportStatus }),
      update: async ({ data }: any) => {
        reportStatus = data.status;
        return { id: 'r1', status: data.status, resolvedAt: data.resolvedAt };
      },
    },
    theme: {
      findUnique: async ({ where }: any) =>
        where.id === 'theme-db-id' ? { id: 'theme-db-id' } : null,
      create: async ({ data }: any) => ({ id: 'theme-created', ...data }),
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
    },
  });
  setPrismaForTests(database);
  const service = new AdminService();
  const edited = await service.edit(
    'c1',
    plainToInstance(UpdateConfessionDto, { content: ' edited ', themeId: 'theme-db-id' }),
    admin,
  );
  assert.equal(updatedData.themeId, 'theme-db-id');
  assert.equal(updatedData.editorId, admin.id);
  assert.equal(edited.originalContent, 'original');
  assert.equal(audit.at(-1).action, 'EDIT');
  confessionStatus = ConfessionStatus.PUBLISHED;
  await assert.rejects(
    () => service.edit('c1', plainToInstance(UpdateConfessionDto, { content: 'x' }), admin),
    /Cannot edit/,
  );
  for (const status of [ConfessionStatus.REJECTED, ConfessionStatus.ARCHIVED]) {
    confessionStatus = status;
    await assert.rejects(
      () => service.edit('c1', plainToInstance(UpdateConfessionDto, { content: 'x' }), admin),
      /Cannot edit/,
    );
  }
  confessionStatus = ConfessionStatus.PENDING;
  await assert.rejects(
    () => service.edit('c1', plainToInstance(UpdateConfessionDto, { themeId: 'midnight' }), admin),
    /Invalid theme/,
  );
  assert.equal((await service.reportAction('r1', 'resolve', admin)).status, ReportStatus.RESOLVED);
  confessionStatus = ConfessionStatus.PENDING;
  await service.transition('c1', 'approve', admin);
  assert.equal(audit.at(-1).action, 'APPROVE');
  confessionStatus = ConfessionStatus.PENDING;
  await service.transition('c1', 'reject', admin);
  assert.equal(audit.at(-1).action, 'REJECT');
  confessionStatus = ConfessionStatus.REJECTED;
  await service.transition('c1', 'archive', admin);
  assert.equal(audit.at(-1).action, 'ARCHIVE');
  await service.createTheme(
    {
      slug: 'new',
      name: 'New',
      background: '#000',
      gradient: 'none',
      textColor: '#fff',
      accentColor: '#fff',
      fontFamily: 'Inter',
      radius: 20,
    },
    admin,
  );
  assert.equal(audit.at(-1).action, 'THEME_CREATE');
  await service.updateTheme('theme-db-id', { name: 'Updated' }, admin);
  assert.equal(audit.at(-1).action, 'THEME_UPDATE');
  const auditCount = audit.length;
  reportStatus = ReportStatus.RESOLVED;
  await assert.rejects(() => service.reportAction('r1', 'dismiss', admin), /Cannot dismiss/);
  assert.equal(audit.length, auditCount);
  reportStatus = ReportStatus.OPEN;
  await service.reportAction('r1', 'dismiss', admin);
  assert.equal(audit.at(-1).action, 'REPORT_DISMISS');
  assert.doesNotThrow(() => assertOpenReportTransition(ReportStatus.OPEN, 'resolve'));
  assert.doesNotThrow(() => assertPendingConfessionEdit(ConfessionStatus.PENDING));
}
async function testRbacMetadata() {
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
  ])
    assert.deepEqual(
      Reflect.getMetadata('roles', (AdminController.prototype as any)[method]),
      protectedRoles,
    );
  assert.deepEqual(Reflect.getMetadata('roles', AdminController.prototype.audit), [
    AdminRole.SUPER_ADMIN,
  ]);
  const guard = (roles: AdminRole[], role: AdminRole) =>
    new RolesGuard({ get: <T>() => roles as T } as any).canActivate({
      getHandler: () => AdminController.prototype.queue,
      getClass: () => AdminController,
      switchToHttp: () => ({ getRequest: () => ({ user: { ...admin, role } }) }),
    } as never);
  assert.throws(() => guard(protectedRoles, AdminRole.DESIGNER));
  assert.doesNotThrow(() => guard(protectedRoles, AdminRole.MODERATOR));
  assert.doesNotThrow(() => guard([AdminRole.SUPER_ADMIN, AdminRole.DESIGNER], AdminRole.DESIGNER));
}
async function run() {
  try {
    await testJwtParsingAndTypes();
    await testGuardSessionInvalidation();
    await testRefreshRotation();
    await testAuthAuditEvents();
    await testDtosAndServiceState();
    await testRbacMetadata();
    console.log('admin security, session, refresh, DTO, service, and RBAC tests passed');
  } finally {
    setPrismaForTests(realPrisma);
  }
}
void run();
