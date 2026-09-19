import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole, ConfessionStatus, ReportStatus } from '@prisma/client';
import { prisma, recordAudit, AdminIdentity } from './admin-auth';

@Injectable()
export class AdminService {
  async queue(query: {
    page?: number;
    limit?: number;
    status?: ConfessionStatus;
    category?: string;
    theme?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where = {
      status: query.status ?? ConfessionStatus.PENDING,
      ...(query.category ? { category: query.category as never } : {}),
      ...(query.theme ? { theme: { slug: query.theme } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.confession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
        theme: true,
        editor: { select: { id: true, email: true, role: true } },
        reports: {
          select: { id: true, reason: true, status: true, createdAt: true, resolvedAt: true },
        },
      },
    });
    if (!item) throw new NotFoundException('Confession not found.');
    return item;
  }
  async edit(
    id: string,
    body: { content?: string; category?: string; themeId?: string },
    actor: AdminIdentity,
  ) {
    const data: { content?: string; category?: never; themeId?: string } = {};
    if (body.content !== undefined) {
      const content = body.content.trim();
      if (!content || content.length > 1000)
        throw new BadRequestException('Content must be between 1 and 1000 characters.');
      data.content = content;
    }
    if (body.category !== undefined) data.category = body.category as never;
    if (body.themeId !== undefined) {
      const theme = await prisma.theme.findUnique({ where: { slug: body.themeId } });
      if (!theme) throw new BadRequestException('Invalid theme.');
      data.themeId = theme.id;
    }
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
        theme: { select: { slug: true, name: true } },
      },
    });
    await recordAudit(actor.id, 'EDIT', 'CONFESSION', id, { changedFields: Object.keys(data) });
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
    return item;
  }
  async reports(query: { page?: number; limit?: number; status?: ReportStatus }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          confession: { select: { id: true, publicId: true, content: true, status: true } },
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
      },
    });
    if (!item) throw new NotFoundException('Report not found.');
    return item;
  }
  async reportAction(id: string, action: 'resolve' | 'dismiss', actor: AdminIdentity) {
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
    return item;
  }
  async audit(query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
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
      prisma.auditLog.count(),
    ]);
    return { items, page, limit, total, hasMore: page * limit < total };
  }
  async themes() {
    return prisma.theme.findMany({
      orderBy: { name: 'asc' },
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
    });
  }
  async createTheme(body: Record<string, unknown>, actor: AdminIdentity) {
    const data = {
      slug: String(body.slug),
      name: String(body.name),
      background: String(body.background),
      gradient: String(body.gradient),
      textColor: String(body.textColor),
      accentColor: String(body.accentColor),
      fontFamily: String(body.fontFamily),
      radius: Number(body.radius ?? 28),
    };
    const item = await prisma.theme.create({ data });
    await recordAudit(actor.id, 'THEME_CREATE', 'THEME', item.id);
    return item;
  }
  async updateTheme(id: string, body: Record<string, unknown>, actor: AdminIdentity) {
    const allowed = [
      'name',
      'background',
      'gradient',
      'textColor',
      'accentColor',
      'fontFamily',
      'radius',
    ];
    const data = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
    const item = await prisma.theme.update({ where: { id }, data });
    await recordAudit(actor.id, 'THEME_UPDATE', 'THEME', id, { changedFields: Object.keys(data) });
    return item;
  }
  async dashboard() {
    const [pending, published, rejected, openReports] = await Promise.all([
      prisma.confession.count({ where: { status: 'PENDING' } }),
      prisma.confession.count({ where: { status: 'PUBLISHED' } }),
      prisma.confession.count({ where: { status: 'REJECTED' } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
    ]);
    return { pending, published, rejected, openReports };
  }
}
