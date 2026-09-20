import 'reflect-metadata';
import assert from 'node:assert/strict';
import request from 'supertest';
import { AdminRole, ConfessionStatus } from '@prisma/client';
import { createApp } from './main';
import { issueAccessToken, prisma, setPrismaForTests, type AdminIdentity } from './admin-auth';

const realPrisma = prisma;

function tokenFor(role: AdminRole) {
  const identity: AdminIdentity = {
    id: `${role.toLowerCase()}-id`,
    email: `${role.toLowerCase()}@example.com`,
    name: role,
    role,
    sessionId: `${role.toLowerCase()}-session`,
  };
  return issueAccessToken(identity);
}

async function run() {
  process.env.JWT_SECRET = 'phase5-http-test-access';
  process.env.JWT_REFRESH_SECRET = 'phase5-http-test-refresh';
  const records = new Map<string, { status: ConfessionStatus }>([
    ['bulk-pending', { status: ConfessionStatus.PENDING }],
  ]);
  const fakePrisma = {
    $queryRaw: async () => [{ '?column?': 1 }],
    adminSession: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        adminId: where.id.replace('-session', '-id'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    },
    adminUser: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const role = where.id.startsWith('moderator')
          ? AdminRole.MODERATOR
          : where.id.startsWith('super_admin')
            ? AdminRole.SUPER_ADMIN
            : AdminRole.DESIGNER;
        return {
          id: where.id,
          email: `${role.toLowerCase()}@example.com`,
          name: role,
          role,
          isActive: true,
        };
      },
    },
    confession: {
      findUnique: async ({ where }: { where: { id: string } }) => records.get(where.id) ?? null,
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; status: ConfessionStatus };
        data: object;
      }) => {
        const current = records.get(where.id);
        if (!current || current.status !== where.status) return { count: 0 };
        records.set(where.id, { ...current, ...data } as { status: ConfessionStatus });
        return { count: 1 };
      },
    },
    auditLog: { create: async ({ data }: { data: object }) => data },
  } as any;

  setPrismaForTests(fakePrisma);
  const app = await createApp();
  await app.init();
  try {
    const server = app.getHttpServer();
    const health = await request(server).get('/health').expect(200);
    assert.equal(health.body.status, 'ok');
    assert.match(health.headers['x-request-id'], /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);

    const suppliedId = 'client.request-01';
    const echoed = await request(server)
      .get('/health/live')
      .set('X-Request-ID', suppliedId)
      .expect(200);
    assert.equal(echoed.headers['x-request-id'], suppliedId);
    const replaced = await request(server)
      .get('/health/live')
      .set('X-Request-ID', '<unsafe>')
      .expect(200);
    assert.notEqual(replaced.headers['x-request-id'], '<unsafe>');

    await request(server)
      .get('/health/version')
      .expect(200)
      .expect(({ body }) => {
        assert.equal(body.service, 'social-media-service-api');
        assert.equal(typeof body.version, 'string');
        assert.equal('databaseUrl' in body, false);
      });
    const metrics = await request(server).get('/health/metrics').expect(200);
    assert.equal(typeof metrics.body.counters.http_requests_total, 'number');
    await request(server).get('/health/ready').expect(200);
    fakePrisma.$queryRaw = async () => {
      throw new Error('database unavailable');
    };
    const unavailable = await request(server).get('/health/ready').expect(503);
    assert.deepEqual(unavailable.body, {
      statusCode: 503,
      message: 'Internal server error.',
      code: 'INTERNAL_ERROR',
      requestId: unavailable.headers['x-request-id'],
    });
    fakePrisma.$queryRaw = async () => [{ '?column?': 1 }];
    const notFound = await request(server).get('/missing-endpoint').expect(404);
    assert.equal(notFound.body.code, 'NOT_FOUND');
    assert.equal(notFound.body.requestId, notFound.headers['x-request-id']);
    assert.equal(JSON.stringify(notFound.body).includes('stack'), false);

    await request(server)
      .post('/admin/confessions/bulk')
      .send({ ids: ['bulk-pending'], action: 'approve' })
      .expect(401);

    const designer = await request(server)
      .post('/admin/confessions/bulk')
      .set('Authorization', `Bearer ${tokenFor(AdminRole.DESIGNER)}`)
      .send({ ids: ['bulk-pending'], action: 'approve' });
    assert.equal(designer.status, 403);
    assert.equal(designer.body.code, 'FORBIDDEN');

    const moderator = await request(server)
      .post('/admin/confessions/bulk')
      .set('Authorization', `Bearer ${tokenFor(AdminRole.MODERATOR)}`)
      .send({ ids: ['bulk-pending', 'bulk-pending', 'missing'], action: 'approve' });
    assert.equal(moderator.status, 201);
    assert.equal(moderator.body.processed, 1);
    assert.deepEqual(
      moderator.body.results.map((item: { outcome: string }) => item.outcome),
      ['APPROVED', 'SKIPPED_DUPLICATE', 'NOT_FOUND'],
    );
    const superAdmin = await request(server)
      .post('/admin/confessions/bulk')
      .set('Authorization', `Bearer ${tokenFor(AdminRole.SUPER_ADMIN)}`)
      .send({ ids: ['bulk-pending'], action: 'archive' })
      .expect(201);
    assert.equal(superAdmin.body.processed, 1);

    await request(server)
      .post('/admin/confessions/bulk')
      .set('Authorization', `Bearer ${tokenFor(AdminRole.MODERATOR)}`)
      .send({ ids: [], action: 'approve' })
      .expect(400);
    await request(server)
      .post('/admin/confessions/bulk')
      .set('Authorization', `Bearer ${tokenFor(AdminRole.MODERATOR)}`)
      .send({ ids: ['bulk-pending'], action: 'approve', unexpected: true })
      .expect(400);

    console.log('phase 5 HTTP health, request-id, safe-error, bulk, and RBAC tests passed');
  } finally {
    await app.close();
    setPrismaForTests(realPrisma);
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  }
}

void run();

export {};
