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
  CommentReportDto,
  EditCommentDto,
  FIXED_REACTIONS,
  normalizeEmoji,
  normalizeInstagramUsername,
  ProfileDto,
  ReactionDto,
} from './discussion.dto';

export const COMMENTER_COOKIE = 'campus_commenter';
const SESSION_DAYS = 180;
const limiter = new SubmissionRateLimiter();
const fixedReactionSet = new Set<string>(FIXED_REACTIONS);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const tokenHash = (value: string) => hash(value);
const publicProfile = (profile: any) => {
  let instagramUsername: string | null = null;
  if (typeof profile.instagramUsername === 'string') {
    try {
      instagramUsername = normalizeInstagramUsername(profile.instagramUsername);
    } catch {
      // Existing profiles may contain a legacy or unavailable handle.
    }
  }
  return {
    id: profile.id,
    displayName: profile.displayName,
    instagramUsername,
    instagramUrl: instagramUsername
      ? `https://www.instagram.com/${encodeURIComponent(instagramUsername)}/`
      : null,
  };
};
function assertRate(key: string, limit: number, message: string) {
  const result = limiter.check(key, limit, 3600);
  if (!result.allowed) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
}

type ReactionSummary = { counts: Record<string, number>; selected: string[] };

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
  private actorHash(session: any, ip: string) {
    return hash(session ? `profile:${session.profileId}` : `ip:${ip}`);
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
  private safeComment(comment: any, reactions: ReactionSummary = { counts: {}, selected: [] }) {
    const deleted = Boolean(comment.deletedAt);
    return {
      id: comment.id,
      content: deleted ? 'This comment was deleted.' : comment.content,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      deletedAt: comment.deletedAt ?? null,
      profile: deleted
        ? {
            id: 'deleted-comment',
            displayName: 'Deleted commenter',
            instagramUsername: null,
            instagramUrl: null,
          }
        : publicProfile(comment.profile),
      replyCount: comment._count?.replies ?? 0,
      reactionCounts: deleted ? {} : reactions.counts,
      selectedReactions: deleted ? [] : reactions.selected,
    };
  }
  private async reactionStates(commentIds: string[], actorHash: string) {
    if (!commentIds.length) return new Map<string, ReactionSummary>();
    const [rows, selectedRows] = await Promise.all([
      (prisma as any).confessionCommentReaction.groupBy({
        by: ['commentId', 'emoji'],
        where: { commentId: { in: commentIds } },
        _count: { _all: true },
      }),
      (prisma as any).confessionCommentReaction.findMany({
        where: { commentId: { in: commentIds }, actorHash },
        select: { commentId: true, emoji: true },
      }),
    ]);
    const states = new Map<string, ReactionSummary>();
    for (const id of commentIds) states.set(id, { counts: {}, selected: [] });
    for (const row of rows) {
      const state = states.get(row.commentId)!;
      state.counts[row.emoji] = row._count._all;
    }
    for (const row of selectedRows) states.get(row.commentId)?.selected.push(row.emoji);
    return states;
  }
  async list(publicId: string, page = 1, rawToken?: string, ip = 'anonymous') {
    const confession = await this.confession(publicId);
    const safePage = Math.min(100, Math.max(1, page));
    const take = 20;
    const where = {
      confessionId: confession.id,
      status: ConfessionCommentStatus.PUBLISHED,
      parentId: null,
    };
    const [topLevel, total, session] = await Promise.all([
      (prisma as any).confessionComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (safePage - 1) * take,
        take,
        include: { profile: true },
      }),
      (prisma as any).confessionComment.count({ where }),
      this.session(rawToken),
    ]);
    const allComments = [...topLevel];
    let frontier = topLevel.map((comment: any) => comment.id);
    while (frontier.length) {
      const replies = await (prisma as any).confessionComment.findMany({
        where: {
          confessionId: confession.id,
          status: ConfessionCommentStatus.PUBLISHED,
          parentId: { in: frontier },
        },
        orderBy: { createdAt: 'asc' },
        include: { profile: true },
      });
      allComments.push(...replies);
      frontier = replies.map((reply: any) => reply.id);
    }
    let states: Map<string, ReactionSummary>;
    try {
      states = await this.reactionStates(
        allComments.map((comment: any) => comment.id),
        this.actorHash(session, ip),
      );
    } catch {
      states = new Map();
    }
    return {
      items: topLevel.map((item: any) => this.commentTree(item, allComments, states)),
      page: safePage,
      limit: take,
      total,
      hasMore: safePage * take < total,
    };
  }
  private commentTree(comment: any, allComments: any[], states: Map<string, ReactionSummary>): any {
    const replies = allComments.filter((candidate) => candidate.parentId === comment.id);
    return {
      ...this.safeComment(comment, states.get(comment.id)),
      replyCount: replies.length,
      replies: replies.map((reply) => this.commentTree(reply, allComments, states)),
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
          status: ConfessionCommentStatus.PUBLISHED,
          deletedAt: null,
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
        status: ConfessionCommentStatus.PUBLISHED,
      },
      include: { profile: true, _count: { select: { replies: true } } },
    });
    return {
      status: 'PUBLISHED',
      message: 'Your comment is now visible.',
      comment: this.safeComment(comment),
    };
  }
  async edit(publicId: string, commentId: string, dto: EditCommentDto, rawToken?: string) {
    const session = await this.session(rawToken);
    if (!session) throw new UnauthorizedException('Join the conversation before editing.');
    const confession = await this.confession(publicId);
    const comment = await (prisma as any).confessionComment.findFirst({
      where: {
        id: commentId,
        confessionId: confession.id,
        status: ConfessionCommentStatus.PUBLISHED,
      },
      include: { profile: true, _count: { select: { replies: true } } },
    });
    if (!comment) throw new NotFoundException('This comment is unavailable.');
    if (comment.profileId !== session.profileId)
      throw new HttpException('You can only edit your own comments.', HttpStatus.FORBIDDEN);
    if (comment.deletedAt) throw new BadRequestException('Deleted comments cannot be edited.');
    const content = dto.content.trim();
    if (!content) throw new BadRequestException('Comment content is required.');
    if (content.length > 1000)
      throw new BadRequestException('Comments must be 1000 characters or fewer.');
    const updated = await (prisma as any).confessionComment.update({
      where: { id: comment.id },
      data: { content },
      include: { profile: true, _count: { select: { replies: true } } },
    });
    return {
      status: 'UPDATED',
      message: 'Your comment was updated.',
      comment: this.safeComment(updated),
    };
  }
  async delete(publicId: string, commentId: string, rawToken?: string) {
    const session = await this.session(rawToken);
    if (!session) throw new UnauthorizedException('Join the conversation before deleting.');
    const confession = await this.confession(publicId);
    const comment = await (prisma as any).confessionComment.findFirst({
      where: {
        id: commentId,
        confessionId: confession.id,
        status: ConfessionCommentStatus.PUBLISHED,
      },
      include: { profile: true, _count: { select: { replies: true } } },
    });
    if (!comment) throw new NotFoundException('This comment is unavailable.');
    if (comment.profileId !== session.profileId)
      throw new HttpException('You can only delete your own comments.', HttpStatus.FORBIDDEN);
    if (comment.deletedAt) throw new BadRequestException('This comment has already been deleted.');
    const deleted = await (prisma as any).confessionComment.update({
      where: { id: comment.id },
      data: { deletedAt: new Date() },
      include: { profile: true, _count: { select: { replies: true } } },
    });
    return {
      status: 'DELETED',
      message: 'Your comment was deleted.',
      comment: this.safeComment(deleted),
    };
  }
  private async commentReactionState(commentId: string, actorHash: string, client: any = prisma) {
    const [rows, selectedRows] = await Promise.all([
      client.confessionCommentReaction.groupBy({
        by: ['emoji'],
        where: { commentId },
        _count: { _all: true },
      }),
      client.confessionCommentReaction.findMany({
        where: { commentId, actorHash },
        select: { emoji: true },
      }),
    ]);
    return {
      counts: rows.reduce((counts: Record<string, number>, row: any) => {
        counts[row.emoji] = row._count._all;
        return counts;
      }, {}),
      selected: selectedRows.map((row: { emoji: string }) => row.emoji),
    };
  }
  async reactToComment(
    publicId: string,
    commentId: string,
    dto: ReactionDto,
    rawToken: string | undefined,
    ip: string,
  ) {
    assertRate(`comment-reaction:${ip}`, 120, 'Too many reactions. Please try again later.');
    const confession = await this.confession(publicId);
    const comment = await (prisma as any).confessionComment.findFirst({
      where: {
        id: commentId,
        confessionId: confession.id,
        status: ConfessionCommentStatus.PUBLISHED,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException('This comment is unavailable.');
    let emoji: string;
    try {
      emoji = normalizeEmoji(dto.emoji);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    const session = await this.session(rawToken);
    const actorHash = this.actorHash(session, ip);
    try {
      await (prisma as any).$transaction(async (tx: any) => {
        const existing = await tx.confessionCommentReaction.findUnique({
          where: { commentId_actorHash_emoji: { commentId, actorHash, emoji } },
        });
        if (existing) await tx.confessionCommentReaction.delete({ where: { id: existing.id } });
        else
          await tx.confessionCommentReaction.create({
            data: { commentId, actorHash, profileId: session?.profileId ?? null, emoji },
          });
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
    return this.commentReactionState(commentId, actorHash);
  }
  private async reactionState(confessionId: string, actorHash: string, client: any = prisma) {
    const [rows, selectedRows] = await Promise.all([
      client.confessionReaction.groupBy({
        by: ['emoji'],
        where: { confessionId },
        _count: { _all: true },
      }),
      client.confessionReaction.findMany({
        where: { confessionId, actorHash },
        select: { emoji: true },
      }),
    ]);
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
      selected: selectedRows.map((row: { emoji: string }) => row.emoji),
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
    const session = await this.session(rawToken);
    const actorHash = this.actorHash(session, ip);
    try {
      await (prisma as any).$transaction(async (tx: any) => {
        const existing = await tx.confessionReaction.findUnique({
          where: {
            confessionId_actorHash_emoji: { confessionId: confession.id, actorHash, emoji },
          },
        });
        if (existing) await tx.confessionReaction.delete({ where: { id: existing.id } });
        else
          await tx.confessionReaction.create({
            data: {
              confessionId: confession.id,
              actorHash,
              profileId: session?.profileId ?? null,
              emoji,
            },
          });
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
    return this.reactionState(confession.id, actorHash);
  }
  async reactions(publicId: string, rawToken: string | undefined, ip: string) {
    const confession = await this.confession(publicId);
    const session = await this.session(rawToken);
    return this.reactionState(confession.id, this.actorHash(session, ip));
  }
  async report(publicId: string, commentId: string, dto: CommentReportDto, ip: string) {
    assertRate(`comment-report:${ip}`, 5, 'Too many reports. Please wait before trying again.');
    const confession = await this.confession(publicId);
    const comment = await (prisma as any).confessionComment.findFirst({
      where: {
        id: commentId,
        confessionId: confession.id,
        status: ConfessionCommentStatus.PUBLISHED,
        deletedAt: null,
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
