import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HomepagePromotionStatus, Prisma, ThemeStatus } from '@prisma/client';
import { del } from '@vercel/blob';
import { garbaThemes, normalizeImportedTheme, normalizeTheme, themePresets, themes } from '@ggv/themes';
import type { PromotionLayoutSettings } from '@ggv/types';
import { prisma, recordAudit } from './admin-auth';
import type {
  CreateHomepagePromotionDto,
  ReorderHomepagePromotionsDto,
  UpdateHomepagePromotionDto,
} from './homepage-promotions.dto';

const ASSET_PREFIX = 'college-confession/promotions/';
export const HOMEPAGE_PROMOTION_PRESETS = ['aurora', 'sunset', 'ocean', 'midnight'] as const;
type HomepagePromotionPreset = (typeof HOMEPAGE_PROMOTION_PRESETS)[number];
const LEGACY_THEMES = {
  aurora: { id: 'aurora', name: 'Aurora', background: '#171b38', gradient: 'linear-gradient(120deg,#171b38,#5266c5 48%,#ef6fc4)', textColor: '#fff', accentColor: '#b8f1ff', fontFamily: 'Inter', radius: '24px' },
  sunset: { id: 'sunset', name: 'Sunset', background: '#54203e', gradient: 'linear-gradient(125deg,#54203e,#e45b68 48%,#ffb35c)', textColor: '#fff', accentColor: '#ffd36e', fontFamily: 'Poppins', radius: '24px' },
  ocean: { id: 'ocean', name: 'Ocean', background: '#052b50', gradient: 'linear-gradient(125deg,#052b50,#087da9 54%,#4ed4d1)', textColor: '#fff', accentColor: '#7ef7dc', fontFamily: 'Inter', radius: '24px' },
  midnight: { id: 'midnight', name: 'Midnight', background: '#090c21', gradient: 'linear-gradient(125deg,#090c21,#211447 52%,#5d275c)', textColor: '#fff', accentColor: '#c36cff', fontFamily: 'Inter', radius: '24px' },
} as const;
export const DEFAULT_PROMOTION_LAYOUT: PromotionLayoutSettings = {
  version: 1,
  mode: 'auto',
  headingFont: 'inherit',
  bodyFont: 'inherit',
  headingSize: 3.2,
  descriptionSize: 1,
  headingWeight: 800,
  descriptionWeight: 500,
  headingLineHeight: 1.02,
  descriptionLineHeight: 1.45,
  letterSpacing: 'tight',
  headingTransform: 'none',
  alignment: 'left',
  horizontalPosition: 'left',
  verticalPosition: 'bottom',
  contentWidth: 'standard',
  padding: 'comfortable',
  spacing: 'comfortable',
};
const LAYOUT_ENUMS = {
  mode: ['auto', 'manual'], headingFont: ['inherit', 'Inter', 'Poppins', 'Space Grotesk', 'DM Sans', 'Georgia'],
  bodyFont: ['inherit', 'Inter', 'Poppins', 'Space Grotesk', 'DM Sans', 'Georgia'], headingWeight: [500, 600, 700, 800], descriptionWeight: [400, 500, 600, 700],
  letterSpacing: ['tight', 'normal', 'wide'], headingTransform: ['none', 'uppercase', 'capitalize'], alignment: ['left', 'center', 'right'],
  horizontalPosition: ['left', 'center', 'right'], verticalPosition: ['top', 'center', 'bottom'], contentWidth: ['narrow', 'standard', 'wide'], padding: ['compact', 'comfortable', 'airy'], spacing: ['compact', 'comfortable', 'airy'],
} as const;
export function normalizePromotionLayout(input: unknown): PromotionLayoutSettings {
  if (input !== undefined && input !== null && (typeof input !== 'object' || Array.isArray(input)))
    throw new BadRequestException('Promotion layout must be an object.');
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const result = { ...DEFAULT_PROMOTION_LAYOUT } as Record<string, unknown>;
  for (const key of Object.keys(source)) if (!(key in DEFAULT_PROMOTION_LAYOUT)) throw new BadRequestException(`Invalid promotion layout ${key}.`);
  for (const [key, value] of Object.entries(source)) if (value !== undefined) result[key] = value;
  if (result.version !== 1) throw new BadRequestException('Unsupported promotion layout version.');
  for (const [key, values] of Object.entries(LAYOUT_ENUMS)) if (!(values as readonly unknown[]).includes(result[key])) throw new BadRequestException(`Invalid promotion layout ${key}.`);
  for (const [key, min, max] of [['headingSize', 1.4, 5.5], ['descriptionSize', 0.7, 2], ['headingLineHeight', 0.8, 1.5], ['descriptionLineHeight', 1.1, 2]] as const) {
    if (typeof result[key] !== 'number' || result[key] < min || result[key] > max) throw new BadRequestException(`Invalid promotion layout ${key}.`);
  }
  return result as PromotionLayoutSettings;
}
function registryTheme(id: string) {
  if (id in LEGACY_THEMES) return LEGACY_THEMES[id as HomepagePromotionPreset];
  const direct = [...themes, ...garbaThemes].find((theme) => theme.id === id);
  if (direct) return normalizeTheme({ ...direct, slug: direct.id });
  const preset = themePresets.find((theme) => theme.slug === id);
  if (preset) return normalizeImportedTheme(preset).normalized;
  return LEGACY_THEMES.midnight;
}
const SUPPORTED_BUILTIN_THEME_IDS = new Set<string>([
  ...HOMEPAGE_PROMOTION_PRESETS,
  ...themes.map((theme) => theme.id),
  ...garbaThemes.map((theme) => theme.id),
  ...themePresets.map((theme) => theme.slug),
]);
export function isSupportedBuiltinThemeId(id: string) {
  return SUPPORTED_BUILTIN_THEME_IDS.has(id);
}
export type PromotionThemeAvailability = 'AVAILABLE' | 'DRAFT' | 'SCHEDULED' | 'EXPIRED' | 'MISSING';
export function promotionThemeAvailability(
  theme: { status: ThemeStatus | string; startAt?: Date | null; endAt?: Date | null } | null,
  now = new Date(),
): PromotionThemeAvailability {
  if (!theme) return 'MISSING';
  if (theme.status === ThemeStatus.DRAFT) return 'DRAFT';
  if (theme.endAt && theme.endAt <= now) return 'EXPIRED';
  if (theme.startAt && theme.startAt > now) return 'SCHEDULED';
  if (theme.status === ThemeStatus.SCHEDULED) return theme.startAt ? 'AVAILABLE' : 'SCHEDULED';
  return theme.status === ThemeStatus.ACTIVE || theme.status === ThemeStatus.PUBLISHED
    ? 'AVAILABLE'
    : 'MISSING';
}
function publicTheme(theme: any) {
  const normalized = normalizeTheme({ ...theme, slug: theme.id ?? theme.slug, tokens: theme.tokens ?? undefined });
  return { id: normalized.slug, name: normalized.name, background: normalized.background, gradient: normalized.gradient, textColor: normalized.textColor, accentColor: normalized.accentColor, fontFamily: normalized.fontFamily, radius: `${normalized.radius}px` };
}
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
        themeId: true,
        layoutSettings: true,
        imageAlt: true,
        ctaLabel: true,
        destinationUrl: true,
      },
    });
    return Promise.all(promotions.map(async (promotion) => ({
      ...promotion,
      theme: await this.resolveTheme(promotion.themeId, promotion.backgroundPreset, now),
      layoutSettings: normalizePromotionLayout(promotion.layoutSettings),
    })));
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
    const themeId = await this.validateThemeId(body.themeId);
    if (body.status === HomepagePromotionStatus.PUBLISHED) await this.assertThemeEligible(themeId);
    const layoutSettings = normalizePromotionLayout(body.layoutSettings);
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
        themeId,
        layoutSettings,
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
    if (body.themeId !== undefined) data.themeId = await this.validateThemeId(body.themeId);
    if (body.layoutSettings !== undefined) data.layoutSettings = normalizePromotionLayout(body.layoutSettings);
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
    if (body.status === HomepagePromotionStatus.PUBLISHED) {
      await this.assertThemeEligible((data.themeId as string | null | undefined) ?? current.themeId);
    }
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
    if (status === HomepagePromotionStatus.PUBLISHED) await this.assertThemeEligible(current.themeId);
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
      themeId: item.themeId,
      layoutSettings: normalizePromotionLayout(item.layoutSettings),
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

  private async validateThemeId(value?: string | null) {
    if (!value) return null;
    if (value.startsWith('builtin:')) {
      const id = value.slice('builtin:'.length);
      if (!isSupportedBuiltinThemeId(id)) throw new BadRequestException('Invalid built-in promotion theme.');
      return value;
    }
    if (value.includes(':') && !value.startsWith('db:')) throw new BadRequestException('Invalid promotion theme reference.');
    const id = value.startsWith('db:') ? value.slice(3) : value;
    if (!id) throw new BadRequestException('Invalid database promotion theme.');
    const theme = await prisma.theme.findUnique({ where: { id }, select: { id: true } });
    if (!theme) throw new BadRequestException('Invalid promotion theme.');
    return `db:${theme.id}`;
  }

  private async assertThemeEligible(themeId: string | null | undefined, now = new Date()) {
    if (!themeId) return;
    if (themeId.startsWith('builtin:')) {
      if (!isSupportedBuiltinThemeId(themeId.slice('builtin:'.length))) throw new BadRequestException('Selected built-in theme is unavailable.');
      return;
    }
    const id = themeId.startsWith('db:') ? themeId.slice(3) : themeId;
    const theme = await prisma.theme.findUnique({ where: { id }, select: { status: true, startAt: true, endAt: true } });
    const availability = promotionThemeAvailability(theme, now);
    if (availability !== 'AVAILABLE') {
      const message = { DRAFT: 'Draft themes must be published before a promotion can go live.', SCHEDULED: 'The selected theme is not active yet or is outside its schedule.', EXPIRED: 'The selected theme has expired.', MISSING: 'The selected theme is unavailable.' }[availability];
      throw new BadRequestException(message);
    }
  }

  private async resolveTheme(themeId: string | null | undefined, backgroundPreset: string, now: Date) {
    try {
      if (themeId?.startsWith('builtin:')) return publicTheme(registryTheme(themeId.slice(8)));
      if (themeId) {
        const id = themeId.startsWith('db:') ? themeId.slice(3) : themeId;
        const theme = await prisma.theme.findUnique({ where: { id } });
        if (promotionThemeAvailability(theme, now) === 'AVAILABLE') return publicTheme(theme);
      }
      return publicTheme(registryTheme(HOMEPAGE_PROMOTION_PRESETS.includes(backgroundPreset as HomepagePromotionPreset) ? backgroundPreset : 'midnight'));
    } catch {
      return publicTheme(LEGACY_THEMES.midnight);
    }
  }
}
