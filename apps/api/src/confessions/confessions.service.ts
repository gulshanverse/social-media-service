import {
  BadRequestException,
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ConfessionStatus } from '@prisma/client';
import { normalizeTheme, themes } from '@ggv/themes';
import {
  allConfessionCategories,
  normalizeReadLiveConfessionButton,
  type PublicConfession,
  type PublicConfessionPage,
  type SubmissionResult,
} from '@ggv/types';
import { CreateConfessionDto, ListConfessionsQueryDto } from './dto';
import { reportReasons } from './report.dto';
import { SubmissionRateLimiter } from './rate-limit';
import { validateCategoryPair } from './category';
import { increment } from '../observability';
import { prisma as sharedPrisma } from '../admin-auth';

type ThemeRecord = {
  id: string;
  slug: string;
  name: string;
  background: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  radius: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  logoVisibility?: boolean;
  handleVisibility?: boolean;
  layoutVariant?: string;
  mode?: string;
  status?: string;
  tokens?: Record<string, string> | null;
};
type ConfessionRecord = {
  id?: string;
  publicId: string;
  content: string;
  category: string | null;
  customCategory?: string | null;
  publishedAt: Date | null;
  theme: ThemeRecord | null;
};
type ConfessionWhere = {
  status: ConfessionStatus;
  category?: string;
  customCategory?: { contains: string; mode: 'insensitive' };
  publishedAt?: { gte?: Date; lt?: Date; lte?: Date };
  AND?: Array<{ OR: Array<Record<string, unknown>> }>;
};
type ConfessionOrder = { publishedAt: 'asc' | 'desc' } | { publicId: 'asc' | 'desc' };
function score(confession: ConfessionRecord, terms: string[]) {
  const content = `${confession.content} ${confession.customCategory ?? ''}`.toLowerCase();
  return terms.reduce((total, term) => total + (content.includes(term) ? 2 : 0), 0);
}
export type ConfessionsPrisma = {
  collegeConfessionProfileSettings?: {
    findUnique(args: { where: { id: string }; select?: Record<string, boolean> }): Promise<{
      maxCharacters?: number;
      cardTextSize?: number;
      previewLines?: number;
      handle?: string;
      headerMessage?: string;
      defaultPrompt?: string;
      communityButtonText?: string;
      bottomButtonText?: string;
      profileImageUrl?: string | null;
      themePreset?: string;
      prompts?: unknown;
      readLiveConfessionButton?: unknown;
    } | null>;
  };
  theme: {
    findUnique(args: { where: { id: string } }): Promise<ThemeRecord | null>;
  };
  confession: {
    create(args: {
      data: {
        publicId: string;
        content: string;
        originalContent: string;
        category?: string;
        customCategory?: string;
        status: ConfessionStatus;
        themeId: string;
      };
    }): Promise<unknown>;
    findMany(args: {
      where: ConfessionWhere;
      orderBy: ConfessionOrder | ConfessionOrder[];
      skip: number;
      take: number;
      select: Record<string, unknown>;
    }): Promise<ConfessionRecord[]>;
    count(args: { where: ConfessionWhere }): Promise<number>;
    findFirst(args: {
      where: { publicId: string; status: ConfessionStatus };
      select: Record<string, unknown>;
    }): Promise<ConfessionRecord | null>;
    update(args: {
      where: { publicId: string };
      data: { viewCount: { increment: number }; reportCount?: { increment: number } };
    }): Promise<unknown>;
  };
  report?: {
    findFirst(args: {
      where: { confessionId: string; reporterHash: string; status: 'OPEN' };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: { confessionId: string; reason: string; details?: string; reporterHash: string };
    }): Promise<unknown>;
  };
};

type RateLimiter = Pick<SubmissionRateLimiter, 'check'>;

export const CONFESSIONS_PRISMA = 'CONFESSIONS_PRISMA';
export const CONFESSIONS_RATE_LIMITER = 'CONFESSIONS_RATE_LIMITER';

const prisma = sharedPrisma as unknown as ConfessionsPrisma;
const rateLimiter = new SubmissionRateLimiter();

function toPublicTheme(theme: ThemeRecord) {
  const fallback = themes.find((item) => item.id === 'midnight')!;
  let normalized;
  try {
    normalized = normalizeTheme({ ...theme, tokens: theme.tokens ?? undefined });
  } catch {
    normalized = normalizeTheme({ ...fallback, slug: fallback.id });
  }
  return {
    id: normalized.slug,
    name: normalized.name,
    background: normalized.background,
    gradient: normalized.gradient,
    textColor: normalized.textColor,
    accentColor: normalized.accentColor,
    fontFamily: normalized.fontFamily,
    radius: `${normalized.radius}px`,
    borderStyle: normalized.borderStyle,
    logoVisibility: normalized.logoVisibility,
    handleVisibility: normalized.handleVisibility,
    layoutVariant: normalized.layoutVariant,
    tokens: normalized.visualTokens,
  };
}

function toPublicConfession(confession: ConfessionRecord): PublicConfession {
  return {
    publicId: confession.publicId,
    content: confession.content,
    category: confession.category as PublicConfession['category'],
    customCategory: confession.customCategory,
    theme: confession.theme ? toPublicTheme(confession.theme) : null,
    publishedAt: confession.publishedAt?.toISOString() ?? new Date(0).toISOString(),
  };
}

@Injectable()
export class ConfessionsService {
  constructor(
    @Inject(CONFESSIONS_PRISMA)
    private readonly database: ConfessionsPrisma = prisma,
    @Inject(CONFESSIONS_RATE_LIMITER)
    private readonly submissions: RateLimiter = rateLimiter,
  ) {}

  async profileSettings() {
    const settings = await sharedPrisma.collegeConfessionProfileSettings.findUnique({
      where: { id: 'default' },
    });
    const prompts = Array.isArray(settings?.prompts)
      ? settings.prompts.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0,
        )
      : [];
    return {
      handle: settings?.handle ?? '@college.confession.ggv',
      headerMessage: settings?.headerMessage ?? 'send me anonymous weekly Confession!',
      defaultPrompt: settings?.defaultPrompt ?? 'Are u talking to anyone??',
      communityButtonText: settings?.communityButtonText ?? 'Visit Community',
      communityPath: '/confessions',
      bottomButtonText: settings?.bottomButtonText ?? 'Get your own messages!',
      profileImageUrl: settings?.profileImageUrl ?? null,
      themePreset: settings?.themePreset ?? 'sunset',
      maxCharacters: settings?.maxCharacters ?? 1000,
      cardTextSize: settings?.cardTextSize ?? 16,
      previewLines: settings?.previewLines ?? 5,
      prompts: prompts.length ? prompts : ['Are u talking to anyone??'],
      readLiveConfessionButton: normalizeReadLiveConfessionButton(
        settings?.readLiveConfessionButton,
      ),
    };
  }

  async resolvePublicTheme(now = new Date()) {
    const fallback = themes.find((item) => item.id === 'midnight')!;
    try {
      const candidates = await (sharedPrisma.theme as any).findMany({
        where: {
          OR: [
            { status: 'ACTIVE' },
            { status: 'PUBLISHED' },
            {
              status: 'SCHEDULED',
              startAt: { lte: now },
              OR: [{ endAt: null }, { endAt: { gt: now } }],
            },
          ],
        },
        orderBy: [{ startAt: 'desc' }, { updatedAt: 'desc' }],
      });
      const eligible = candidates.filter(
        (theme: any) =>
          theme.status === 'SCHEDULED' &&
          theme.startAt &&
          theme.startAt <= now &&
          (!theme.endAt || theme.endAt > now),
      );
      const active = candidates.filter((theme: any) => theme.status === 'ACTIVE');
      const published = candidates.filter((theme: any) => theme.status === 'PUBLISHED');
      return toPublicTheme(eligible[0] ?? active[0] ?? published[0] ?? fallback);
    } catch {
      return toPublicTheme({
        ...fallback,
        slug: fallback.id,
        radius: Number.parseInt(fallback.radius, 10),
      });
    }
  }

  async create(dto: CreateConfessionDto, clientKey: string): Promise<SubmissionResult> {
    const content = dto.content?.trim();
    if (!content) throw new BadRequestException('Confession content is required.');
    const profile = await this.database.collegeConfessionProfileSettings?.findUnique({
      where: { id: 'default' },
      select: { maxCharacters: true },
    });
    const maxCharacters = profile?.maxCharacters ?? 1000;
    if (content.length > maxCharacters)
      throw new BadRequestException(`Confession must be ${maxCharacters} characters or fewer.`);
    const customCategory = validateCategoryPair(dto.category, dto.customCategory);
    const rate = this.submissions.check(
      clientKey,
      Number(process.env.SUBMISSION_RATE_LIMIT ?? 5),
      Number(process.env.SUBMISSION_RATE_WINDOW_SECONDS ?? 3600),
    );
    if (!rate.allowed)
      throw new HttpException(
        {
          message: 'Please wait before sending another confession.',
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const themeId = dto.themeId ?? 'midnight';
    const theme = await this.database.theme.findUnique({ where: { id: themeId } });
    if (!theme || (!themes.some((item) => item.id === themeId) && theme.status === 'DRAFT'))
      throw new BadRequestException('Please choose a valid theme.');
    const publicId = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    await this.database.confession.create({
      data: {
        publicId,
        content,
        originalContent: content,
        category: dto.category,
        ...(customCategory ? { customCategory } : {}),
        status: ConfessionStatus.PENDING,
        themeId: theme.id,
      },
    });
    increment('confessions_submitted_total');
    return {
      publicId,
      status: 'PENDING',
      message: 'Your confession has been submitted for review.',
    };
  }

  async list(query: ListConfessionsQueryDto): Promise<PublicConfessionPage> {
    const page = Math.min(100, Math.max(1, query.page ?? 1));
    const limit = Math.min(50, Math.max(1, query.limit ?? 12));
    const search = (query.search ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    const terms = search ? search.split(' ').filter(Boolean).slice(0, 12) : [];
    const where: ConfessionWhere = { status: ConfessionStatus.PUBLISHED };
    if (query.category) where.category = query.category;
    if (query.customCategory?.trim())
      where.customCategory = { contains: query.customCategory.trim(), mode: 'insensitive' };
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    if (query.dateRange === 'today')
      where.publishedAt = { gte: startOfToday, lt: new Date(startOfToday.getTime() + 86_400_000) };
    if (query.dateRange === '7d')
      where.publishedAt = { gte: new Date(now.getTime() - 7 * 86_400_000), lte: now };
    if (query.dateRange === '30d')
      where.publishedAt = { gte: new Date(now.getTime() - 30 * 86_400_000), lte: now };
    if (query.dateRange === 'custom') {
      const validDate = (value?: string) =>
        Boolean(
          value &&
          /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
        );
      if (!validDate(query.startDate) || !validDate(query.endDate))
        throw new BadRequestException('Choose a valid custom date range.');
      const start = new Date(`${query.startDate}T00:00:00.000Z`);
      const end = new Date(`${query.endDate}T00:00:00.000Z`);
      if (start > end) throw new BadRequestException('The start date must be before the end date.');
      where.publishedAt = { gte: start, lt: new Date(end.getTime() + 86_400_000) };
    }
    if (terms.length)
      where.AND = terms.map((term) => ({
        OR: [
          { content: { contains: term, mode: 'insensitive' } },
          { customCategory: { contains: term, mode: 'insensitive' } },
          ...allConfessionCategories
            .filter((category) => category.toLowerCase().replace(/[_-]/g, ' ').includes(term))
            .map((category) => ({ category })),
        ],
      }));
    const sort =
      terms.length && query.sort === 'relevance'
        ? 'relevance'
        : query.sort === 'oldest'
          ? 'oldest'
          : 'newest';
    const orderBy: ConfessionOrder[] =
      sort === 'oldest'
        ? [{ publishedAt: 'asc' }, { publicId: 'asc' }]
        : [{ publishedAt: 'desc' }, { publicId: 'desc' }];
    const select = {
      publicId: true,
      content: true,
      category: true,
      customCategory: true,
      publishedAt: true,
      theme: {
        select: {
          slug: true,
          name: true,
          background: true,
          gradient: true,
          textColor: true,
          accentColor: true,
          fontFamily: true,
          radius: true,
          borderStyle: true,
          logoVisibility: true,
          handleVisibility: true,
          layoutVariant: true,
          tokens: true,
        },
      },
    };
    const relevanceItems =
      sort === 'relevance'
        ? await this.database.confession.findMany({
            where,
            orderBy: { publishedAt: 'desc' },
            skip: 0,
            take: 5000,
            select,
          })
        : null;
    const ranked = relevanceItems?.sort(
      (a, b) =>
        score(b, terms) - score(a, terms) ||
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0) ||
        b.publicId.localeCompare(a.publicId),
    );
    const [items, total, profile] = await Promise.all([
      ranked
        ? Promise.resolve(ranked.slice((page - 1) * limit, page * limit))
        : this.database.confession.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select,
          }),
      this.database.confession.count({ where }),
      this.database.collegeConfessionProfileSettings?.findUnique({
        where: { id: 'default' },
        select: { cardTextSize: true, previewLines: true },
      }),
    ]);
    return {
      items: items.map(toPublicConfession),
      display: {
        cardTextSize: profile?.cardTextSize ?? 16,
        previewLines: profile?.previewLines ?? 5,
      },
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  async findPublished(publicId: string): Promise<PublicConfession> {
    const confession = await this.database.confession.findFirst({
      where: { publicId, status: ConfessionStatus.PUBLISHED },
      select: {
        publicId: true,
        content: true,
        category: true,
        customCategory: true,
        publishedAt: true,
        theme: {
          select: {
            slug: true,
            name: true,
            background: true,
            gradient: true,
            textColor: true,
            accentColor: true,
            fontFamily: true,
            radius: true,
            borderStyle: true,
            logoVisibility: true,
            handleVisibility: true,
            layoutVariant: true,
            tokens: true,
          },
        },
      },
    });
    if (!confession) throw new NotFoundException('Confession not found.');
    await this.database.confession.update({
      where: { publicId },
      data: { viewCount: { increment: 1 } },
    });
    return toPublicConfession(confession);
  }

  async report(publicId: string, reason: string, clientKey: string, details?: string) {
    if (!reportReasons.includes(reason as (typeof reportReasons)[number]))
      throw new BadRequestException('Please choose a valid report reason.');
    const trimmedDetails = details?.trim();
    if (reason === 'OTHER' && !trimmedDetails)
      throw new BadRequestException('Please explain why you are reporting this confession.');
    if (trimmedDetails && trimmedDetails.length > 1000)
      throw new BadRequestException('Report details must be 1000 characters or fewer.');
    const confession = await this.database.confession.findFirst({
      where: { publicId, status: ConfessionStatus.PUBLISHED },
      select: { id: true },
    });
    if (!confession?.id) throw new NotFoundException('Confession not found.');
    if (!this.database.report) throw new BadRequestException('Reporting is unavailable.');
    const reporterHash = createHash('sha256').update(clientKey).digest('hex');
    const existing = await this.database.report.findFirst({
      where: { confessionId: confession.id, reporterHash, status: 'OPEN' },
    });
    if (existing)
      return {
        status: 'RECEIVED',
        message: 'Thanks. Your report is already with the moderation team.',
      };
    await this.database.report.create({
      data: {
        confessionId: confession.id,
        reason,
        ...(reason === 'OTHER' && trimmedDetails ? { details: trimmedDetails } : {}),
        reporterHash,
      },
    });
    await this.database.confession.update({
      where: { publicId },
      data: { viewCount: { increment: 0 }, reportCount: { increment: 1 } },
    });
    increment('reports_submitted_total');
    return { status: 'RECEIVED', message: 'Thanks. The moderation team will review this report.' };
  }
}
