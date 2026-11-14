import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HomepagePromotionStatus, Prisma } from '@prisma/client';
import { del } from '@vercel/blob';
import { prisma, recordAudit } from './admin-auth';
import type {
  CreateHomepagePromotionDto,
  ReorderHomepagePromotionsDto,
  UpdateHomepagePromotionDto,
} from './homepage-promotions.dto';

const ASSET_PREFIX = 'college-confession/promotions/';
export const HOMEPAGE_PROMOTION_PRESETS = ['aurora', 'sunset', 'ocean', 'midnight'] as const;
type HomepagePromotionPreset = (typeof HOMEPAGE_PROMOTION_PRESETS)[number];
function validateBackgroundPreset(value?: string | null): HomepagePromotionPreset {
  const preset = value || 'aurora';
  if (!(HOMEPAGE_PROMOTION_PRESETS as readonly string[]).includes(preset))
    throw new BadRequestException('Choose a valid built-in promotion background.');
  return preset as HomepagePromotionPreset;
}
function validateArtwork(url?: string | null, key?: string | null, preset?: string | null) {
  if (Boolean(url) !== Boolean(key))
    throw new BadRequestException('Upload both parts of the desktop poster image.');
  validateBackgroundPreset(preset);
  if (url && key) validateImageReference(url, key);
}

type PromotionRecord = Prisma.HomepagePromotionGetPayload<Record<string, never>>;

export type HomepagePromotionState = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED' | 'DISABLED';

export function derivePromotionState(
  promotion: Pick<PromotionRecord, 'status' | 'startAt' | 'endAt'>,
  now = new Date(),
): HomepagePromotionState {
  if (promotion.status === HomepagePromotionStatus.DRAFT) return 'DRAFT';
  if (promotion.status === HomepagePromotionStatus.DISABLED) return 'DISABLED';
  if (promotion.endAt && promotion.endAt.getTime() <= now.getTime()) return 'EXPIRED';
  if (promotion.startAt && promotion.startAt.getTime() > now.getTime()) return 'SCHEDULED';
  return 'PUBLISHED';
}

export function safePromotionDestination(value?: string | null): string | null {
  if (value == null || value.trim() === '') return null;
  const destination = value.trim();
  if (/^[\\/]{2}/.test(destination) || /[\\\u0000-\u001f\u007f]/.test(destination)) {
    throw new BadRequestException('Use a site path or a secure HTTPS destination.');
  }
  if (destination.startsWith('/')) return destination;
  let parsed: URL;
  try {
    parsed = new URL(destination);
  } catch {
    throw new BadRequestException('Use a site path or a secure HTTPS destination.');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new BadRequestException('External promotion links must use HTTPS.');
  }
  return destination;
}

function validateDateRange(startAt?: Date | null, endAt?: Date | null) {
  if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
    throw new BadRequestException('The end date must be later than the start date.');
  }
}

function validateImageReference(url: string, key: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('Upload the poster through the image uploader.');
  }
  let path: string;
  try {
    path = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
  } catch {
    throw new BadRequestException('Upload the poster through the image uploader.');
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !key.startsWith(ASSET_PREFIX) ||
    path !== key
  ) {
    throw new BadRequestException('Upload the poster through the image uploader.');
  }
}

@Injectable()
export class HomepagePromotionsService {
  async publicPromotions(now = new Date()) {
    const promotions = await prisma.homepagePromotion.findMany({
      where: {
        status: HomepagePromotionStatus.PUBLISHED,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gt: now } }] },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        badgeText: true,
        desktopImageUrl: true,
        mobileImageUrl: true,
        backgroundPreset: true,
        imageAlt: true,
        ctaLabel: true,
        destinationUrl: true,
      },
    });
    return promotions;
  }

  async list(page = 1, limit = 50) {
    const safePage = Math.min(1000, Math.max(1, page));
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [items, total] = await Promise.all([
      prisma.homepagePromotion.findMany({
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.homepagePromotion.count(),
    ]);
    const now = new Date();
    return {
      items: items.map((item) => this.adminProjection(item, now)),
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: safePage * safeLimit < total,
    };
  }

  async get(id: string) {
    const item = await prisma.homepagePromotion.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Homepage promotion not found.');
    return this.adminProjection(item);
  }

  async create(body: CreateHomepagePromotionDto, actorId: string) {
    const title = body.title.trim();
    if (!title) throw new BadRequestException('Enter a promotion title.');
    validateArtwork(body.desktopImageUrl, body.desktopImageKey, body.backgroundPreset);
    if (body.mobileImageUrl || body.mobileImageKey) {
      if (!body.mobileImageUrl || !body.mobileImageKey)
        throw new BadRequestException('Upload both parts of the mobile poster image.');
      validateImageReference(body.mobileImageUrl, body.mobileImageKey);
    }
    const destinationUrl = safePromotionDestination(body.destinationUrl);
    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;
    validateDateRange(startAt, endAt);
    const item = await prisma.homepagePromotion.create({
      data: {
        title,
        description: body.description?.trim() || null,
        badgeText: body.badgeText?.trim() || null,
        desktopImageUrl: body.desktopImageUrl ?? null,
        desktopImageKey: body.desktopImageKey ?? null,
        backgroundPreset: validateBackgroundPreset(body.backgroundPreset),
        mobileImageUrl: body.mobileImageUrl ?? null,
        mobileImageKey: body.mobileImageKey ?? null,
        imageAlt: body.imageAlt?.trim() || null,
        ctaLabel: body.ctaLabel?.trim() || null,
        destinationUrl,
        status: body.status ?? HomepagePromotionStatus.DRAFT,
        priority: body.priority ?? 0,
        startAt,
        endAt,
        createdById: actorId,
        updatedById: actorId,
      },
    });
    await recordAudit(actorId, 'HOMEPAGE_PROMOTION_CREATED', 'HOMEPAGE_PROMOTION', item.id, {
      status: item.status,
    });
    return this.adminProjection(item);
  }

  async update(id: string, body: UpdateHomepagePromotionDto, actorId: string) {
    const current = await prisma.homepagePromotion.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Homepage promotion not found.');
    const data: Prisma.HomepagePromotionUncheckedUpdateInput = { updatedById: actorId };
    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) throw new BadRequestException('Enter a promotion title.');
      data.title = title;
    }
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.badgeText !== undefined) data.badgeText = body.badgeText?.trim() || null;
    if (body.imageAlt !== undefined) data.imageAlt = body.imageAlt?.trim() || null;
    if (body.ctaLabel !== undefined) data.ctaLabel = body.ctaLabel?.trim() || null;
    if (body.destinationUrl !== undefined)
      data.destinationUrl = safePromotionDestination(body.destinationUrl);
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    const nextUrl =
      body.desktopImageUrl === undefined ? current.desktopImageUrl : body.desktopImageUrl;
    const nextKey =
      body.desktopImageKey === undefined ? current.desktopImageKey : body.desktopImageKey;
    const nextPreset =
      body.backgroundPreset === undefined ? current.backgroundPreset : body.backgroundPreset;
    if (
      body.desktopImageUrl !== undefined ||
      body.desktopImageKey !== undefined ||
      body.backgroundPreset !== undefined
    ) {
      validateArtwork(nextUrl, nextKey, nextPreset);
      data.desktopImageUrl = nextUrl;
      data.desktopImageKey = nextKey;
      data.backgroundPreset = validateBackgroundPreset(nextPreset);
    }
    if (body.mobileImageUrl !== undefined || body.mobileImageKey !== undefined) {
      const nextUrl = body.mobileImageUrl ?? null;
      const nextKey = body.mobileImageKey ?? null;
      if (nextUrl || nextKey) {
        if (!nextUrl || !nextKey)
          throw new BadRequestException('Upload both parts of the mobile poster image.');
        validateImageReference(nextUrl, nextKey);
      }
      data.mobileImageUrl = nextUrl;
      data.mobileImageKey = nextKey;
    }
    const startAt =
      body.startAt === undefined ? current.startAt : body.startAt ? new Date(body.startAt) : null;
    const endAt =
      body.endAt === undefined ? current.endAt : body.endAt ? new Date(body.endAt) : null;
    validateDateRange(startAt, endAt);
    if (body.startAt !== undefined) data.startAt = startAt;
    if (body.endAt !== undefined) data.endAt = endAt;

    const updated = await prisma.homepagePromotion.update({ where: { id }, data });
    await recordAudit(actorId, 'HOMEPAGE_PROMOTION_UPDATED', 'HOMEPAGE_PROMOTION', id, {
      status: updated.status,
    });
    await this.cleanupAssets([current.desktopImageUrl, current.mobileImageUrl], id, [
      updated.desktopImageUrl,
      updated.mobileImageUrl,
    ]);
    return this.adminProjection(updated);
  }

  async publish(id: string, actorId: string) {
    return this.setStatus(id, HomepagePromotionStatus.PUBLISHED, actorId);
  }

  async unpublish(id: string, actorId: string) {
    return this.setStatus(id, HomepagePromotionStatus.DRAFT, actorId);
  }

  private async setStatus(id: string, status: HomepagePromotionStatus, actorId: string) {
    const current = await prisma.homepagePromotion.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Homepage promotion not found.');
    const item = await prisma.homepagePromotion.update({
      where: { id },
      data: { status, updatedById: actorId },
    });
    await recordAudit(actorId, `HOMEPAGE_PROMOTION_${status}`, 'HOMEPAGE_PROMOTION', id);
    return this.adminProjection(item);
  }

  async reorder(body: ReorderHomepagePromotionsDto, actorId: string) {
    const ids = body.ids;
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Promotion IDs must be unique.');
    const existing = await prisma.homepagePromotion.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (existing.length !== ids.length)
      throw new BadRequestException('The promotion order contains an unknown ID.');
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.homepagePromotion.update({
          where: { id },
          data: { priority: ids.length - index, updatedById: actorId },
        }),
      ),
    );
    await recordAudit(actorId, 'HOMEPAGE_PROMOTIONS_REORDERED', 'HOMEPAGE_PROMOTION', 'list', {
      count: ids.length,
    });
    return this.list(1, 100);
  }

  async delete(id: string, actorId: string) {
    const current = await prisma.homepagePromotion.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Homepage promotion not found.');
    await prisma.homepagePromotion.delete({ where: { id } });
    await recordAudit(actorId, 'HOMEPAGE_PROMOTION_DELETED', 'HOMEPAGE_PROMOTION', id);
    await this.cleanupAssets([current.desktopImageUrl, current.mobileImageUrl]);
    return { id, deleted: true };
  }

  private adminProjection(item: PromotionRecord, now = new Date()) {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      badgeText: item.badgeText,
      desktopImageUrl: item.desktopImageUrl,
      desktopImageKey: item.desktopImageKey,
      backgroundPreset: item.backgroundPreset,
      mobileImageUrl: item.mobileImageUrl,
      mobileImageKey: item.mobileImageKey,
      imageAlt: item.imageAlt,
      ctaLabel: item.ctaLabel,
      destinationUrl: item.destinationUrl,
      status: item.status,
      state: derivePromotionState(item, now),
      priority: item.priority,
      startAt: item.startAt,
      endAt: item.endAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async cleanupAssets(
    urls: Array<string | null>,
    excludedPromotionId?: string,
    retainedUrls: Array<string | null> = [],
  ) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return;
    for (const url of new Set(urls.filter((value): value is string => Boolean(value)))) {
      if (retainedUrls.includes(url)) continue;
      let path = '';
      try {
        const parsed = new URL(url);
        path = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
      } catch {
        continue;
      }
      if (!path.startsWith(ASSET_PREFIX)) continue;
      const inUse = await prisma.homepagePromotion.findFirst({
        where: {
          ...(excludedPromotionId ? { id: { not: excludedPromotionId } } : {}),
          OR: [{ desktopImageUrl: url }, { mobileImageUrl: url }],
        },
        select: { id: true },
      });
      if (inUse) continue;
      try {
        await del(url, { token });
      } catch {
        // A leftover public blob is preferable to deleting an asset used by another record.
      }
    }
  }
}
