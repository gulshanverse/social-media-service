import {
  BadRequestException,
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, ConfessionStatus } from '@prisma/client';
import { appConfig } from '@ggv/config';
import { themes } from '@ggv/themes';
import type { PublicConfession, PublicConfessionPage, SubmissionResult } from '@ggv/types';
import { CreateConfessionDto, ListConfessionsQueryDto } from './dto';
import { SubmissionRateLimiter } from './rate-limit';

type ThemeRecord = {
  slug: string;
  name: string;
  background: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  radius: number;
};
type ConfessionRecord = {
  publicId: string;
  content: string;
  category: string | null;
  publishedAt: Date | null;
  theme: ThemeRecord | null;
};

export type ConfessionsPrisma = {
  theme: {
    findUnique(args: { where: { slug: string } }): Promise<ThemeRecord | null>;
  };
  confession: {
    create(args: {
      data: {
        publicId: string;
        content: string;
        originalContent: string;
        category?: string;
        status: ConfessionStatus;
        themeId: string;
      };
    }): Promise<unknown>;
    findMany(args: {
      where: { status: ConfessionStatus };
      orderBy: { publishedAt: 'desc' };
      skip: number;
      take: number;
      select: Record<string, unknown>;
    }): Promise<ConfessionRecord[]>;
    count(args: { where: { status: ConfessionStatus } }): Promise<number>;
    findFirst(args: {
      where: { publicId: string; status: ConfessionStatus };
      select: Record<string, unknown>;
    }): Promise<ConfessionRecord | null>;
    update(args: {
      where: { publicId: string };
      data: { viewCount: { increment: number } };
    }): Promise<unknown>;
  };
};

type RateLimiter = Pick<SubmissionRateLimiter, 'check'>;

const prisma = new PrismaClient() as unknown as ConfessionsPrisma;
const rateLimiter = new SubmissionRateLimiter();

function toPublicTheme(theme: ThemeRecord) {
  const shared = themes.find((item) => item.id === theme.slug);
  return {
    id: theme.slug,
    name: theme.name,
    background: theme.background,
    gradient: theme.gradient,
    textColor: theme.textColor,
    accentColor: theme.accentColor,
    fontFamily: theme.fontFamily,
    radius: shared?.radius ?? `${theme.radius}px`,
  };
}

function toPublicConfession(confession: ConfessionRecord): PublicConfession {
  return {
    publicId: confession.publicId,
    content: confession.content,
    category: confession.category as PublicConfession['category'],
    theme: confession.theme ? toPublicTheme(confession.theme) : null,
    publishedAt: confession.publishedAt?.toISOString() ?? new Date(0).toISOString(),
  };
}

@Injectable()
export class ConfessionsService {
  constructor(
    private readonly database: ConfessionsPrisma = prisma,
    private readonly submissions: RateLimiter = rateLimiter,
  ) {}

  async create(dto: CreateConfessionDto, clientKey: string): Promise<SubmissionResult> {
    const content = dto.content?.trim();
    if (!content) throw new BadRequestException('Confession content is required.');
    if (content.length > appConfig.maxConfessionLength)
      throw new BadRequestException(
        `Confession must be ${appConfig.maxConfessionLength} characters or fewer.`,
      );
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
    const theme = await this.database.theme.findUnique({ where: { slug: themeId } });
    if (!theme || !themes.some((item) => item.id === themeId))
      throw new BadRequestException('Please choose a valid theme.');
    const publicId = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    await this.database.confession.create({
      data: {
        publicId,
        content,
        originalContent: content,
        category: dto.category,
        status: ConfessionStatus.PENDING,
        themeId: theme.slug,
      },
    });
    return {
      publicId,
      status: 'PENDING',
      message: 'Your confession has been submitted for review.',
    };
  }

  async list(query: ListConfessionsQueryDto): Promise<PublicConfessionPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const where = { status: ConfessionStatus.PUBLISHED };
    const [items, total] = await Promise.all([
      this.database.confession.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          publicId: true,
          content: true,
          category: true,
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
            },
          },
        },
      }),
      this.database.confession.count({ where }),
    ]);
    return {
      items: items.map(toPublicConfession),
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
}
