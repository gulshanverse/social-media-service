import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BawalBoxQuestionStatus, BawalBoxResponseStatus, Prisma } from '@prisma/client';
import { prisma, recordAudit, type AdminIdentity } from '../admin-auth';
import {
  CreateBawalBoxQuestionDto,
  ModerateBawalBoxResponseDto,
  UpdateBawalBoxQuestionDto,
  UpdateBawalBoxSettingsDto,
} from './dto';

const defaults = {
  id: 'default',
  brandName: 'BawalBox',
  tagline: 'Sawaal ek, bawal anek!',
  shortDescription: 'Anonymous campus questions, honest answers, and a little good-natured bawal.',
  longDescription:
    'Ask the question everyone is thinking and let your campus answer anonymously. Responses are reviewed before they appear.',
  accentColor: '#ff2d75',
  seoTitle: 'BawalBox — Anonymous campus questions',
  seoDescription: 'Ask, answer, and discover the questions shaping campus life.',
  socialTitle: 'BawalBox — Sawaal ek, bawal anek!',
  socialDescription: 'Anonymous campus questions and community answers.',
  homepageTeaserTitle: 'Ask the question everyone is thinking.',
  homepageTeaserDescription: 'BawalBox is now open for anonymous campus questions.',
  homepageTeaserCta: 'Open BawalBox',
  navLabel: 'BawalBox',
  navVisible: true,
  teaserVisible: true,
  introTitle: 'The question is anonymous. The bawal is communal.',
  introDescription:
    'Share a question, read what your campus thinks, and keep it kind. No public profile required.',
  introCta: 'Ask anonymously',
  archivedVisible: true,
  emptyStateText: 'No question is live right now. Check back soon for the next one.',
  heroEnabled: true,
  heroHeading: 'BawalBox is open',
  heroSubtitle: 'One question. Many campus answers.',
  heroTagline: 'Sawaal ek, bawal anek!',
  heroCtaLabel: 'Try the question',
  heroCtaUrl: '/bawalbox',
  heroAltText: 'BawalBox anonymous campus questions',
};

@Injectable()
export class BawalBoxService {
  async settings() {
    return {
      ...defaults,
      ...(await prisma.bawalBoxSettings.findUnique({ where: { id: 'default' } })),
    };
  }

  async updateSettings(body: UpdateBawalBoxSettingsDto, actor: AdminIdentity) {
    if (body.heroCtaUrl && !body.heroCtaUrl.startsWith('/') && !/^https:\/\//.test(body.heroCtaUrl))
      throw new BadRequestException('CTA destination must be an internal route or HTTPS URL.');
    const data = Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined),
    );
    const item = await prisma.bawalBoxSettings.upsert({
      where: { id: 'default' },
      create: { ...defaults, ...data, updatedBy: actor.id },
      update: { ...data, updatedBy: actor.id },
    });
    await recordAudit(actor.id, 'BAWALBOX_SETTINGS_UPDATE', 'BAWALBOX_SETTINGS', 'default', {
      changedFields: Object.keys(data),
    });
    return item;
  }

  async publicPage() {
    const settings = await this.settings();
    const now = new Date();
    const activeWhere = {
      status: BawalBoxQuestionStatus.PUBLISHED,
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
    };
    const featured = await prisma.bawalBoxQuestion.findFirst({
      where: { ...activeWhere, featured: true },
      orderBy: { publishedAt: 'desc' },
      include: {
        responses: {
          where: { status: BawalBoxResponseStatus.APPROVED },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          take: 60,
        },
      },
    });
    const question =
      featured ??
      (await prisma.bawalBoxQuestion.findFirst({
        where: activeWhere,
        orderBy: { publishedAt: 'desc' },
        include: {
          responses: {
            where: { status: BawalBoxResponseStatus.APPROVED },
            orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
            take: 60,
          },
        },
      }));
    const archive = settings.archivedVisible
      ? await prisma.bawalBoxQuestion.findMany({
          where: {
            status: { in: [BawalBoxQuestionStatus.PUBLISHED, BawalBoxQuestionStatus.ARCHIVED] },
            ...(question ? { id: { not: question.id } } : {}),
          },
          orderBy: { publishedAt: 'desc' },
          take: 12,
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            startAt: true,
            endAt: true,
            publishedAt: true,
            _count: {
              select: { responses: { where: { status: BawalBoxResponseStatus.APPROVED } } },
            },
          },
        })
      : [];
    return { settings, featuredQuestion: question, archive };
  }

  async createResponse(questionId: string, content: string) {
    return prisma.$transaction(async (tx) => {
      // Serialize submissions for this question so concurrent requests cannot exceed the cap.
      await tx.$queryRaw`SELECT "id" FROM "BawalBoxQuestion" WHERE "id" = ${questionId} FOR UPDATE`;
      const question = await tx.bawalBoxQuestion.findUnique({
        where: { id: questionId },
        select: {
          id: true,
          status: true,
          startAt: true,
          endAt: true,
          answerLimit: true,
          // Every accepted submission consumes a positive limit, regardless of moderation status.
          _count: { select: { responses: true } },
        },
      });
      if (!question || question.status !== BawalBoxQuestionStatus.PUBLISHED)
        throw new NotFoundException('This question is no longer accepting answers.');
      const now = new Date();
      if ((question.startAt && question.startAt > now) || (question.endAt && question.endAt < now))
        throw new BadRequestException('This question is not currently open.');
      // Null (and legacy zero values, which the old truthy check treated as unlimited) mean no cap.
      if (
        question.answerLimit !== null &&
        question.answerLimit > 0 &&
        question._count.responses >= question.answerLimit
      )
        throw new BadRequestException('This question has reached its response limit.');
      const response = await tx.bawalBoxResponse.create({
        data: { questionId, content: content.trim() },
      });
      return {
        id: response.id,
        status: 'PENDING',
        message: 'Your anonymous response is queued for review.',
      };
    });
  }

  async listQuestions(status: BawalBoxQuestionStatus | undefined, page = 1, limit = 20) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.bawalBoxQuestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { responses: true } } },
      }),
      prisma.bawalBoxQuestion.count({ where }),
    ]);
    return { items, page, limit, total, hasMore: page * limit < total };
  }

  async createQuestion(body: CreateBawalBoxQuestionDto, actor: AdminIdentity) {
    this.assertQuestionWindow(
      body.startAt ? new Date(body.startAt) : null,
      body.endAt ? new Date(body.endAt) : null,
    );
    const data = this.questionCreateData(body);
    const create = (database: Pick<Prisma.TransactionClient, 'bawalBoxQuestion'>) =>
      database.bawalBoxQuestion.create({
        data: {
          ...data,
          publishedAt: body.status === BawalBoxQuestionStatus.PUBLISHED ? new Date() : undefined,
        },
      });
    const item = body.featured
      ? await prisma.$transaction(async (tx) => {
          await this.lockFeaturedQuestionSwitch(tx);
          await tx.bawalBoxQuestion.updateMany({
            where: { featured: true },
            data: { featured: false },
          });
          return create(tx);
        })
      : await create(prisma);
    await recordAudit(actor.id, 'BAWALBOX_QUESTION_CREATED', 'BAWALBOX_QUESTION', item.id);
    return item;
  }

  async updateQuestion(id: string, body: UpdateBawalBoxQuestionDto, actor: AdminIdentity) {
    const result = await prisma.$transaction(async (tx) => {
      // Keep lock ordering stable: feature advisory lock first, then the target question row.
      if (body.featured === true) await this.lockFeaturedQuestionSwitch(tx);
      await tx.$queryRaw`SELECT "id" FROM "BawalBoxQuestion" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.bawalBoxQuestion.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('BawalBox question not found.');
      const startAt =
        body.startAt === undefined ? current.startAt : body.startAt ? new Date(body.startAt) : null;
      const endAt =
        body.endAt === undefined ? current.endAt : body.endAt ? new Date(body.endAt) : null;
      this.assertQuestionWindow(startAt, endAt);
      const data = this.questionUpdateData(body);
      const updateData: Prisma.BawalBoxQuestionUpdateInput = {
        ...data,
        ...(body.status === BawalBoxQuestionStatus.PUBLISHED && !current.publishedAt
          ? { publishedAt: new Date() }
          : {}),
      };
      if (body.featured === true)
        await tx.bawalBoxQuestion.updateMany({
          where: { featured: true, id: { not: id } },
          data: { featured: false },
        });
      const item = await tx.bawalBoxQuestion.update({ where: { id }, data: updateData });
      return { item, changedFields: Object.keys(data) };
    });
    await recordAudit(actor.id, 'BAWALBOX_QUESTION_UPDATED', 'BAWALBOX_QUESTION', id, {
      changedFields: result.changedFields,
    });
    return result.item;
  }

  async responses(questionId: string, status?: BawalBoxResponseStatus) {
    return prisma.bawalBoxResponse.findMany({
      where: { questionId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderateResponse(id: string, body: ModerateBawalBoxResponseDto, actor: AdminIdentity) {
    const existing = await prisma.bawalBoxResponse.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('BawalBox response not found.');
    const item = await prisma.bawalBoxResponse.update({
      where: { id },
      data: {
        status: body.status,
        pinned: body.pinned ?? existing.pinned,
        moderatorId: actor.id,
        moderatedAt: new Date(),
      },
    });
    await recordAudit(actor.id, `BAWALBOX_RESPONSE_${body.status}`, 'BAWALBOX_RESPONSE', id, {
      questionId: existing.questionId,
    });
    return item;
  }

  private questionCreateData(body: CreateBawalBoxQuestionDto) {
    return {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      instructions: body.instructions?.trim() || null,
      category: body.category?.trim() || null,
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
      status: body.status ?? BawalBoxQuestionStatus.DRAFT,
      featured: body.featured ?? false,
      answerLimit: body.answerLimit ?? null,
    };
  }

  private questionUpdateData(body: UpdateBawalBoxQuestionDto): Prisma.BawalBoxQuestionUpdateInput {
    const data: Prisma.BawalBoxQuestionUpdateInput = {};
    if (typeof body.title === 'string') data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.instructions !== undefined) data.instructions = body.instructions?.trim() || null;
    if (body.category !== undefined) data.category = body.category?.trim() || null;
    if (body.startAt !== undefined) data.startAt = body.startAt ? new Date(body.startAt) : null;
    if (body.endAt !== undefined) data.endAt = body.endAt ? new Date(body.endAt) : null;
    if (body.status !== undefined && body.status !== null) data.status = body.status;
    if (body.featured !== undefined && body.featured !== null) data.featured = body.featured;
    if (body.answerLimit !== undefined) data.answerLimit = body.answerLimit;
    return data;
  }

  private assertQuestionWindow(startAt: Date | null, endAt: Date | null) {
    if (startAt && endAt && endAt.getTime() <= startAt.getTime())
      throw new BadRequestException('Question endAt must be after startAt.');
  }

  private async lockFeaturedQuestionSwitch(tx: Prisma.TransactionClient) {
    // Application-scoped transaction lock serializes feature switches without schema changes.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(914175203, 1)`;
  }
}
