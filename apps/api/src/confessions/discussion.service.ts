import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ConfessionCommentStatus, ConfessionStatus } from '@prisma/client';
import { prisma } from '../admin-auth';
import { SubmissionRateLimiter } from './rate-limit';
import {
  CommentDto,
  FIXED_REACTIONS,
  normalizeEmoji,
  normalizeInstagramUsername,
  ProfileDto,
  ReactionDto,
  CommentReportDto,
} from './discussion.dto';

export const COMMENTER_COOKIE = 'campus_commenter';
const SESSION_DAYS = 180;
const limiter = new SubmissionRateLimiter();
const fixedReactionSet = new Set<string>(FIXED_REACTIONS);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const tokenHash = (value: string) => hash(value);
const publicProfile = (profile: any) => ({
  id: profile.id,
  displayName: profile.displayName,
  instagramUsername: profile.instagramUsername,
  instagramUrl: `https://www.instagram.com/${encodeURIComponent(profile.instagramUsername)}/`,
});
function assertRate(key: string, limit: number, message: string) {
  const result = limiter.check(key, limit, 3600);
  if (!result.allowed) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
}

@Injectable()
export class DiscussionService {
  private async session(rawToken?: string) {
    if (!rawToken) return null;
    const session = await (prisma as any).commenterSession.findUnique({
      where: { tokenHash: tokenHash(rawToken) },
      include: { profile: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
    await (prisma as any).commenterSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
    return session;
  }
  async identity(rawToken?: string) {
    const session = await this.session(rawToken);
    return session ? publicProfile(session.profile) : null;
  }
  async register(dto: ProfileDto, ip: string) {
    assertRate(`identity:${ip}`, 10, 'Please wait before registering another profile.');
    let instagramUsername: string;
    try {
      instagramUsername = normalizeInstagramUsername(dto.instagramUsername);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    const displayName = dto.displayName.trim();
    if (!displayName) throw new BadRequestException('Display name is required.');
    const token = randomBytes(32).toString('base64url');
    const profile = await (prisma as any).commenterProfile.create({
      data: {
        displayName,
        instagramUsername,
        sessions: {
          create: {
            tokenHash: tokenHash(token),
            expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
          },
        },
      },
      include: { sessions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return { profile: publicProfile(profile), token, expiresAt: profile.sessions[0].expiresAt };
  }
  private async confession(publicId: string) {
    const record = await prisma.confession.findFirst({
      where: { publicId, status: ConfessionStatus.PUBLISHED },
      select: { id: true, commentsLocked: true },
    });
    if (!record) throw new NotFoundException('This confession is unavailable.');
    return record;
  }
  private safeComment(comment: any) {
    return {
      id: comment.id,
      content: comment.content,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      profile: publicProfile(comment.profile),
      replyCount: comment._count?.replies ?? 0,
    };
  }
  async list(publicId: string, page = 1) {
    const confession = await this.confession(publicId);
    const safePage = Math.min(100, Math.max(1, page));
    const take = 20;
    const where = {
      confessionId: confession.id,
      status: ConfessionCommentStatus.PUBLISHED,
      parentId: null,
    };
    const [items, total] = await Promise.all([
      (prisma as any).confessionComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (safePage - 1) * take,
        take,
        include: {
          profile: true,
          _count: { select: { replies: { where: { status: ConfessionCommentStatus.PUBLISHED } } } },
        },
      }),
      (prisma as any).confessionComment.count({ where }),
    ]);
    const replies = items.length
      ? await (prisma as any).confessionComment.findMany({
          where: {
            parentId: { in: items.map((item: any) => item.id) },
            status: ConfessionCommentStatus.PUBLISHED,
          },
          orderBy: { createdAt: 'asc' },
          include: { profile: true },
        })
      : [];
    return {
      items: items.map((item: any) => ({
        ...this.safeComment(item),
        replies: replies
          .filter((reply: any) => reply.parentId === item.id)
          .map((reply: any) => this.safeComment(reply)),
      })),
      page: safePage,
      limit: take,
      total,
      hasMore: safePage * take < total,
    };
  }
  async create(publicId: string, dto: CommentDto, rawToken: string | undefined, ip: string) {
    assertRate(`comment:${ip}`, 20, 'Please slow down before adding another comment.');
    const session = await this.session(rawToken);
    if (!session) throw new UnauthorizedException('Join the conversation before commenting.');
    const confession = await this.confession(publicId);
    if (confession.commentsLocked)
      throw new BadRequestException('Replies are locked for this confession.');
    const content = dto.content.trim();
    if (!content) throw new BadRequestException('Comment content is required.');
    let parentId: string | null = null;
    if (dto.parentId) {
      const parent = await (prisma as any).confessionComment.findFirst({
        where: {
          id: dto.parentId,
          confessionId: confession.id,
          parentId: null,
          status: ConfessionCommentStatus.PUBLISHED,
        },
        select: { id: true },
      });
      if (!parent) throw new BadRequestException('Reply target is unavailable.');
      parentId = parent.id;
    }
    const comment = await (prisma as any).confessionComment.create({
      data: {
        confessionId: confession.id,
        profileId: session.profileId,
        parentId,
        content,
        status: ConfessionCommentStatus.PENDING,
      },
      include: { profile: true, _count: { select: { replies: true } } },
    });
    return {
      status: 'PENDING',
      message: 'Your comment is awaiting moderation.',
      comment: this.safeComment(comment),
    };
  }
  async react(publicId: string, dto: ReactionDto, rawToken: string | undefined, ip: string) {
    assertRate(`reaction:${ip}`, 60, 'Too many reactions. Please try again later.');
    const confession = await this.confession(publicId);
    let emoji: string;
    try {
      emoji = normalizeEmoji(dto.emoji);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    const actorHash = hash(
      rawToken ? `profile:${(await this.session(rawToken))?.profileId ?? ip}` : `ip:${ip}`,
    );
    const existing = await (prisma as any).confessionReaction.findUnique({
      where: { confessionId_actorHash: { confessionId: confession.id, actorHash } },
    });
    if (existing?.emoji === emoji)
      await (prisma as any).confessionReaction.delete({ where: { id: existing.id } });
    else if (existing)
      await (prisma as any).confessionReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
    else
      await (prisma as any).confessionReaction.create({
        data: {
          confessionId: confession.id,
          actorHash,
          profileId: (await this.session(rawToken))?.profileId ?? null,
          emoji,
        },
      });
    const grouped = await (prisma as any).confessionReaction.groupBy({
      by: ['emoji'],
      where: { confessionId: confession.id },
      _count: { _all: true },
    });
    const counts = grouped.reduce((acc: Record<string, number>, item: any) => {
      acc[item.emoji] = item._count._all;
      return acc;
    }, {});
    return {
      selected: existing?.emoji === emoji ? null : emoji,
      counts,
      customReactions: Object.entries(counts)
        .filter(([value]) => !fixedReactionSet.has(value))
        .map(([emoji, count]) => ({ emoji, count })),
    };
  }
  async reactions(publicId: string, rawToken: string | undefined, ip: string) {
    const confession = await this.confession(publicId);
    const rows = await (prisma as any).confessionReaction.groupBy({
      by: ['emoji'],
      where: { confessionId: confession.id },
      _count: { _all: true },
    });
    const session = await this.session(rawToken);
    const actorHash = hash(rawToken ? `profile:${session?.profileId ?? ip}` : `ip:${ip}`);
    const selected = await (prisma as any).confessionReaction.findUnique({
      where: { confessionId_actorHash: { confessionId: confession.id, actorHash } },
      select: { emoji: true },
    });
    const counts = rows.reduce((acc: Record<string, number>, item: any) => {
      acc[item.emoji] = item._count._all;
      return acc;
    }, {});
    return {
      options: FIXED_REACTIONS,
      counts,
      customReactions: Object.entries(counts)
        .filter(([value]) => !fixedReactionSet.has(value))
        .map(([emoji, count]) => ({ emoji, count })),
      selected: selected?.emoji ?? null,
    };
  }
  async report(publicId: string, commentId: string, dto: CommentReportDto, ip: string) {
    assertRate(`comment-report:${ip}`, 5, 'Too many reports. Please wait before trying again.');
    const confession = await this.confession(publicId);
    const comment = await (prisma as any).confessionComment.findFirst({
      where: {
        id: commentId,
        confessionId: confession.id,
        status: ConfessionCommentStatus.PUBLISHED,
      },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException('This comment is unavailable.');
    await prisma.report.create({
      data: {
        confessionId: confession.id,
        commentId,
        reason: dto.reason,
        details: dto.details?.trim() || undefined,
        reporterHash: hash(ip),
      },
    });
    return { status: 'RECEIVED', message: 'Thanks. The moderation team will review this report.' };
  }
  async revoke(rawToken: string | undefined) {
    if (rawToken)
      await (prisma as any).commenterSession.updateMany({
        where: { tokenHash: tokenHash(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    return { success: true };
  }
}
