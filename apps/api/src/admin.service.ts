import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AdminRole,
  ConfessionCategory,
  ConfessionStatus,
  GarbaCommentStatus,
  GarbaPostCategory,
  GarbaPostStatus,
  ReportStatus,
  ThemeStatus,
} from '@prisma/client';
import { prisma, recordAudit, AdminIdentity } from './admin-auth';
import {
  AdminQueueQueryDto,
  BulkModerationDto,
  CreateThemeDto,
  UpdateProfileSettingsDto,
  UpdateConfessionDto,
  UpdateThemeDto,
  ImportThemeDto,
  AdminGarbaCommentQueryDto,
  AdminGarbaQueryDto,
  UpdateGarbaPostDto,
  UpdateGarbaCommentDto,
  UpdateGarbaSeasonDto,
} from './admin.dto';
import { increment } from './observability';
import {
  exportPortableTheme,
  normalizeImportedTheme,
  normalizeTheme,
  portableToCreateInput,
} from '@ggv/themes';
import { normalizeReadLiveConfessionButton } from '@ggv/types';

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
  async queue(query: AdminQueueQueryDto, actor?: AdminIdentity) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where = {
      status: query.status ?? ConfessionStatus.PENDING,
      ...(query.category ? { category: query.category } : {}),
      ...(query.theme || query.variant || query.mode || (query.favorites && actor)
        ? {
            theme: {
              ...(query.theme ? { id: query.theme } : {}),
              ...(query.variant ? { layoutVariant: query.variant } : {}),
              ...(query.mode ? { mode: query.mode } : {}),
              ...(query.favorites && actor ? { favorites: { some: { adminId: actor.id } } } : {}),
            },
          }
        : {}),
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
          theme: {
            select: {
              id: true,
              slug: true,
              name: true,
              layoutVariant: true,
              mode: true,
              status: true,
            },
          },
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
          details: true,
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
        details: true,
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
      borderStyle: true,
      logoVisibility: true,
      handleVisibility: true,
      layoutVariant: true,
      mode: true,
      status: true,
      startAt: true,
      endAt: true,
      favorites: { select: { adminId: true } },
      tokens: true,
      description: true,
      icon: true,
      category: true,
      tags: true,
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
  async exportTheme(id: string, actor: AdminIdentity) {
    const theme = await prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException('Theme not found.');
    try {
      const document = exportPortableTheme({
        ...theme,
        borderStyle: theme.borderStyle as 'solid' | 'dashed' | 'dotted' | 'double' | 'none',
        tokens: (theme.tokens as Record<string, string> | null) ?? undefined,
      });
      await recordAudit(actor.id, 'THEME_EXPORT', 'THEME', id);
      return document;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Theme cannot be exported safely.',
      );
    }
  }
  private async proposedImportSlug(slug: string) {
    let candidate = slug;
    let suffix = 1;
    while (await prisma.theme.findUnique({ where: { slug: candidate }, select: { id: true } })) {
      suffix += 1;
      candidate = `${slug}-copy${suffix === 2 ? '' : `-${suffix}`}`;
      if (suffix > 100) throw new BadRequestException('Unable to find an available theme slug.');
    }
    return candidate;
  }
  async previewThemeImport(body: ImportThemeDto) {
    try {
      const draft = normalizeImportedTheme(body.document);
      const slug = await this.proposedImportSlug(draft.slug);
      return { ...draft, proposedSlug: slug };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Theme import is invalid.',
      );
    }
  }
  async importTheme(body: ImportThemeDto, actor: AdminIdentity) {
    const preview = await this.previewThemeImport(body);
    const input = portableToCreateInput(preview, preview.proposedSlug);
    const item = await prisma.theme.create({ data: input as any });
    await recordAudit(actor.id, 'THEME_IMPORT', 'THEME', item.id, {
      slug: item.slug,
      schemaVersion: 1,
    });
    increment('theme_mutations_total');
    return item;
  }
  async createTheme(body: CreateThemeDto, actor: AdminIdentity) {
    let normalized;
    try {
      normalized = normalizeTheme(body);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid theme.');
    }
    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;
    if (startAt && endAt && startAt >= endAt)
      throw new BadRequestException('startAt must be before endAt.');
    if (body.status === ThemeStatus.SCHEDULED && !startAt)
      throw new BadRequestException('Scheduled themes require startAt.');
    const data = {
      slug: normalized.slug,
      name: normalized.name,
      background: normalized.background,
      gradient: normalized.gradient,
      textColor: normalized.textColor,
      accentColor: normalized.accentColor,
      fontFamily: normalized.fontFamily,
      radius: normalized.radius,
      borderStyle: normalized.borderStyle,
      logoVisibility: normalized.logoVisibility,
      handleVisibility: normalized.handleVisibility,
      layoutVariant: normalized.layoutVariant,
      mode: body.mode?.trim() || 'dark',
      status: body.status ?? ThemeStatus.DRAFT,
      startAt,
      endAt,
      tokens: normalized.visualTokens,
      description: body.description?.trim() || null,
      icon: body.icon?.trim() || null,
      category: body.category?.trim() || null,
      tags: body.tags ?? [],
    };
    const item = await prisma.theme.create({ data });
    await recordAudit(actor.id, 'THEME_CREATE', 'THEME', item.id);
    increment('theme_mutations_total');
    return item;
  }
  async updateTheme(id: string, body: UpdateThemeDto, actor: AdminIdentity) {
    const existing = await prisma.theme.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Theme not found.');
    let normalized;
    try {
      normalized = normalizeTheme({
        id,
        slug: id,
        name: body.name ?? existing.name ?? 'Theme',
        background: body.background ?? existing.background ?? '#000',
        gradient: body.gradient ?? existing.gradient ?? 'none',
        textColor: body.textColor ?? existing.textColor ?? '#fff',
        accentColor: body.accentColor ?? existing.accentColor ?? '#fff',
        fontFamily: body.fontFamily ?? existing.fontFamily ?? 'Inter',
        radius: body.radius ?? existing.radius ?? 0,
        borderStyle: body.borderStyle as
          'solid' | 'dashed' | 'dotted' | 'double' | 'none' | undefined,
        logoVisibility: body.logoVisibility ?? existing.logoVisibility ?? true,
        handleVisibility: body.handleVisibility ?? existing.handleVisibility ?? true,
        layoutVariant: body.layoutVariant ?? existing.layoutVariant ?? 'classic',
        tokens: body.tokens ?? (existing.tokens as Record<string, string> | undefined),
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid theme.');
    }
    const startAt =
      body.startAt === undefined ? (existing.startAt ?? null) : new Date(body.startAt);
    const endAt = body.endAt === undefined ? (existing.endAt ?? null) : new Date(body.endAt);
    if (startAt && endAt && startAt >= endAt)
      throw new BadRequestException('startAt must be before endAt.');
    if ((body.status ?? existing.status ?? ThemeStatus.DRAFT) === ThemeStatus.SCHEDULED && !startAt)
      throw new BadRequestException('Scheduled themes require startAt.');
    const data = Object.fromEntries(
      Object.entries(body)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          key === 'startAt'
            ? startAt
            : key === 'endAt'
              ? endAt
              : key === 'mode' ||
                  key === 'status' ||
                  key === 'description' ||
                  key === 'icon' ||
                  key === 'category' ||
                  key === 'tags'
                ? value
                : key === 'tokens'
                  ? normalized.visualTokens
                  : normalized[key as keyof typeof normalized],
        ]),
    );
    const item = await prisma.theme.update({ where: { id }, data });
    await recordAudit(actor.id, 'THEME_UPDATE', 'THEME', id, { changedFields: Object.keys(data) });
    increment('theme_mutations_total');
    return item;
  }
  async publishTheme(id: string, actor: AdminIdentity) {
    return this.setThemeStatus(id, ThemeStatus.PUBLISHED, actor);
  }
  async activateTheme(id: string, actor: AdminIdentity) {
    const current = await prisma.theme.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new NotFoundException('Theme not found.');
    await prisma.theme.updateMany({
      where: { status: ThemeStatus.ACTIVE, id: { not: id } },
      data: { status: ThemeStatus.PUBLISHED },
    });
    return this.setThemeStatus(id, ThemeStatus.ACTIVE, actor);
  }
  private async setThemeStatus(id: string, status: ThemeStatus, actor: AdminIdentity) {
    const current = await prisma.theme.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Theme not found.');
    const item = await prisma.theme.update({ where: { id }, data: { status } });
    await recordAudit(actor.id, `THEME_${status}`, 'THEME', id, { previousStatus: current.status });
    increment('theme_mutations_total');
    return item;
  }
  async duplicateTheme(id: string, actor: AdminIdentity) {
    const source = await prisma.theme.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Theme not found.');
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      favorites: _favorites,
      confessions: _confessions,
      ...copy
    } = source as any;
    const item = await prisma.theme.create({
      data: {
        ...copy,
        slug: `${source.slug}-copy-${Date.now().toString(36)}`.slice(0, 80),
        name: `${source.name} Copy`,
        status: ThemeStatus.DRAFT,
        startAt: null,
        endAt: null,
      },
    });
    await recordAudit(actor.id, 'THEME_DUPLICATE', 'THEME', item.id, { sourceId: id });
    return item;
  }
  async deleteTheme(id: string, actor: AdminIdentity) {
    const source = await prisma.theme.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!source) throw new NotFoundException('Theme not found.');
    if (source.status === ThemeStatus.ACTIVE)
      throw new BadRequestException(
        'Active themes cannot be deleted. Activate another theme first.',
      );
    const used = await prisma.confession.count({ where: { themeId: id } });
    if (used > 0) throw new BadRequestException('Themes used by confessions cannot be deleted.');
    await prisma.theme.delete({ where: { id } });
    await recordAudit(actor.id, 'THEME_DELETE', 'THEME', id);
    return { id, deleted: true };
  }
  async favoriteTheme(id: string, actor: AdminIdentity) {
    await prisma.theme.findUniqueOrThrow({ where: { id }, select: { id: true } });
    await prisma.themeFavorite.upsert({
      where: { adminId_themeId: { adminId: actor.id, themeId: id } },
      create: { adminId: actor.id, themeId: id },
      update: {},
    });
    return { id, favorite: true };
  }
  async unfavoriteTheme(id: string, actor: AdminIdentity) {
    await prisma.themeFavorite.deleteMany({ where: { adminId: actor.id, themeId: id } });
    return { id, favorite: false };
  }
  async profileSettings() {
    const settings = await prisma.collegeConfessionProfileSettings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) throw new NotFoundException('Profile settings are not initialized.');
    return {
      ...settings,
      readLiveConfessionButton: normalizeReadLiveConfessionButton(
        settings.readLiveConfessionButton,
      ),
    };
  }
  async updateProfileSettings(body: UpdateProfileSettingsDto, actor: AdminIdentity) {
    const data = Object.fromEntries(
      Object.entries(body)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          key === 'prompts'
            ? (value as string[]).map((item) => item.trim()).filter(Boolean)
            : key === 'readLiveConfessionButton'
              ? normalizeReadLiveConfessionButton(value)
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
  async garbaDashboard() {
    const [total, pending, published, rejected, archived, comments, openReports, season] =
      await Promise.all([
        prisma.garbaPost.count(),
        prisma.garbaPost.count({ where: { status: GarbaPostStatus.PENDING } }),
        prisma.garbaPost.count({ where: { status: GarbaPostStatus.PUBLISHED } }),
        prisma.garbaPost.count({ where: { status: GarbaPostStatus.REJECTED } }),
        prisma.garbaPost.count({ where: { status: GarbaPostStatus.ARCHIVED } }),
        prisma.garbaComment.count(),
        prisma.garbaReport.count({ where: { status: ReportStatus.OPEN } }),
        prisma.garbaSeason.findFirst({ where: { status: 'ACTIVE' }, orderBy: { year: 'desc' } }),
      ]);
    return { total, pending, published, rejected, archived, comments, openReports, season };
  }

  async garbaPosts(query: AdminGarbaQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where = {
      status: query.status ?? GarbaPostStatus.PENDING,
      ...(query.category ? { category: query.category } : {}),
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
      prisma.garbaPost.findMany({
        where,
        orderBy: { createdAt: query.order === 'oldest' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { comments: true, reactions: true, reports: true } } },
      }),
      prisma.garbaPost.count({ where }),
    ]);
    return { items, page, limit, total, hasMore: page * limit < total };
  }

  async garbaPost(id: string) {
    const item = await prisma.garbaPost.findUnique({
      where: { id },
      include: {
        reports: { orderBy: { createdAt: 'desc' } },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'asc' },
          include: { replies: { orderBy: { createdAt: 'asc' } } },
        },
        _count: { select: { comments: true, reactions: true } },
      },
    });
    if (!item) throw new NotFoundException('Garba post not found.');
    return item;
  }

  async updateGarbaPost(id: string, body: UpdateGarbaPostDto, actor: AdminIdentity) {
    const current = await prisma.garbaPost.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Garba post not found.');
    if (current.status !== GarbaPostStatus.PENDING && current.status !== GarbaPostStatus.PUBLISHED)
      throw new BadRequestException('This Garba post is not editable in its current state.');
    const data = {
      ...body,
      ...(body.eventDate ? { eventDate: new Date(body.eventDate) } : {}),
      ...(body.content ? { content: body.content.trim() } : {}),
      ...(body.location ? { location: body.location.trim() } : {}),
    } as any;
    const item = await prisma.garbaPost.update({ where: { id }, data });
    await recordAudit(actor.id, 'GARBA_POST_EDITED', 'GARBA_POST', id, {
      changedFields: Object.keys(data),
    });
    return item;
  }

  async garbaTransition(
    id: string,
    action: 'approve' | 'reject' | 'archive' | 'restore',
    actor: AdminIdentity,
  ) {
    const current = await prisma.garbaPost.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Garba post not found.');
    const allowed: Record<string, GarbaPostStatus[]> = {
      approve: [GarbaPostStatus.PENDING],
      reject: [GarbaPostStatus.PENDING],
      archive: [GarbaPostStatus.PUBLISHED, GarbaPostStatus.REJECTED],
      restore: [GarbaPostStatus.ARCHIVED],
    };
    if (!allowed[action].includes(current.status))
      throw new BadRequestException(
        `Cannot ${action} a ${current.status.toLowerCase()} Garba post.`,
      );
    const status =
      action === 'approve' || action === 'restore'
        ? GarbaPostStatus.PUBLISHED
        : action === 'reject'
          ? GarbaPostStatus.REJECTED
          : GarbaPostStatus.ARCHIVED;
    const item = await prisma.garbaPost.update({
      where: { id },
      data: {
        status,
        ...(status === GarbaPostStatus.PUBLISHED ? { publishedAt: new Date() } : {}),
      },
    });
    const auditAction = {
      approve: 'GARBA_POST_APPROVED',
      reject: 'GARBA_POST_REJECTED',
      archive: 'GARBA_POST_DELETED',
      restore: 'GARBA_POST_RESTORED',
    }[action];
    await recordAudit(actor.id, auditAction, 'GARBA_POST', id);
    increment('moderation_actions_total');
    return item;
  }

  async garbaLockComments(id: string, locked: boolean, actor: AdminIdentity) {
    const item = await prisma.garbaPost.update({ where: { id }, data: { commentsLocked: locked } });
    await recordAudit(
      actor.id,
      locked ? 'GARBA_COMMENT_LOCKED' : 'GARBA_COMMENT_UNLOCKED',
      'GARBA_POST',
      id,
    );
    return item;
  }

  async garbaComments(query: AdminGarbaCommentQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where = {
      status: query.status ?? GarbaCommentStatus.PENDING,
      ...(query.search
        ? { content: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.garbaComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          post: { select: { id: true, publicId: true, content: true } },
          parent: { select: { id: true, content: true } },
          replies: true,
        },
      }),
      prisma.garbaComment.count({ where }),
    ]);
    return { items, page, limit, total, hasMore: page * limit < total };
  }

  async updateGarbaComment(id: string, body: UpdateGarbaCommentDto, actor: AdminIdentity) {
    const current = await prisma.garbaComment.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) throw new NotFoundException('Garba comment or reply not found.');
    if (current.status === GarbaCommentStatus.REJECTED)
      throw new BadRequestException('Rejected Garba comments cannot be edited.');
    const content = body.content.trim();
    if (!content) throw new BadRequestException('Comment content cannot be empty.');
    const item = await prisma.garbaComment.update({ where: { id }, data: { content } });
    await recordAudit(actor.id, 'GARBA_COMMENT_EDITED', 'GARBA_COMMENT', id);
    return item;
  }
  async deleteGarbaComment(id: string, actor: AdminIdentity) {
    const current = await prisma.garbaComment.findUnique({
      where: { id },
      select: { parentId: true },
    });
    if (!current) throw new NotFoundException('Garba comment or reply not found.');
    await prisma.garbaComment.delete({ where: { id } });
    await recordAudit(
      actor.id,
      current.parentId ? 'GARBA_REPLY_DELETED' : 'GARBA_COMMENT_DELETED',
      'GARBA_COMMENT',
      id,
    );
    increment('moderation_actions_total');
    return { id, deleted: true };
  }
  async garbaCommentTransition(
    id: string,
    action: 'approve' | 'reject' | 'archive' | 'restore',
    actor: AdminIdentity,
  ) {
    const current = await prisma.garbaComment.findUnique({
      where: { id },
      select: { status: true, parentId: true },
    });
    if (!current) throw new NotFoundException('Garba comment or reply not found.');
    const allowed: Record<string, GarbaCommentStatus[]> = {
      approve: [GarbaCommentStatus.PENDING],
      reject: [GarbaCommentStatus.PENDING],
      archive: [GarbaCommentStatus.PUBLISHED, GarbaCommentStatus.REJECTED],
      restore: [GarbaCommentStatus.ARCHIVED],
    };
    if (!allowed[action].includes(current.status))
      throw new BadRequestException(`Cannot ${action} this Garba comment.`);
    const status =
      action === 'approve' || action === 'restore'
        ? GarbaCommentStatus.PUBLISHED
        : action === 'reject'
          ? GarbaCommentStatus.REJECTED
          : GarbaCommentStatus.ARCHIVED;
    const item = await prisma.garbaComment.update({ where: { id }, data: { status } });
    const target = current.parentId ? 'REPLY' : 'COMMENT';
    const auditAction = {
      approve: `GARBA_${target}_APPROVED`,
      reject: `GARBA_${target}_REJECTED`,
      archive: `GARBA_${target}_DELETED`,
      restore: `GARBA_${target}_RESTORED`,
    }[action];
    await recordAudit(actor.id, auditAction, 'GARBA_COMMENT', id);
    return item;
  }

  async garbaReports(query: { page?: number; limit?: number; status?: ReportStatus }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      prisma.garbaReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          post: { select: { id: true, publicId: true, content: true } },
          comment: { select: { id: true, content: true, parentId: true } },
        },
      }),
      prisma.garbaReport.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        id: `garba:${item.id}`,
        kind: 'GARBA',
        confession: {
          id: item.post.id,
          publicId: item.post.publicId,
          content: item.comment?.content ?? item.post.content,
          status: 'GARBA',
        },
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  async garbaReportAction(id: string, action: 'resolve' | 'dismiss', actor: AdminIdentity) {
    const report = await prisma.garbaReport.findUnique({ where: { id }, select: { status: true } });
    if (!report) throw new NotFoundException('Garba report not found.');
    assertOpenReportTransition(report.status, action);
    const item = await prisma.garbaReport.update({
      where: { id },
      data: { status: action === 'resolve' ? ReportStatus.RESOLVED : ReportStatus.DISMISSED },
    });
    await recordAudit(actor.id, `GARBA_REPORT_${action.toUpperCase()}`, 'GARBA_REPORT', id);
    increment('reports_processed_total');
    return item;
  }

  async garbaSeasonSettings() {
    return prisma.garbaSeason.findMany({ orderBy: { year: 'desc' } });
  }
  async updateGarbaSeason(body: UpdateGarbaSeasonDto, actor: AdminIdentity) {
    const item = await prisma.$transaction(async (tx) => {
      if (body.status === 'ACTIVE')
        await tx.garbaSeason.updateMany({ data: { status: 'INACTIVE' } });
      const existing = await tx.garbaSeason.findFirst({ where: { year: body.year } });
      return existing
        ? tx.garbaSeason.update({
            where: { id: existing.id },
            data: {
              name: body.name,
              startDate: body.startDate ? new Date(body.startDate) : null,
              endDate: body.endDate ? new Date(body.endDate) : null,
              status: body.status,
            },
          })
        : tx.garbaSeason.create({
            data: {
              name: body.name,
              year: body.year,
              startDate: body.startDate ? new Date(body.startDate) : null,
              endDate: body.endDate ? new Date(body.endDate) : null,
              status: body.status,
            },
          });
    });
    await recordAudit(actor.id, 'GARBA_SEASON_UPDATED', 'GARBA_SEASON', item.id, {
      year: body.year,
      status: body.status,
    });
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
          entity: {
            in: [
              'CONFESSION',
              'REPORT',
              'GARBA_POST',
              'GARBA_COMMENT',
              'GARBA_REPORT',
              'GARBA_SEASON',
            ],
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
