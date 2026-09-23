import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole, ConfessionCategory, ConfessionStatus, ReportStatus } from '@prisma/client';
import { prisma, recordAudit, AdminIdentity } from './admin-auth';
import {
  AdminQueueQueryDto,
  BulkModerationDto,
  CreateThemeDto,
  UpdateProfileSettingsDto,
  UpdateConfessionDto,
  UpdateThemeDto,
} from './admin.dto';
import { increment } from './observability';

export function assertOpenReportTransition(status: ReportStatus, action: 'resolve' | 'dismiss') {
  if (status !== ReportStatus.OPEN)
    throw new BadRequestException(`Cannot ${action} a ${status.toLowerCase()} report.`);
}

export function assertPendingConfessionEdit(status: ConfessionStatus) {
  if (status !== ConfessionStatus.PENDING)
    throw new BadRequestException(`Cannot edit a ${status.toLowerCase()} confession.`);
}

export function assertEditableConfession(status: ConfessionStatus) {
  const editableStatuses: ConfessionStatus[] = [
    ConfessionStatus.PENDING,
    ConfessionStatus.PUBLISHED,
  ];
  if (!editableStatuses.includes(status))
    throw new BadRequestException(`Cannot edit a ${status.toLowerCase()} confession.`);
}

@Injectable()
export class AdminService {
  async queue(query: AdminQueueQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where = {
      status: query.status ?? ConfessionStatus.PENDING,
      ...(query.category ? { category: query.category } : {}),
      ...(query.theme ? { theme: { id: query.theme } } : {}),
      ...(query.search
        ? {
            OR: [
              { publicId: { contains: query.search, mode: 'insensitive' as const } },
              { content: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.confession.findMany({
        where,
        orderBy: { createdAt: query.order === 'oldest' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          publicId: true,
          content: true,
          originalContent: true,
          category: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          reportCount: true,
          theme: { select: { slug: true, name: true } },
          editor: { select: { id: true, email: true, role: true } },
        },
      }),
      prisma.confession.count({ where }),
    ]);
    return { items, page, limit, total, hasMore: page * limit < total };
  }
  async detail(id: string) {
    const item = await prisma.confession.findUnique({
      where: { id },
      select: {
        id: true,
        publicId: true,
        content: true,
        originalContent: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        reportCount: true,
        theme: {
          select: {
            id: true,
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
        editor: { select: { id: true, email: true, role: true } },
        reports: {
          select: { id: true, reason: true, status: true, createdAt: true, resolvedAt: true },
        },
      },
    });
    if (!item) throw new NotFoundException('Confession not found.');
    return item;
  }
  async edit(id: string, body: UpdateConfessionDto, actor: AdminIdentity) {
    const current = await prisma.confession.findUnique({
      where: { id },
      select: { status: true, content: true, category: true, themeId: true },
    });
    if (!current) throw new NotFoundException('Confession not found.');
    assertEditableConfession(current.status);
    const data: {
      content?: string;
      category?: ConfessionCategory;
      themeId?: string | null;
      editorId?: string;
    } = {};
    if (body.content !== undefined) {
      const content = body.content.trim();
      const profileSettings = (
        prisma as unknown as {
          collegeConfessionProfileSettings?: {
            findUnique(args: {
              where: { id: string };
              select: { maxCharacters: boolean };
            }): Promise<{ maxCharacters: number } | null>;
          };
        }
      ).collegeConfessionProfileSettings;
      const profile = profileSettings
        ? await profileSettings.findUnique({
            where: { id: 'default' },
            select: { maxCharacters: true },
          })
        : null;
      const maxCharacters = profile?.maxCharacters ?? 1000;
      if (!content || content.length > maxCharacters)
        throw new BadRequestException(`Content must be between 1 and ${maxCharacters} characters.`);
      if (content !== current.content) data.content = content;
    }
    if (body.category !== undefined && body.category !== current.category)
      data.category = body.category;
    if (body.themeId !== undefined) {
      if (!body.themeId) {
        if (current.themeId !== null) data.themeId = null;
      } else {
        const theme = await prisma.theme.findUnique({ where: { id: body.themeId } });
        if (!theme) throw new BadRequestException('Invalid theme.');
        if (theme.id !== current.themeId) data.themeId = theme.id;
      }
    }
    const changedFields = Object.keys(data);
    if (changedFields.length === 0)
      return (await prisma.confession.findUnique({
        where: { id },
        select: {
          id: true,
          publicId: true,
          content: true,
          originalContent: true,
          category: true,
          status: true,
          theme: { select: { id: true, slug: true, name: true } },
        },
      }))!;
    data.editorId = actor.id;
    const item = await prisma.confession.update({
      where: { id },
      data,
      select: {
        id: true,
        publicId: true,
        content: true,
        originalContent: true,
        category: true,
        status: true,
        theme: { select: { id: true, slug: true, name: true } },
      },
    });
    await recordAudit(
      actor.id,
      current.status === ConfessionStatus.PUBLISHED ? 'PUBLISHED_CONFESSION_EDITED' : 'EDIT',
      'CONFESSION',
      id,
      { changedFields },
    );
    return item;
  }
  async transition(id: string, action: 'approve' | 'reject' | 'archive', actor: AdminIdentity) {
    const current = await prisma.confession.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Confession not found.');
    const allowed: ConfessionStatus[] =
      action === 'approve'
        ? [ConfessionStatus.PENDING]
        : action === 'reject'
          ? [ConfessionStatus.PENDING]
          : [ConfessionStatus.PUBLISHED, ConfessionStatus.REJECTED];
    if (!allowed.includes(current.status))
      throw new BadRequestException(
        `Cannot ${action} a ${current.status.toLowerCase()} confession.`,
      );
    const status =
      action === 'approve'
        ? ConfessionStatus.PUBLISHED
        : action === 'reject'
          ? ConfessionStatus.REJECTED
          : ConfessionStatus.ARCHIVED;
    const item = await prisma.confession.update({
      where: { id },
      data: { status, ...(action === 'approve' ? { publishedAt: new Date() } : {}) },
      select: { id: true, publicId: true, status: true, publishedAt: true },
    });
    await recordAudit(actor.id, action.toUpperCase(), 'CONFESSION', id);
    increment('moderation_actions_total');
    return item;
  }
  async bulkModerate(body: BulkModerationDto, actor: AdminIdentity) {
    const results: Array<{ id: string; outcome: string }> = [];
    const seen = new Set<string>();
    for (const id of body.ids) {
      if (seen.has(id)) {
        results.push({ id, outcome: 'SKIPPED_DUPLICATE' });
        continue;
      }
      seen.add(id);
      const current = await prisma.confession.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) {
        results.push({ id, outcome: 'NOT_FOUND' });
        continue;
      }
      const allowed: ConfessionStatus[] =
        body.action === 'archive'
          ? [ConfessionStatus.PUBLISHED, ConfessionStatus.REJECTED]
          : [ConfessionStatus.PENDING];
      if (!allowed.includes(current.status)) {
        results.push({ id, outcome: 'SKIPPED_INVALID_STATE' });
        continue;
      }
      const next =
        body.action === 'approve'
          ? ConfessionStatus.PUBLISHED
          : body.action === 'reject'
            ? ConfessionStatus.REJECTED
            : ConfessionStatus.ARCHIVED;
      const updated = await prisma.confession.updateMany({
        where: { id, status: current.status },
        data: { status: next, ...(body.action === 'approve' ? { publishedAt: new Date() } : {}) },
      });
      if (updated.count !== 1) {
        results.push({ id, outcome: 'SKIPPED_STALE_STATE' });
        continue;
      }
      await recordAudit(actor.id, body.action.toUpperCase(), 'CONFESSION', id, { source: 'bulk' });
      results.push({
        id,
        outcome:
          body.action === 'approve'
            ? 'APPROVED'
            : body.action === 'reject'
              ? 'REJECTED'
              : 'ARCHIVED',
      });
    }
    const processed = results.filter((item) =>
      ['APPROVED', 'REJECTED', 'ARCHIVED'].includes(item.outcome),
    ).length;
    increment('moderation_actions_total', processed);
    await recordAudit(actor.id, 'BULK_MODERATION', 'CONFESSION', 'bulk', {
      count: body.ids.length,
      action: body.action.toUpperCase(),
      processed,
    });
    return { requested: body.ids.length, processed, skipped: body.ids.length - processed, results };
  }
  async restore(id: string, actor: AdminIdentity) {
    const current = await prisma.confession.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Confession not found.');
    if (current.status !== ConfessionStatus.ARCHIVED)
      throw new BadRequestException('Only archived confessions can be restored.');
    const item = await prisma.confession.update({
      where: { id },
      data: { status: ConfessionStatus.PUBLISHED, publishedAt: new Date() },
      select: { id: true, publicId: true, status: true, publishedAt: true },
    });
    await recordAudit(actor.id, 'RESTORE', 'CONFESSION', id);
    increment('moderation_actions_total');
    return item;
  }
  async permanentlyDelete(id: string, actor: AdminIdentity) {
    const current = await prisma.confession.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Confession not found.');
    if (current.status !== ConfessionStatus.ARCHIVED)
      throw new BadRequestException('Only archived confessions can be permanently deleted.');
    await prisma.$transaction([
      prisma.report.deleteMany({ where: { confessionId: id } }),
      prisma.confession.delete({ where: { id } }),
    ]);
    await recordAudit(actor.id, 'DELETE', 'CONFESSION', id);
    increment('moderation_actions_total');
    return { id, deleted: true };
  }
  async reports(query: {
    page?: number;
    limit?: number;
    status?: ReportStatus;
    search?: string;
    order?: 'newest' | 'oldest';
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { reason: { contains: query.search, mode: 'insensitive' as const } },
              {
                confession: { publicId: { contains: query.search, mode: 'insensitive' as const } },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: query.order === 'oldest' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          confession: { select: { id: true, publicId: true, content: true, status: true } },
          reviewer: { select: { id: true, email: true, role: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);
    return { items, page, limit, total, hasMore: page * limit < total };
  }
  async report(id: string) {
    const item = await prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        confession: { select: { id: true, publicId: true, content: true, status: true } },
        reviewer: { select: { id: true, email: true, role: true } },
      },
    });
    if (!item) throw new NotFoundException('Report not found.');
    return item;
  }
  async reportAction(id: string, action: 'resolve' | 'dismiss', actor: AdminIdentity) {
    const current = await prisma.report.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Report not found.');
    assertOpenReportTransition(current.status, action);
    const item = await prisma.report.update({
      where: { id },
      data: {
        status: action === 'resolve' ? ReportStatus.RESOLVED : ReportStatus.DISMISSED,
        reviewerId: actor.id,
        resolvedAt: new Date(),
      },
      select: { id: true, status: true, resolvedAt: true },
    });
    await recordAudit(actor.id, `REPORT_${action.toUpperCase()}`, 'REPORT', id);
    increment('reports_processed_total');
    return item;
  }
  async audit(query: { page?: number; limit?: number; action?: string; entity?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));
    const where = {
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' as const } } : {}),
      ...(query.entity ? { entity: { contains: query.entity, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorId: true,
          action: true,
          entity: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          actor: { select: { email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, page, limit, total, hasMore: page * limit < total };
  }
  async themes(query: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const select = {
      id: true,
      slug: true,
      name: true,
      background: true,
      gradient: true,
      textColor: true,
      accentColor: true,
      fontFamily: true,
      radius: true,
    } as const;
    const [items, total] = await Promise.all([
      prisma.theme.findMany({
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select,
      }),
      prisma.theme.count(),
    ]);
    return { items, page, limit, total, hasMore: page * limit < total };
  }
  async createTheme(body: CreateThemeDto, actor: AdminIdentity) {
    const data = {
      slug: body.slug,
      name: body.name,
      background: body.background,
      gradient: body.gradient,
      textColor: body.textColor,
      accentColor: body.accentColor,
      fontFamily: body.fontFamily,
      radius: body.radius,
    };
    const item = await prisma.theme.create({ data });
    await recordAudit(actor.id, 'THEME_CREATE', 'THEME', item.id);
    increment('theme_mutations_total');
    return item;
  }
  async updateTheme(id: string, body: UpdateThemeDto, actor: AdminIdentity) {
    const existing = await prisma.theme.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Theme not found.');
    const data = Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined),
    );
    const item = await prisma.theme.update({ where: { id }, data });
    await recordAudit(actor.id, 'THEME_UPDATE', 'THEME', id, { changedFields: Object.keys(data) });
    increment('theme_mutations_total');
    return item;
  }
  async profileSettings() {
    const settings = await prisma.collegeConfessionProfileSettings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) throw new NotFoundException('Profile settings are not initialized.');
    return settings;
  }
  async updateProfileSettings(body: UpdateProfileSettingsDto, actor: AdminIdentity) {
    const data = Object.fromEntries(
      Object.entries(body)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          key === 'prompts'
            ? (value as string[]).map((item) => item.trim()).filter(Boolean)
            : value,
        ]),
    );
    if (data.prompts && (data.prompts as string[]).length === 0)
      throw new BadRequestException('Keep at least one prompt enabled.');
    const item = await prisma.collegeConfessionProfileSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        prompts: (data.prompts as string[] | undefined) ?? [],
        updatedBy: actor.id,
        ...data,
      },
      update: { ...data, updatedBy: actor.id },
    });
    await recordAudit(
      actor.id,
      'PROFILE_SETTINGS_UPDATE',
      'COLLEGE_CONFESSION_PROFILE',
      'default',
      {
        changedFields: Object.keys(data),
      },
    );
    return item;
  }
  async dashboard() {
    const [
      pending,
      published,
      rejected,
      openReports,
      resolvedReports,
      totalConfessions,
      activeThemes,
    ] = await Promise.all([
      prisma.confession.count({ where: { status: 'PENDING' } }),
      prisma.confession.count({ where: { status: 'PUBLISHED' } }),
      prisma.confession.count({ where: { status: 'REJECTED' } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.confession.count(),
      prisma.theme.count(),
    ]);
    return {
      pendingConfessions: pending,
      publishedConfessions: published,
      rejectedConfessions: rejected,
      openReports,
      resolvedReports,
      totalConfessions,
      activeThemes,
    };
  }
  async dashboardExtended() {
    const [base, archived, recentActivity] = await Promise.all([
      this.dashboard(),
      prisma.confession.count({ where: { status: 'ARCHIVED' } }),
      prisma.auditLog.findMany({
        where: {
          entity: { in: ['CONFESSION', 'REPORT'] },
          action: {
            in: ['APPROVE', 'REJECT', 'ARCHIVE', 'RESTORE', 'REPORT_RESOLVE', 'REPORT_DISMISS'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
          actor: { select: { email: true } },
        },
      }),
    ]);
    return { ...base, archivedConfessions: archived, recentActivity };
  }
}
