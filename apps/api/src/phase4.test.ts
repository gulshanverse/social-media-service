import 'reflect-metadata';
import assert from 'node:assert/strict';
import { AdminRole, ConfessionStatus, ReportStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { setPrismaForTests, prisma } from './admin-auth';

const realPrisma = prisma;

async function run() {
  const calls: Record<string, any[]> = {
    confession: [],
    confessionCount: [],
    report: [],
    audit: [],
    theme: [],
  };
  setPrismaForTests({
    confession: {
      findMany: async (args: any) => {
        calls.confession.push(args);
        return [];
      },
      count: async ({ where }: any = {}) => {
        calls.confessionCount.push(where ?? {});
        return where?.status === ConfessionStatus.PENDING
          ? 3
          : where?.status === ConfessionStatus.PUBLISHED
            ? 11
            : where?.status === ConfessionStatus.REJECTED
              ? 5
              : 19;
      },
    },
    report: {
      findMany: async (args: any) => {
        calls.report.push(args);
        return [];
      },
      count: async ({ where }: any) =>
        where?.status === ReportStatus.OPEN ? 2 : where?.status === ReportStatus.RESOLVED ? 7 : 23,
    },
    auditLog: {
      findMany: async (args: any) => {
        calls.audit.push(args);
        return [];
      },
      count: async () => 0,
    },
    theme: {
      findMany: async (args: any) => {
        calls.theme.push(args);
        return [{ id: 'theme-21' }];
      },
      count: async () => 4,
    },
  } as any);
  try {
    const service = new AdminService();
    const dashboard = await service.dashboard();
    assert.deepEqual(dashboard, {
      pendingConfessions: 3,
      publishedConfessions: 11,
      rejectedConfessions: 5,
      openReports: 2,
      resolvedReports: 7,
      totalConfessions: 19,
      activeThemes: 4,
    });
    assert.deepEqual(calls.confessionCount.slice(0, 3), [
      { status: ConfessionStatus.PENDING },
      { status: ConfessionStatus.PUBLISHED },
      { status: ConfessionStatus.REJECTED },
    ]);

    await service.queue({
      page: 2,
      limit: 10,
      status: ConfessionStatus.REJECTED,
      category: 'RANT',
      theme: 'theme-21',
      search: 'campus',
      order: 'oldest',
    } as any);
    const queueCall = calls.confession.at(-1);
    assert.equal(queueCall.skip, 10);
    assert.equal(queueCall.take, 10);
    assert.deepEqual(queueCall.orderBy, { createdAt: 'asc' });
    assert.equal(queueCall.where.status, ConfessionStatus.REJECTED);
    assert.equal(queueCall.where.category, 'RANT');
    assert.deepEqual(queueCall.where.theme, { id: 'theme-21' });
    assert.deepEqual(queueCall.where.OR, [
      { publicId: { contains: 'campus', mode: 'insensitive' } },
      { content: { contains: 'campus', mode: 'insensitive' } },
    ]);

    await service.reports({
      page: 2,
      limit: 10,
      status: ReportStatus.OPEN,
      search: 'spam',
      order: 'oldest',
    });
    const reportCall = calls.report.at(-1);
    assert.equal(reportCall.skip, 10);
    assert.equal(reportCall.take, 10);
    assert.deepEqual(reportCall.orderBy, { createdAt: 'asc' });
    assert.equal(reportCall.where.status, ReportStatus.OPEN);
    assert.equal(reportCall.where.OR.length, 2);

    const themes = await service.themes({ page: 2, limit: 20 });
    assert.deepEqual(themes, {
      items: [{ id: 'theme-21' }],
      page: 2,
      limit: 20,
      total: 4,
      hasMore: false,
    });
    assert.equal(calls.theme.at(-1).skip, 20);
    assert.equal(calls.theme.at(-1).take, 20);
    assert.deepEqual(calls.theme.at(-1).orderBy, { name: 'asc' });

    await service.audit({ page: 2, limit: 30, action: 'EDIT', entity: 'CONFESSION' });
    const auditCall = calls.audit.at(-1);
    assert.equal(auditCall.skip, 30);
    assert.equal(auditCall.take, 30);
    assert.deepEqual(auditCall.orderBy, { createdAt: 'desc' });
    assert.equal(auditCall.where.action.contains, 'EDIT');
    assert.equal(auditCall.where.entity.contains, 'CONFESSION');
    console.log(
      'phase 4 dashboard, theme filter, pagination, ordering, search, and safe-query tests passed',
    );
  } finally {
    setPrismaForTests(realPrisma);
  }
}
void run();
