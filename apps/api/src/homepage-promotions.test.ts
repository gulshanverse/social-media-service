import 'reflect-metadata';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { AdminRole, HomepagePromotionStatus } from '@prisma/client';
import sharp from 'sharp';
import {
  AdminHomepagePromotionsController,
  inspectPromotionImage,
} from './homepage-promotions.module';
import {
  derivePromotionState,
  isSupportedBuiltinThemeId,
  normalizePromotionLayout,
  promotionThemeAvailability,
  safePromotionDestination,
  HomepagePromotionsService,
} from './homepage-promotions.service';
import { PERMISSION_CATALOG, PERMISSIONS, effectivePermissionKeys } from './permissions';
import { prisma, setPrismaForTests } from './admin-auth';

function memoryDatabase() {
  const rows = new Map<string, Record<string, any>>();
  const themes = new Map<string, Record<string, any>>([
    [
      'published-theme',
      {
        id: 'published-theme',
        status: 'PUBLISHED',
        startAt: null,
        endAt: null,
        slug: 'published-theme',
        name: 'Published Theme',
        background: '#101828',
        gradient: 'linear-gradient(#101828,#344054)',
        textColor: '#fff',
        accentColor: '#c8ff00',
        fontFamily: 'Inter',
        radius: 24,
        borderStyle: 'solid',
        logoVisibility: true,
        handleVisibility: true,
        layoutVariant: 'classic',
        tokens: {},
      },
    ],
    [
      'draft-theme',
      {
        id: 'draft-theme',
        status: 'DRAFT',
        startAt: null,
        endAt: null,
        slug: 'draft-theme',
        name: 'Draft Theme',
        background: '#101828',
        gradient: 'linear-gradient(#101828,#344054)',
        textColor: '#fff',
        accentColor: '#c8ff00',
        fontFamily: 'Inter',
        radius: 24,
        borderStyle: 'solid',
        logoVisibility: true,
        handleVisibility: true,
        layoutVariant: 'classic',
        tokens: {},
      },
    ],
    [
      'expired-theme',
      {
        id: 'expired-theme',
        status: 'PUBLISHED',
        startAt: null,
        endAt: new Date(Date.now() - 60_000),
        slug: 'expired-theme',
        name: 'Expired Theme',
        background: '#101828',
        gradient: 'linear-gradient(#101828,#344054)',
        textColor: '#fff',
        accentColor: '#c8ff00',
        fontFamily: 'Inter',
        radius: 24,
        borderStyle: 'solid',
        logoVisibility: true,
        handleVisibility: true,
        layoutVariant: 'classic',
        tokens: {},
      },
    ],
    [
      'scheduled-theme',
      {
        id: 'scheduled-theme',
        status: 'SCHEDULED',
        startAt: new Date(Date.now() + 60_000),
        endAt: null,
        slug: 'scheduled-theme',
        name: 'Scheduled Theme',
        background: '#101828',
        gradient: 'linear-gradient(#101828,#344054)',
        textColor: '#fff',
        accentColor: '#c8ff00',
        fontFamily: 'Inter',
        radius: 24,
        borderStyle: 'solid',
        logoVisibility: true,
        handleVisibility: true,
        layoutVariant: 'classic',
        tokens: {},
      },
    ],
  ]);
  const audits: Record<string, any>[] = [];
  let sequence = 0;
  const orderRows = (items: Record<string, any>[], orderBy: Record<string, string>[]) =>
    [...items].sort((left, right) => {
      for (const order of orderBy) {
        const field = Object.keys(order)[0];
        const direction = order[field] === 'desc' ? -1 : 1;
        const a = left[field] instanceof Date ? left[field].getTime() : left[field];
        const b = right[field] instanceof Date ? right[field].getTime() : right[field];
        if (a < b) return -1 * direction;
        if (a > b) return 1 * direction;
      }
      return 0;
    });
  const matchesWhere = (item: Record<string, any>, where: Record<string, any> = {}) => {
    if (where.id?.in && !where.id.in.includes(item.id)) return false;
    if (where.id?.not && where.id.not === item.id) return false;
    if (where.status && item.status !== where.status) return false;
    if (
      where.OR?.length &&
      !where.OR.some((condition: Record<string, string>) =>
        Object.entries(condition).some(([key, value]) => item[key] === value),
      )
    )
      return false;
    if (where.AND?.length) {
      const now = new Date();
      if (item.status !== HomepagePromotionStatus.PUBLISHED) return false;
      if (item.startAt && item.startAt > now) return false;
      if (item.endAt && item.endAt <= now) return false;
    }
    return true;
  };
  const project = (item: Record<string, any>, select?: Record<string, boolean>) =>
    select
      ? Object.fromEntries(
          Object.keys(select)
            .filter((key) => select[key])
            .map((key) => [key, item[key]]),
        )
      : { ...item };
  const fake = {
    homepagePromotion: {
      findMany: async (args: Record<string, any> = {}) => {
        let items = [...rows.values()].filter((item) => matchesWhere(item, args.where));
        if (args.orderBy) items = orderRows(items, args.orderBy);
        const start = args.skip ?? 0;
        items = items.slice(start, start + (args.take ?? items.length));
        return items.map((item) => project(item, args.select));
      },
      findUnique: async ({ where }: { where: { id: string } }) => rows.get(where.id) ?? null,
      findFirst: async ({ where }: { where: Record<string, any> }) =>
        [...rows.values()].find((item) => matchesWhere(item, where)) ?? null,
      count: async () => rows.size,
      create: async ({ data }: { data: Record<string, any> }) => {
        sequence += 1;
        const now = new Date();
        const item = { id: `promotion-${sequence}`, createdAt: now, updatedAt: now, ...data };
        rows.set(item.id, item);
        return item;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, any> }) => {
        const current = rows.get(where.id);
        if (!current) throw new Error('record missing');
        const item: Record<string, any> = { ...current, ...data, updatedAt: new Date() };
        rows.set(item.id, item);
        return item;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const current = rows.get(where.id);
        if (!current) throw new Error('record missing');
        rows.delete(where.id);
        return current;
      },
    },
    theme: {
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: Record<string, boolean>;
      }) => {
        const theme = themes.get(where.id) ?? null;
        return theme && select ? project(theme, select) : theme;
      },
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, any> }) => {
        audits.push(data);
        return data;
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  };
  return { client: fake, rows, audits, themes };
}

async function serviceMutationTests() {
  const realPrisma = prisma;
  const previousBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const memory = memoryDatabase();
  setPrismaForTests(memory.client as never);
  try {
    const service = new HomepagePromotionsService();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const first = await service.create(
      {
        title: 'Scheduled campaign',
        desktopImageUrl: 'https://blob.example/college-confession/promotions/first.webp',
        desktopImageKey: 'college-confession/promotions/first.webp',
        status: HomepagePromotionStatus.PUBLISHED,
        startAt: future,
        endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
      'admin-1',
    );
    const backgroundOnly = await service.create(
      { title: 'Background-only campaign', backgroundPreset: 'ocean' },
      'admin-1',
    );
    assert.equal(backgroundOnly.desktopImageUrl, null);
    assert.equal(backgroundOnly.backgroundPreset, 'ocean');
    const themed = await service.create(
      { title: 'Published theme campaign', themeId: 'db:published-theme' },
      'admin-1',
    );
    assert.equal(themed.themeId, 'db:published-theme');
    await assert.rejects(
      () =>
        service.create(
          { title: 'Unknown built-in', themeId: 'builtin:not-a-real-theme' },
          'admin-1',
        ),
      (error) => error instanceof BadRequestException,
    );
    await assert.rejects(
      () =>
        service.create({ title: 'Missing database theme', themeId: 'db:missing-theme' }, 'admin-1'),
      (error) => error instanceof BadRequestException,
    );
    const draftThemeCampaign = await service.create(
      { title: 'Draft theme campaign', themeId: 'db:draft-theme' },
      'admin-1',
    );
    await assert.rejects(
      () => service.publish(draftThemeCampaign.id, 'admin-1'),
      (error) => error instanceof BadRequestException,
    );
    await assert.rejects(
      () => service.create({ title: 'Unknown preset', backgroundPreset: 'neon' }, 'admin-1'),
      (error) => error instanceof BadRequestException,
    );
    const second = await service.create(
      {
        title: 'Active campus event',
        desktopImageUrl: 'https://blob.example/college-confession/promotions/second.webp',
        desktopImageKey: 'college-confession/promotions/second.webp',
        destinationUrl: '/events',
        status: HomepagePromotionStatus.PUBLISHED,
        priority: 1,
        endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      'admin-1',
    );
    const publishedThemeCampaign = await service.create(
      {
        title: 'Published theme update guard',
        themeId: 'db:published-theme',
        status: HomepagePromotionStatus.PUBLISHED,
      },
      'admin-1',
    );
    for (const themeId of [
      'db:draft-theme',
      'db:expired-theme',
      'db:scheduled-theme',
      'db:missing-theme',
    ]) {
      await assert.rejects(
        () => service.update(publishedThemeCampaign.id, { themeId }, 'admin-1'),
        (error) => error instanceof BadRequestException,
        `published promotion should reject ${themeId} when status is omitted`,
      );
    }
    assert.equal(
      (await service.update(publishedThemeCampaign.id, { title: 'Still live' }, 'admin-1')).status,
      HomepagePromotionStatus.PUBLISHED,
    );
    assert.equal(first.state, 'SCHEDULED');
    const publicItems = await service.publicPromotions();
    assert.deepEqual(
      publicItems.map((item) => item.title),
      ['Active campus event', 'Still live'],
    );
    for (const field of [
      'desktopImageKey',
      'mobileImageKey',
      'status',
      'priority',
      'createdById',
      'updatedById',
      'startAt',
      'endAt',
    ]) {
      assert.equal(field in publicItems[0], false);
    }
    assert.deepEqual(Object.keys(publicItems[0].theme).sort(), [
      'accentColor',
      'background',
      'fontFamily',
      'gradient',
      'id',
      'name',
      'radius',
      'textColor',
    ]);

    const edited = await service.update(
      second.id,
      {
        title: 'Updated campus event',
        description: 'Open to all students.',
      },
      'admin-1',
    );
    assert.equal(edited.title, 'Updated campus event');
    assert.equal((await service.get(second.id)).description, 'Open to all students.');
    assert.equal((await service.list()).items.length, 6);

    const draft = await service.create(
      {
        title: 'Later draft',
        desktopImageUrl: 'https://blob.example/college-confession/promotions/draft.webp',
        desktopImageKey: 'college-confession/promotions/draft.webp',
      },
      'admin-1',
    );
    assert.equal(
      (await service.publish(draft.id, 'admin-1')).status,
      HomepagePromotionStatus.PUBLISHED,
    );
    assert.equal((await service.unpublish(draft.id, 'admin-1')).state, 'DRAFT');

    const reordered = await service.reorder({ ids: [second.id, first.id] }, 'admin-1');
    assert.deepEqual(
      reordered.items.slice(0, 2).map(({ id }) => id),
      [second.id, first.id],
    );
    assert.deepEqual(
      reordered.items.slice(0, 2).map(({ priority }) => priority),
      [2, 1],
    );

    const expired = await service.update(
      second.id,
      {
        endAt: new Date(Date.now() - 1000).toISOString(),
      },
      'admin-1',
    );
    assert.equal(expired.state, 'EXPIRED');
    assert.deepEqual(
      (await service.publicPromotions()).map((item) => item.title),
      ['Still live'],
    );
    const fallbackCampaign = await service.create(
      {
        title: 'Fallback campaign',
        themeId: 'db:published-theme',
        status: HomepagePromotionStatus.PUBLISHED,
      },
      'admin-1',
    );
    memory.themes.delete('published-theme');
    const fallbackItems = await service.publicPromotions();
    assert.equal(fallbackItems.find((item) => item.id === fallbackCampaign.id)?.theme.id, 'aurora');
    await assert.rejects(
      () =>
        service.create(
          {
            title: 'Invalid schedule',
            desktopImageUrl: 'https://blob.example/college-confession/promotions/invalid.webp',
            desktopImageKey: 'college-confession/promotions/invalid.webp',
            startAt: new Date(Date.now() + 60_000).toISOString(),
            endAt: new Date(Date.now() + 30_000).toISOString(),
          },
          'admin-1',
        ),
      (error) => error instanceof BadRequestException,
    );
    await assert.rejects(
      () =>
        service.create(
          {
            title: 'Invalid asset path',
            desktopImageUrl: 'https://example.com/promo.webp',
            desktopImageKey: 'external/promo.webp',
          },
          'admin-1',
        ),
      (error) => error instanceof BadRequestException,
    );
    assert.equal((await service.delete(draft.id, 'admin-1')).deleted, true);
    assert.equal(memory.rows.has(draft.id), false);
    assert.equal(memory.audits.length, 15);
  } finally {
    setPrismaForTests(realPrisma);
    if (previousBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = previousBlobToken;
  }
}

async function main() {
  await serviceMutationTests();
  const now = new Date('2026-11-07T00:00:00.000Z');
  assert.equal(isSupportedBuiltinThemeId('midnight'), true);
  assert.equal(isSupportedBuiltinThemeId('not-a-real-theme'), false);
  assert.equal(promotionThemeAvailability({ status: 'DRAFT' }, now), 'DRAFT');
  assert.equal(
    promotionThemeAvailability(
      {
        status: 'SCHEDULED',
        startAt: new Date('2026-11-08T00:00:00.000Z'),
        endAt: new Date('2026-11-09T00:00:00.000Z'),
      },
      now,
    ),
    'SCHEDULED',
  );
  assert.equal(
    promotionThemeAvailability(
      {
        status: 'SCHEDULED',
        startAt: new Date('2026-11-06T00:00:00.000Z'),
        endAt: new Date('2026-11-09T00:00:00.000Z'),
      },
      now,
    ),
    'AVAILABLE',
  );
  assert.equal(
    promotionThemeAvailability(
      { status: 'PUBLISHED', startAt: null, endAt: new Date('2026-11-06T00:00:00.000Z') },
      now,
    ),
    'EXPIRED',
  );
  assert.throws(
    () => normalizePromotionLayout({ alignment: 'diagonal' }),
    (error) => error instanceof BadRequestException,
  );
  assert.throws(
    () => normalizePromotionLayout({ headingSize: 5.6 }),
    (error) => error instanceof BadRequestException,
  );
  assert.throws(
    () => normalizePromotionLayout('malformed'),
    (error) => error instanceof BadRequestException,
  );
  assert.equal(
    derivePromotionState(
      { status: HomepagePromotionStatus.DRAFT, startAt: null, endAt: null },
      now,
    ),
    'DRAFT',
  );
  assert.equal(
    derivePromotionState(
      { status: HomepagePromotionStatus.DISABLED, startAt: null, endAt: null },
      now,
    ),
    'DISABLED',
  );
  assert.equal(
    derivePromotionState(
      {
        status: HomepagePromotionStatus.PUBLISHED,
        startAt: new Date('2026-11-08T00:00:00.000Z'),
        endAt: new Date('2026-11-09T00:00:00.000Z'),
      },
      now,
    ),
    'SCHEDULED',
  );
  assert.equal(
    derivePromotionState(
      {
        status: HomepagePromotionStatus.PUBLISHED,
        startAt: null,
        endAt: new Date('2026-11-06T23:59:59.000Z'),
      },
      now,
    ),
    'EXPIRED',
  );
  assert.equal(
    derivePromotionState(
      {
        status: HomepagePromotionStatus.PUBLISHED,
        startAt: new Date('2026-11-06T23:59:59.000Z'),
        endAt: new Date('2026-11-08T00:00:00.000Z'),
      },
      now,
    ),
    'PUBLISHED',
  );

  assert.equal(safePromotionDestination('/events/campus-night'), '/events/campus-night');
  assert.equal(
    safePromotionDestination('https://events.example/campus-night'),
    'https://events.example/campus-night',
  );
  for (const value of [
    'javascript:alert(1)',
    'http://events.example',
    '//events.example',
    '/\\events.example',
    'https://user:pass@events.example',
    '/bad\u0000path',
  ]) {
    assert.throws(
      () => safePromotionDestination(value),
      (error) => error instanceof BadRequestException,
    );
  }
  assert.equal(safePromotionDestination('  '), null);

  assert.deepEqual(
    PERMISSION_CATALOG.find(({ key }) => key === PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE),
    {
      key: 'homepage-promotions.manage',
      description: 'Manage homepage promotions',
      reserved: false,
    },
  );
  assert.equal(
    effectivePermissionKeys(AdminRole.DESIGNER, [], []).includes(
      PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE,
    ),
    true,
  );
  assert.deepEqual(Reflect.getMetadata('roles', AdminHomepagePromotionsController), [
    AdminRole.SUPER_ADMIN,
    AdminRole.DESIGNER,
  ]);
  const promotionControllerPrototype =
    AdminHomepagePromotionsController.prototype as unknown as Record<string, object>;
  for (const method of [
    'list',
    'get',
    'create',
    'update',
    'reorder',
    'publish',
    'unpublish',
    'delete',
    'upload',
  ]) {
    assert.deepEqual(
      Reflect.getMetadata('permissions', promotionControllerPrototype[method]),
      [PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE],
      `${method} must require the promotions permission`,
    );
  }

  const validPng = await sharp({
    create: { width: 16, height: 12, channels: 3, background: { r: 72, g: 34, b: 98 } },
  })
    .png()
    .toBuffer();
  assert.deepEqual(await inspectPromotionImage(validPng), {
    format: 'png',
    mimeType: 'image/png',
    extension: 'png',
    width: 16,
    height: 12,
  });
  await assert.rejects(
    () => inspectPromotionImage(Buffer.from('this is not an image')),
    (error) => error instanceof BadRequestException,
  );

  console.log('homepage promotion validation and access tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
