import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { GarbaPostStatus } from '@prisma/client';
import { prisma } from '../admin-auth';
import { SubmissionRateLimiter } from '../confessions/rate-limit';
import {
  CreateGarbaCommentDto,
  CreateGarbaPostDto,
  CreateGarbaReportDto,
  GarbaPostCategory,
} from './dto';

const limiter = new SubmissionRateLimiter();
const categories = new Set(Object.values(GarbaPostCategory));
const reportReasons = new Set(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'SCAM', 'OTHER']);

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
function publicHandle(value?: string | null) {
  if (!value) return null;
  const clean = value
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9._]/g, '')
    .slice(0, 30);
  return clean && /^[a-zA-Z0-9._]{1,30}$/.test(clean) ? clean : null;
}
function instagramUrl(handle: string | null) {
  return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : null;
}
function safePost(post: any) {
  const handle = publicHandle(post.instagramHandle);
  return {
    ...post,
    instagramHandle: handle,
    instagramUrl: instagramUrl(handle),
    createdAt: post.createdAt.toISOString(),
    eventDate: post.eventDate?.toISOString() ?? null,
  };
}

@Injectable()
export class GarbaService {
  private check(key: string, limit: number, message: string) {
    const result = limiter.check(key, limit, 3600);
    if (!result.allowed) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }

  async season() {
    const season = await prisma.garbaSeason.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { year: 'desc' },
    });
    return (
      season ?? { name: 'Navratri', year: new Date().getFullYear(), startDate: null, endDate: null }
    );
  }

  async list(category?: string, page = 1) {
    const safePage = Math.min(100, Math.max(1, page));
    const where = {
      status: GarbaPostStatus.PUBLISHED,
      ...(category && categories.has(category as GarbaPostCategory)
        ? { category: category as GarbaPostCategory }
        : {}),
    };
    const [items, total, season] = await Promise.all([
      prisma.garbaPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * 12,
        take: 12,
        include: { _count: { select: { comments: true, reactions: true } } },
      }),
      prisma.garbaPost.count({ where }),
      this.season(),
    ]);
    return {
      items: items.map(safePost),
      season,
      page: safePage,
      limit: 12,
      total,
      hasMore: safePage * 12 < total,
    };
  }

  async create(dto: CreateGarbaPostDto, ip: string) {
    this.check(`post:${ip}`, 5, 'Please wait before posting again.');
    const handle = publicHandle(dto.instagramHandle);
    if (dto.instagramHandle && !handle)
      throw new BadRequestException('Enter a valid Instagram username.');
    const post = await prisma.garbaPost.create({
      data: {
        publicId: `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
        category: dto.category,
        content: dto.content.trim(),
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        location: dto.location?.trim() || undefined,
        instagramHandle: handle,
        authorHash: hash(ip),
        status: GarbaPostStatus.PENDING,
      },
    });
    return {
      publicId: post.publicId,
      status: 'PENDING',
      message: 'Your Garba post is awaiting moderation.',
    };
  }

  async detail(publicId: string) {
    const post = await prisma.garbaPost.findFirst({
      where: { publicId, status: GarbaPostStatus.PUBLISHED },
      include: {
        comments: {
          where: { status: 'PUBLISHED', parentId: null },
          orderBy: { createdAt: 'asc' },
          include: { replies: { where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' } } },
        },
        _count: { select: { reactions: true } },
      },
    });
    if (!post) throw new NotFoundException('This Garba post is unavailable.');
    return safePost(post);
  }

  async react(publicId: string, ip: string) {
    this.check(`reaction:${ip}`, 60, 'Too many reactions. Please try again later.');
    const post = await prisma.garbaPost.findFirst({
      where: { publicId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('This Garba post is unavailable.');
    const actorHash = hash(ip);
    const existing = await prisma.garbaReaction.findUnique({
      where: { postId_actorHash: { postId: post.id, actorHash } },
    });
    if (existing) await prisma.garbaReaction.delete({ where: { id: existing.id } });
    else await prisma.garbaReaction.create({ data: { postId: post.id, actorHash } });
    return {
      reacted: !existing,
      count: await prisma.garbaReaction.count({ where: { postId: post.id } }),
    };
  }

  async comment(publicId: string, dto: CreateGarbaCommentDto, ip: string) {
    this.check(`comment:${ip}`, 20, 'Please slow down before adding another comment.');
    const post = await prisma.garbaPost.findFirst({
      where: { publicId, status: GarbaPostStatus.PUBLISHED },
      select: { id: true, commentsLocked: true },
    });
    if (!post) throw new NotFoundException('This Garba post is unavailable.');
    if (post.commentsLocked) throw new BadRequestException('Comments are locked for this post.');
    if (dto.parentId) {
      const parent = await prisma.garbaComment.findFirst({
        where: { id: dto.parentId, postId: post.id, parentId: null },
      });
      if (!parent) throw new BadRequestException('Reply target is unavailable.');
    }
    return prisma.garbaComment.create({
      data: {
        postId: post.id,
        parentId: dto.parentId,
        content: dto.content.trim(),
        authorHash: hash(ip),
        status: 'PENDING',
      },
    });
  }

  async report(publicId: string, dto: CreateGarbaReportDto, ip: string) {
    if (!reportReasons.has(dto.reason))
      throw new BadRequestException('Choose a valid report reason.');
    this.check(`report:${ip}`, 5, 'Too many reports. Please try again later.');
    const post = await prisma.garbaPost.findFirst({
      where: { publicId, status: GarbaPostStatus.PUBLISHED },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('This Garba post is unavailable.');
    await prisma.garbaReport.create({
      data: { postId: post.id, reason: dto.reason, reporterHash: hash(ip) },
    });
    return { status: 'RECEIVED', message: 'Thanks. The moderation team will review this report.' };
  }

  async reportComment(publicId: string, commentId: string, dto: CreateGarbaReportDto, ip: string) {
    if (!reportReasons.has(dto.reason))
      throw new BadRequestException('Choose a valid report reason.');
    this.check(`report:${ip}`, 5, 'Too many reports. Please try again later.');
    const comment = await prisma.garbaComment.findFirst({
      where: {
        id: commentId,
        post: { publicId, status: GarbaPostStatus.PUBLISHED },
        status: 'PUBLISHED',
      },
      select: { id: true, postId: true },
    });
    if (!comment) throw new NotFoundException('This Garba comment is unavailable.');
    await prisma.garbaReport.create({
      data: {
        postId: comment.postId,
        commentId: comment.id,
        reason: dto.reason,
        reporterHash: hash(ip),
      },
    });
    return { status: 'RECEIVED', message: 'Thanks. The moderation team will review this report.' };
  }
}
