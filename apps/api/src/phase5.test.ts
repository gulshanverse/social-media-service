import 'reflect-metadata';
import assert from 'node:assert/strict';
import { ConfessionStatus, AdminRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { HealthController } from './module';
import { AdminAuthController } from './admin.controller';
import { LoginRateLimiter, prisma, setPrismaForTests } from './admin-auth';
import { metricsSnapshot } from './observability';

const realPrisma = prisma;
const actor = {
  id: 'moderator-1',
  email: 'moderator@example.com',
  name: 'Moderator',
  role: AdminRole.MODERATOR,
};

async function run() {
  const records = new Map([
    ['pending-1', { status: ConfessionStatus.PENDING }],
    ['published-1', { status: ConfessionStatus.PUBLISHED }],
    ['stale-1', { status: ConfessionStatus.PENDING }],
  ]);
  const audits: any[] = [];
  setPrismaForTests({
    confession: {
      findUnique: async ({ where }: any) => records.get(where.id) ?? null,
      updateMany: async ({ where, data }: any) => {
        const current = records.get(where.id);
        if (!current || current.status !== where.status) return { count: 0 };
        if (where.id === 'stale-1') {
          records.set(where.id, { status: ConfessionStatus.PUBLISHED });
          return { count: 0 };
        }
        records.set(where.id, { ...current, ...data });
        return { count: 1 };
      },
    },
    auditLog: { create: async ({ data }: any) => (audits.push(data), data) },
  } as any);

  try {
    const result = await new AdminService().bulkModerate(
      { ids: ['pending-1', 'missing', 'published-1', 'pending-1', 'stale-1'], action: 'approve' },
      actor,
    );
    assert.equal(result.requested, 5);
    assert.equal(result.processed, 1);
    assert.equal(result.skipped, 4);
    assert.deepEqual(
      result.results.map((item) => item.outcome),
      [
        'APPROVED',
        'NOT_FOUND',
        'SKIPPED_INVALID_STATE',
        'SKIPPED_DUPLICATE',
        'SKIPPED_STALE_STATE',
      ],
    );
    assert.equal(records.get('pending-1')?.status, ConfessionStatus.PUBLISHED);
    assert.equal(audits.filter((entry) => entry.action === 'APPROVE').length, 1);
    assert.equal(audits.at(-1).action, 'BULK_MODERATION');

    const health = new HealthController();
    assert.deepEqual(health.getHealth(), {
      status: 'ok',
      service: 'social-media-service-api',
    });
    process.env.APP_VERSION = 'test-version';
    process.env.GIT_COMMIT = 'test-sha';
    assert.deepEqual(health.version(), {
      service: 'social-media-service-api',
      version: 'test-version',
      commit: 'test-sha',
      environment: process.env.NODE_ENV ?? 'development',
    });
    assert.equal(typeof metricsSnapshot().counters.moderation_actions_total, 'number');

    process.env.PHASE5_RATE_LIMIT = '1';
    process.env.PHASE5_RATE_WINDOW = '60';
    const limiter = new LoginRateLimiter('PHASE5_RATE_LIMIT', 'PHASE5_RATE_WINDOW');
    assert.equal(limiter.check('client-1'), true);
    assert.equal(limiter.check('client-1'), false);
    assert.equal(limiter.check('client-2'), true);

    process.env.ADMIN_LOGIN_RATE_LIMIT = '1';
    process.env.ADMIN_LOGIN_RATE_WINDOW_SECONDS = '60';
    setPrismaForTests({ adminUser: { findUnique: async () => null } } as any);
    const headers: Record<string, string> = {};
    const response = {
      header: (name: string, value: string) => (headers[name] = value),
      cookie: () => undefined,
      clearCookie: () => undefined,
    } as any;
    const auth = new AdminAuthController();
    await assert.rejects(() =>
      auth.login(
        { email: 'missing@example.com', password: 'x' },
        { ip: 'phase5-rate-limit-client' } as any,
        response,
      ),
    );
    await assert.rejects(
      () =>
        auth.login(
          { email: 'missing@example.com', password: 'x' },
          { ip: 'phase5-rate-limit-client' } as any,
          response,
        ),
      /Invalid email or password/,
    );
    assert.equal(headers['Retry-After'], '60');
    console.log('phase 5 bulk moderation, health/version, metrics, and rate-limit tests passed');
  } finally {
    delete process.env.APP_VERSION;
    delete process.env.GIT_COMMIT;
    delete process.env.PHASE5_RATE_LIMIT;
    delete process.env.PHASE5_RATE_WINDOW;
    delete process.env.ADMIN_LOGIN_RATE_LIMIT;
    delete process.env.ADMIN_LOGIN_RATE_WINDOW_SECONDS;
    setPrismaForTests(realPrisma);
  }
}

void run();
