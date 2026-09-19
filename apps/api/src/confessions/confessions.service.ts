import {
  BadRequestException,
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, ConfessionStatus } from '@prisma/client';
import { themes } from '@ggv/themes';
import type { PublicConfession, PublicConfessionPage, SubmissionResult } from '@ggv/types';
import { CreateConfessionDto, ListConfessionsQueryDto } from './dto';
import { SubmissionRateLimiter } from './rate-limit';

const prisma = new PrismaClient();
const rateLimiter = new SubmissionRateLimiter();
const maxContentLength = 1000;

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
  async create(dto: CreateConfessionDto, clientKey: string): Promise<SubmissionResult> {
    const content = dto.content?.trim();
    if (!content) throw new BadRequestException('Confession content is required.');
    if (content.length > maxContentLength)
      throw new BadRequestException(`Confession must be ${maxContentLength} characters or fewer.`);
    const rate = rateLimiter.check(
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
    const theme = await prisma.theme.findUnique({ where: { slug: themeId } });
    if (!theme || !themes.some((item) => item.id === themeId))
      throw new BadRequestException('Please choose a valid theme.');
    const publicId = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    await prisma.confession.create({
      data: {
        publicId,
        content,
        originalContent: content,
        category: dto.category,
        status: ConfessionStatus.PENDING,
        themeId: theme.id,
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
      prisma.confession.findMany({
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
      prisma.confession.count({ where }),
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
    const confession = await prisma.confession.findFirst({
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
    await prisma.confession.update({ where: { publicId }, data: { viewCount: { increment: 1 } } });
    return toPublicConfession(confession);
  }
}
