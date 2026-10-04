import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { ConfessionStatus } from '@prisma/client';
import { ConfessionsController } from './confessions.controller';
import { CreateConfessionDto } from './dto';
import { ConfessionsPrisma, ConfessionsService } from './confessions.service';
import { SubmissionRateLimiter } from './rate-limit';

const theme = {
  id: 'midnight',
  slug: 'midnight',
  name: 'Midnight',
  background: '#070a12',
  gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
  textColor: '#fff',
  accentColor: '#00b8ff',
  fontFamily: 'Inter',
  radius: 28,
};
const publishedRecord = {
  id: 'internal-1',
  publicId: 'published-1',
  content: 'A published thought',
  category: 'CRUSH',
  publishedAt: new Date('2026-09-19T12:00:00.000Z'),
  theme,
};

function createDatabase(overrides: Partial<ConfessionsPrisma> = {}) {
  const created: Array<Record<string, unknown>> = [];
  let viewCountIncrements = 0;
  const database: ConfessionsPrisma = {
    theme: {
      findUnique: async () => theme,
    },
    confession: {
      create: async ({ data }) => {
        created.push(data);
        return data;
      },
      findMany: async () => [publishedRecord],
      count: async () => 1,
      findFirst: async ({ where }) =>
        where.publicId === publishedRecord.publicId ? publishedRecord : null,
      update: async ({ data }) => {
        viewCountIncrements += data.viewCount.increment;
      },
    },
    ...overrides,
  };
  return { database, created, getViewCountIncrements: () => viewCountIncrements };
}

function validDto() {
  return plainToInstance(CreateConfessionDto, {
    content: '  A real campus thought  ',
    category: 'CRUSH',
    themeId: 'midnight',
  });
}

async function run() {
  const submission = createDatabase();
  const service = new ConfessionsService(submission.database, new SubmissionRateLimiter());
  const result = await service.create(validDto(), 'student');
  assert.equal(result.status, 'PENDING');
  assert.match(result.publicId, /^[a-z0-9]+-[a-f0-9]{8}$/);
  assert.equal(submission.created.length, 1);
  assert.deepEqual(submission.created[0], {
    publicId: result.publicId,
    content: 'A real campus thought',
    originalContent: 'A real campus thought',
    category: 'CRUSH',
    status: ConfessionStatus.PENDING,
    themeId: 'midnight',
  });
  assert.equal('publishedAt' in submission.created[0], false);

  await assert.rejects(
    () => service.create(plainToInstance(CreateConfessionDto, { content: '  \n\t' }), 'empty'),
    BadRequestException,
  );

  const invalidThemeDatabase = createDatabase({
    theme: { findUnique: async () => null },
  }).database;
  await assert.rejects(
    () =>
      new ConfessionsService(invalidThemeDatabase, new SubmissionRateLimiter()).create(
        validDto(),
        'invalid-theme',
      ),
    BadRequestException,
  );

  const limitedService = new ConfessionsService(submission.database, new SubmissionRateLimiter());
  const controller = new ConfessionsController(limitedService);
  const previousLimit = process.env.SUBMISSION_RATE_LIMIT;
  process.env.SUBMISSION_RATE_LIMIT = '1';
  try {
    await controller.create(validDto(), { ip: 'direct-test-client' } as any);
    await assert.rejects(
      () => controller.create(validDto(), { ip: 'direct-test-client' } as any),
      (error: unknown) => error instanceof HttpException && error.getStatus() === 429,
    );
  } finally {
    if (previousLimit === undefined) delete process.env.SUBMISSION_RATE_LIMIT;
    else process.env.SUBMISSION_RATE_LIMIT = previousLimit;
  }

  const previousReportLimit = process.env.REPORT_RATE_LIMIT;
  const previousReportWindow = process.env.REPORT_RATE_WINDOW_SECONDS;
  process.env.REPORT_RATE_LIMIT = '1';
  process.env.REPORT_RATE_WINDOW_SECONDS = '3600';
  let reportCalls = 0;
  const reportController = new ConfessionsController({
    report: async () => {
      reportCalls += 1;
      return { status: 'RECEIVED' };
    },
  } as unknown as ConfessionsService);
  const reportHeaders: Record<string, string> = {};
  const reportResponse = {
    setHeader: (name: string, value: string) => (reportHeaders[name] = value),
  };
  try {
    await reportController.report(
      'published-1',
      { reason: 'SPAM' } as any,
      { ip: 'report-rate-limit-client' } as any,
      reportResponse as any,
    );
    assert.throws(
      () =>
        reportController.report(
          'published-1',
          { reason: 'SPAM' } as any,
          { ip: 'report-rate-limit-client' } as any,
          reportResponse as any,
        ),
      (error: unknown) => error instanceof HttpException && error.getStatus() === 429,
    );
    assert.equal(reportCalls, 1);
    assert.equal(reportHeaders['Retry-After'], '3600');
  } finally {
    if (previousReportLimit === undefined) delete process.env.REPORT_RATE_LIMIT;
    else process.env.REPORT_RATE_LIMIT = previousReportLimit;
    if (previousReportWindow === undefined) delete process.env.REPORT_RATE_WINDOW_SECONDS;
    else process.env.REPORT_RATE_WINDOW_SECONDS = previousReportWindow;
  }

  let receivedFeedStatus: ConfessionStatus | undefined;
  const feedDatabase = createDatabase({
    confession: {
      ...submission.database.confession,
      findMany: async ({ where }) => {
        receivedFeedStatus = where.status;
        return [publishedRecord];
      },
    },
  }).database;
  const feed = await new ConfessionsService(feedDatabase, new SubmissionRateLimiter()).list({
    page: 1,
    limit: 12,
  });
  assert.equal(receivedFeedStatus, ConfessionStatus.PUBLISHED);
  assert.deepEqual(
    feed.items.map((item) => item.publicId),
    ['published-1'],
  );
  assert.equal(feed.total, 1);

  const detailDatabase = createDatabase();
  const detailService = new ConfessionsService(
    detailDatabase.database,
    new SubmissionRateLimiter(),
  );
  assert.equal((await detailService.findPublished('published-1')).publicId, 'published-1');
  assert.equal(detailDatabase.getViewCountIncrements(), 1);
  await assert.rejects(() => detailService.findPublished('pending-1'), NotFoundException);
  assert.equal(detailDatabase.getViewCountIncrements(), 1);

  const valid = await import('class-validator').then(({ validate }) => validate(validDto()));
  assert.equal(valid.length, 0);
  const invalidCategory = await import('class-validator').then(({ validate }) =>
    validate(
      plainToInstance(CreateConfessionDto, {
        content: 'Still valid text',
        category: 'NOT_A_CATEGORY',
      }),
    ),
  );
  assert.ok(invalidCategory.some((error) => error.property === 'category'));
  const oversized = await import('class-validator').then(({ validate }) =>
    validate(plainToInstance(CreateConfessionDto, { content: 'x'.repeat(5001) })),
  );
  assert.ok(oversized.some((error) => error.property === 'content'));

  const reports: Array<Record<string, unknown>> = [];
  const reportDatabase = createDatabase({
    report: {
      findFirst: async () => null,
      create: async ({ data }) => {
        reports.push(data);
        return data;
      },
    },
  }).database;
  const reportService = new ConfessionsService(reportDatabase, new SubmissionRateLimiter());
  await assert.rejects(
    () => reportService.report('published-1', 'OTHER', 'reporter'),
    BadRequestException,
  );
  await assert.rejects(
    () => reportService.report('published-1', 'OTHER', 'reporter', ' '.repeat(3)),
    BadRequestException,
  );
  await assert.rejects(
    () => reportService.report('published-1', 'OTHER', 'reporter', 'x'.repeat(1001)),
    BadRequestException,
  );
  await reportService.report('published-1', 'OTHER', 'reporter', '  More context here  ');
  assert.deepEqual(reports[0], {
    confessionId: 'internal-1',
    reason: 'OTHER',
    details: 'More context here',
    reporterHash: '41d6d5322a9b546a16bdf2213c7e4b017bec5e4e13f31095b4bcfa09849b8732',
  });
  const normalReportDatabase = createDatabase({
    report: {
      findFirst: async () => null,
      create: async ({ data }) => {
        reports.push(data);
        return data;
      },
    },
  }).database;
  await new ConfessionsService(normalReportDatabase, new SubmissionRateLimiter()).report(
    'published-1',
    'SPAM',
    'normal-reporter',
  );
  assert.equal('details' in reports[1], false);

  const limiter = new SubmissionRateLimiter();
  assert.equal(limiter.check('student', 2, 60, 0).allowed, true);
  assert.equal(limiter.check('student', 2, 60, 1).allowed, true);
  const limited = limiter.check('student', 2, 60, 2);
  assert.equal(limited.allowed, false);
  assert.ok(limited.retryAfterSeconds > 0);
  assert.equal(limiter.check('student', 2, 60, 61_000).allowed, true);
  console.log('confessions: Phase 2 behavior tests passed');
}

void run();
