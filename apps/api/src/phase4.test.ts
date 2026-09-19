import 'reflect-metadata';
import assert from 'node:assert/strict';
import { AdminRole, ConfessionStatus, ReportStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { setPrismaForTests, prisma } from './admin-auth';

const realPrisma = prisma;
const actor = {
  id: 'admin-1',
  email: 'mod@example.com',
  name: 'Moderator',
  role: AdminRole.MODERATOR,
};

async function run() {
  const calls: Record<string, any[]> = { confession: [], report: [], audit: [] };
  setPrismaForTests({
    confession: {
      findMany: async (args: any) => {
        calls.confession.push(args);
        return [];
      },
      count: async () => 4,
    },
    report: {
      findMany: async (args: any) => {
        calls.report.push(args);
        return [];
      },
      count: async ({ where }: any) =>
        where?.status === ReportStatus.OPEN ? 2 : where?.status === ReportStatus.RESOLVED ? 3 : 5,
    },
    auditLog: {
      findMany: async (args: any) => {
        calls.audit.push(args);
        return [];
      },
      count: async () => 0,
    },
    theme: { count: async () => 7 },
  } as any);
  try {
    const service = new AdminService();
    const dashboard = await service.dashboard();
    assert.deepEqual(dashboard, {
      pendingConfessions: 4,
      publishedConfessions: 4,
      rejectedConfessions: 4,
      openReports: 2,
      resolvedReports: 3,
      totalConfessions: 4,
      activeThemes: 7,
    });
    await service.queue({
      page: 2,
      limit: 10,
      status: ConfessionStatus.PENDING,
      search: 'campus',
      order: 'oldest',
    } as any);
    assert.equal(calls.confession[0].skip, 10);
    assert.equal(calls.confession[0].take, 10);
    assert.equal(calls.confession[0].orderBy.createdAt, 'asc');
    assert.equal(calls.confession[0].where.OR.length, 2);
    await service.reports({
      page: 1,
      limit: 20,
      status: ReportStatus.OPEN,
      search: 'spam',
      order: 'oldest',
    });
    assert.equal(calls.report[0].orderBy.createdAt, 'asc');
    assert.equal(calls.report[0].where.OR.length, 2);
    await service.audit({ page: 1, limit: 30, action: 'EDIT', entity: 'CONFESSION' });
    assert.equal(calls.audit[0].take, 30);
    assert.equal(calls.audit[0].where.action.contains, 'EDIT');
    assert.equal(calls.audit[0].where.entity.contains, 'CONFESSION');
    console.log('phase 4 dashboard, filter, search, pagination, and safe-query tests passed');
  } finally {
    setPrismaForTests(realPrisma);
  }
}
void run();
