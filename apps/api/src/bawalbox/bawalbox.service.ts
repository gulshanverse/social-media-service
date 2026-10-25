import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BawalBoxQuestionStatus, BawalBoxResponseStatus } from '@prisma/client';
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
    const question = await prisma.bawalBoxQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        answerLimit: true,
        _count: { select: { responses: true } },
      },
    });
    if (!question || question.status !== BawalBoxQuestionStatus.PUBLISHED)
      throw new NotFoundException('This question is no longer accepting answers.');
    const now = new Date();
    if ((question.startAt && question.startAt > now) || (question.endAt && question.endAt < now))
      throw new BadRequestException('This question is not currently open.');
    if (question.answerLimit && question._count.responses >= question.answerLimit)
      throw new BadRequestException('This question has reached its response limit.');
    const response = await prisma.bawalBoxResponse.create({
      data: { questionId, content: content.trim() },
    });
    return {
      id: response.id,
      status: 'PENDING',
      message: 'Your anonymous response is queued for review.',
    };
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
    const data = this.questionData(body);
    if (body.featured)
      await prisma.bawalBoxQuestion.updateMany({
        where: { featured: true },
        data: { featured: false },
      });
    const item = await prisma.bawalBoxQuestion.create({
      data: {
        ...data,
        publishedAt: body.status === BawalBoxQuestionStatus.PUBLISHED ? new Date() : undefined,
      },
    });
    await recordAudit(actor.id, 'BAWALBOX_QUESTION_CREATED', 'BAWALBOX_QUESTION', item.id);
    return item;
  }

  async updateQuestion(id: string, body: UpdateBawalBoxQuestionDto, actor: AdminIdentity) {
    const current = await prisma.bawalBoxQuestion.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('BawalBox question not found.');
    const data = this.questionData(body);
    if (body.featured)
      await prisma.bawalBoxQuestion.updateMany({
        where: { featured: true, id: { not: id } },
        data: { featured: false },
      });
    const item = await prisma.bawalBoxQuestion.update({
      where: { id },
      data: {
        ...data,
        publishedAt:
          body.status === BawalBoxQuestionStatus.PUBLISHED && !current.publishedAt
            ? new Date()
            : current.publishedAt,
      },
    });
    await recordAudit(actor.id, 'BAWALBOX_QUESTION_UPDATED', 'BAWALBOX_QUESTION', id, {
      changedFields: Object.keys(data),
    });
    return item;
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

  private questionData(body: CreateBawalBoxQuestionDto | UpdateBawalBoxQuestionDto) {
    return {
      title: body.title?.trim(),
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
}
