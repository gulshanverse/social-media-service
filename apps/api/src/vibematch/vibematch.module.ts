import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../admin-auth';
import { SubmissionRateLimiter } from '../confessions/rate-limit';
import {
  createEmailProvider,
  DevelopmentEmailProvider,
  type EmailProvider,
} from './email-provider';
import {
  atomicallyClaimMagicLink,
  createToken,
  emailHash,
  hashValue,
  normalizeEmail,
  requireIdentity,
  setSessionCookie,
  clearSessionCookie,
  VibeAuthGuard,
  VibeCsrfGuard,
  type VibeRequest,
} from './auth';
import {
  AnswerDto,
  BlockMatchDto,
  EligibilityDto,
  MagicLinkDto,
  ProfileDto,
  VIBE_INTENTS,
} from './dto';
import {
  canDiscover,
  isValidSnapshot,
  MATCHING_ALGORITHM_VERSION,
  selectTopMatches,
  type MatchParticipant,
  type Snapshot,
} from './matching';
import {
  addContribution,
  emptyDna,
  findOption,
  findQuestion,
  normalizeDna,
  selectQuestions,
  VIBE_SCORING_VERSION,
  VIBE_SESSION_LENGTH,
} from './questions';

const profileSelect = {
  id: true,
  displayName: true,
  instagramUsername: true,
  college: { select: { id: true, slug: true, name: true } },
  primaryIntent: true,
  secondaryIntent: true,
  interests: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;
function validateProfile(dto: ProfileDto) {
  if (dto.secondaryIntent && dto.secondaryIntent === dto.primaryIntent)
    throw new HttpException('Primary and secondary intents must differ.', HttpStatus.BAD_REQUEST);
  if (!dto.ageConfirmed)
    throw new HttpException('You must confirm you are 18 or older.', HttpStatus.BAD_REQUEST);
  const handle = dto.instagramUsername?.trim().replace(/^@/, '');
  if (handle && !/^[A-Za-z0-9._]{1,30}$/.test(handle))
    throw new HttpException('Instagram username is invalid.', HttpStatus.BAD_REQUEST);
  return {
    ...dto,
    displayName: dto.displayName.trim(),
    instagramUsername: handle || null,
    interests: [...new Set((dto.interests ?? []).map((item) => item.trim()).filter(Boolean))].slice(
      0,
      20,
    ),
  };
}
function publicSession(session: any, answers: any[] = []) {
  return {
    id: session.id,
    status: session.status,
    totalRounds: session.totalRounds,
    currentRound: session.currentRound,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    scoringVersion: session.scoringVersion,
    answers: answers.map((a) => ({
      round: a.round,
      questionId: a.questionId,
      optionId: a.optionId,
      answeredAt: a.answeredAt,
    })),
  };
}
function publicQuestion(question: any) {
  return {
    id: question.id,
    prompt: question.prompt,
    category: question.category,
    roundType: question.roundType,
    answerOptions: question.answerOptions.map((o: any) => ({ id: o.id, label: o.label })),
  };
}

const DISCOVERY_CANDIDATE_POOL_LIMIT = 500;
const matchSnapshotSelect = {
  socialEnergy: true,
  adventure: true,
  spontaneity: true,
  humor: true,
  communication: true,
  intent: true,
  coverage: true,
  answerCount: true,
} as const;
const matchSessionInclude = {
  where: {
    status: 'COMPLETED' as const,
    completedAt: { not: null },
    dnaSnapshots: { some: {} },
  },
  orderBy: { completedAt: 'desc' as const },
  take: 10,
  include: {
    _count: { select: { answers: true } },
    dnaSnapshots: {
      orderBy: { calculatedAt: 'desc' as const },
      take: 1,
      select: matchSnapshotSelect,
    },
  },
};
const matchProfileSelect = {
  id: true,
  identityId: true,
  discoveryKey: true,
  displayName: true,
  collegeId: true,
  primaryIntent: true,
  secondaryIntent: true,
  interests: true,
  status: true,
  college: { select: { name: true, active: true } },
  identity: { select: { status: true, ageConfirmed: true } },
  sessions: matchSessionInclude,
} as const;

type MatchSnapshotRecord = {
  socialEnergy: number;
  adventure: number;
  spontaneity: number;
  humor: number;
  communication: number;
  intent: number;
  coverage: number;
  answerCount: number;
};
type MatchProfileRecord = {
  id: string;
  identityId: string;
  discoveryKey: string;
  displayName: string;
  collegeId: string;
  primaryIntent: string;
  secondaryIntent: string | null;
  interests: unknown;
  status: string;
  college: { name: string; active: boolean };
  identity: { status: string; ageConfirmed: boolean };
  sessions: Array<{
    status: string;
    completedAt: Date | null;
    totalRounds: number;
    _count: { answers: number };
    dnaSnapshots: MatchSnapshotRecord[];
  }>;
};

function matchingParticipant(profile: MatchProfileRecord): MatchParticipant {
  const selected = profile.sessions.find((session) => {
    const snapshot = session.dnaSnapshots[0];
    return Boolean(
      session.completedAt &&
      session._count.answers >= session.totalRounds &&
      snapshot &&
      snapshot.answerCount >= session.totalRounds &&
      isValidSnapshot(snapshot as Snapshot),
    );
  });
  const rawSnapshot = selected?.dnaSnapshots[0];
  const snapshot: Snapshot | null = rawSnapshot ? { ...rawSnapshot } : null;
  return {
    identityId: profile.identityId,
    matchKey: profile.discoveryKey,
    displayName: profile.displayName,
    collegeId: profile.collegeId,
    collegeName: profile.college.name,
    profileStatus: profile.status,
    identityStatus: profile.identity.status,
    ageConfirmed: profile.identity.ageConfirmed,
    primaryIntent: profile.primaryIntent,
    secondaryIntent: profile.secondaryIntent,
    interests: profile.interests,
    session: selected
      ? {
          status: selected.status,
          completedAt: selected.completedAt,
          totalRounds: selected.totalRounds,
          answerCount: selected._count.answers,
          snapshot,
        }
      : null,
    blockedByRequester: false,
    requesterBlockedByCandidate: false,
  };
}

@Controller('vibematch/auth')
export class VibeAuthController {
  private readonly limiter = new SubmissionRateLimiter();
  constructor(@Inject('VIBE_EMAIL_PROVIDER') private readonly emailProvider: EmailProvider) {}
  @Post('magic-link') async requestLink(@Body() dto: MagicLinkDto, @Req() request: Request) {
    const key = request.ip || 'anonymous';
    const result = this.limiter.check(
      key,
      Number(process.env.VIBEMATCH_MAGIC_LINK_RATE_LIMIT ?? 5),
      Number(process.env.VIBEMATCH_MAGIC_LINK_RATE_WINDOW_SECONDS ?? 900),
    );
    if (!result.allowed)
      throw new HttpException(
        'Too many sign-in requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const email = normalizeEmail(dto.email);
    const token = createToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const existing = await prisma.vibeIdentity.findUnique({
      where: { emailHash: emailHash(email) },
    });
    await prisma.vibeMagicLink.updateMany({
      where: { emailHash: emailHash(email), usedAt: null },
      data: { usedAt: new Date() },
    });
    await prisma.vibeMagicLink.create({
      data: {
        identityId: existing?.id,
        emailHash: emailHash(email),
        tokenHash: hashValue(token),
        expiresAt,
      },
    });
    await this.emailProvider.sendMagicLink({ email, token, expiresAt });
    return {
      message: 'If that email can receive messages, a sign-in link has been sent.',
      ...(this.emailProvider instanceof DevelopmentEmailProvider &&
      process.env.NODE_ENV !== 'production'
        ? { developmentToken: token }
        : {}),
    };
  }
  @Post('verify') async verify(
    @Body('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!token || typeof token !== 'string' || token.length > 200)
      throw new HttpException('Invalid sign-in link.', HttpStatus.BAD_REQUEST);
    const tokenHash = hashValue(token);
    const link = await prisma.vibeMagicLink.findUnique({ where: { tokenHash } });
    if (!link || link.usedAt || link.expiresAt <= new Date())
      throw new HttpException('Invalid or expired sign-in link.', HttpStatus.UNAUTHORIZED);
    const sessionToken = createToken();
    const identity = await prisma.$transaction(async (tx) => {
      const claimedAt = new Date();
      const claimed = await atomicallyClaimMagicLink(
        (args) => tx.vibeMagicLink.updateMany(args),
        link.id,
        claimedAt,
      );
      if (!claimed)
        throw new HttpException('Invalid or expired sign-in link.', HttpStatus.UNAUTHORIZED);
      const identity = link.identityId
        ? await tx.vibeIdentity.findUnique({ where: { id: link.identityId } })
        : await tx.vibeIdentity.create({ data: { emailHash: link.emailHash } });
      if (!identity || identity.status !== 'ACTIVE')
        throw new HttpException('Unable to sign in.', HttpStatus.UNAUTHORIZED);
      await tx.vibeMagicLink.update({
        where: { id: link.id },
        data: { identityId: identity.id },
      });
      await tx.vibeIdentitySession.create({
        data: {
          identityId: identity.id,
          tokenHash: hashValue(sessionToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return identity;
    });
    setSessionCookie(response, sessionToken);
    return {
      authenticated: true,
      hasProfile: Boolean(
        await prisma.vibeProfile.findUnique({
          where: { identityId: identity.id },
          select: { id: true },
        }),
      ),
    };
  }
  @Post('eligibility')
  @UseGuards(VibeAuthGuard, VibeCsrfGuard)
  async eligibility(@Body() dto: EligibilityDto, @Req() request: VibeRequest) {
    const identity = await requireIdentity(request);
    if (!dto.ageConfirmed)
      throw new HttpException('You must confirm you are 18 or older.', HttpStatus.BAD_REQUEST);
    await prisma.vibeIdentity.update({ where: { id: identity.id }, data: { ageConfirmed: true } });
    return { ageConfirmed: true };
  }
  @Post('logout')
  @UseGuards(VibeAuthGuard, VibeCsrfGuard)
  async logout(@Req() request: VibeRequest, @Res({ passthrough: true }) response: Response) {
    const raw = request.headers.cookie
      ?.split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith('vibe_session='))
      ?.slice(13);
    if (raw)
      await prisma.vibeIdentitySession.updateMany({
        where: { tokenHash: hashValue(raw), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    clearSessionCookie(response);
    return { authenticated: false };
  }
}

@Controller('vibematch')
@UseGuards(VibeAuthGuard, VibeCsrfGuard)
export class VibeMatchController {
  private readonly limiter = new SubmissionRateLimiter();
  private readonly discoveryLimiter = new SubmissionRateLimiter();
  private readonly blockLimiter = new SubmissionRateLimiter();
  @Get('colleges') colleges() {
    return prisma.vibeCollege.findMany({
      where: { active: true },
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
  @Get('discovery') async discovery(@Req() request: VibeRequest) {
    const identity = await requireIdentity(request);
    if (!this.discoveryLimiter.check(identity.id, 30, 60).allowed)
      throw new HttpException(
        'Too many discovery refreshes. Please try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const requesterRecord = await prisma.vibeProfile.findUnique({
      where: { identityId: identity.id },
      select: matchProfileSelect,
    });
    if (
      !requesterRecord ||
      requesterRecord.status !== 'ACTIVE' ||
      requesterRecord.identity.status !== 'ACTIVE' ||
      !requesterRecord.identity.ageConfirmed ||
      !requesterRecord.college.active
    )
      throw new HttpException(
        'An active, eligible VibeMatch profile is required.',
        HttpStatus.FORBIDDEN,
      );
    const requester = matchingParticipant(requesterRecord);
    if (!canDiscover(requester))
      throw new HttpException(
        'Complete your VibeMatch game before discovering matches.',
        HttpStatus.BAD_REQUEST,
      );

    const candidates = await prisma.vibeProfile.findMany({
      where: {
        id: { not: requesterRecord.id },
        collegeId: requesterRecord.collegeId,
        status: 'ACTIVE',
        college: { is: { active: true } },
        identity: {
          is: {
            status: 'ACTIVE',
            ageConfirmed: true,
            blocksReceived: { none: { blockerIdentityId: identity.id } },
            blocksMade: { none: { blockedIdentityId: identity.id } },
          },
        },
        sessions: { some: matchSessionInclude.where },
      },
      select: matchProfileSelect,
      orderBy: { id: 'asc' },
      take: DISCOVERY_CANDIDATE_POOL_LIMIT,
    });
    return {
      algorithmVersion: MATCHING_ALGORITHM_VERSION,
      campus: requesterRecord.college.name,
      matches: selectTopMatches(
        requester,
        candidates.map((candidate) => matchingParticipant(candidate as MatchProfileRecord)),
      ),
    };
  }
  @Post('blocks') async blockMatch(@Body() dto: BlockMatchDto, @Req() request: VibeRequest) {
    const identity = await requireIdentity(request);
    if (!this.blockLimiter.check(identity.id, 40, 60 * 60).allowed)
      throw new HttpException(
        'Too many block requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const requester = await prisma.vibeProfile.findUnique({
      where: { identityId: identity.id },
      select: { collegeId: true, status: true, college: { select: { active: true } } },
    });
    if (
      !requester ||
      requester.status !== 'ACTIVE' ||
      !requester.college.active ||
      !identity.ageConfirmed
    )
      throw new HttpException(
        'An active, eligible VibeMatch profile is required.',
        HttpStatus.FORBIDDEN,
      );
    const candidate = await prisma.vibeProfile.findUnique({
      where: { discoveryKey: dto.matchKey },
      select: {
        identityId: true,
        collegeId: true,
        status: true,
        identity: { select: { status: true } },
      },
    });
    if (
      !candidate ||
      candidate.identityId === identity.id ||
      candidate.collegeId !== requester.collegeId ||
      candidate.status === 'DELETED'
    )
      throw new HttpException('VibeMatch profile not found.', HttpStatus.NOT_FOUND);
    await prisma.vibeBlock.upsert({
      where: {
        blockerIdentityId_blockedIdentityId: {
          blockerIdentityId: identity.id,
          blockedIdentityId: candidate.identityId,
        },
      },
      create: { blockerIdentityId: identity.id, blockedIdentityId: candidate.identityId },
      update: {},
    });
    return { blocked: true };
  }
  @Delete('blocks/:matchKey') async unblockMatch(
    @Param('matchKey') matchKey: string,
    @Req() request: VibeRequest,
  ) {
    const identity = await requireIdentity(request);
    if (!/^[0-9a-f-]{36}$/i.test(matchKey))
      throw new HttpException('VibeMatch profile not found.', HttpStatus.NOT_FOUND);
    const requester = await prisma.vibeProfile.findUnique({
      where: { identityId: identity.id },
      select: { collegeId: true, status: true, college: { select: { active: true } } },
    });
    const candidate = await prisma.vibeProfile.findUnique({
      where: { discoveryKey: matchKey },
      select: { identityId: true, collegeId: true },
    });
    if (
      !requester ||
      requester.status !== 'ACTIVE' ||
      !requester.college.active ||
      !identity.ageConfirmed ||
      !candidate ||
      candidate.identityId === identity.id ||
      candidate.collegeId !== requester.collegeId
    )
      throw new HttpException('VibeMatch profile not found.', HttpStatus.NOT_FOUND);
    await prisma.vibeBlock.deleteMany({
      where: { blockerIdentityId: identity.id, blockedIdentityId: candidate.identityId },
    });
    return { blocked: false };
  }
  @Get('profile') async getProfile(@Req() request: VibeRequest) {
    const identity = await requireIdentity(request);
    const profile = await prisma.vibeProfile.findUnique({
      where: { identityId: identity.id },
      select: profileSelect,
    });
    return profile ? { ...profile, email: undefined } : null;
  }
  @Post('profile') async createProfile(@Body() dto: ProfileDto, @Req() request: VibeRequest) {
    const identity = await requireIdentity(request);
    const input = validateProfile(dto);
    const existing = await prisma.vibeProfile.findUnique({
      where: { identityId: identity.id },
      select: { id: true },
    });
    if (existing) throw new HttpException('Profile already exists.', HttpStatus.CONFLICT);
    const profile = await prisma.vibeProfile.create({
      data: {
        identityId: identity.id,
        displayName: input.displayName,
        instagramUsername: input.instagramUsername,
        collegeId: input.collegeId,
        primaryIntent: input.primaryIntent,
        secondaryIntent: input.secondaryIntent,
        interests: input.interests,
      },
      select: profileSelect,
    });
    await prisma.vibeIdentity.update({ where: { id: identity.id }, data: { ageConfirmed: true } });
    return profile;
  }
  @Patch('profile') async updateProfile(@Body() dto: ProfileDto, @Req() request: VibeRequest) {
    const identity = await requireIdentity(request);
    const input = validateProfile(dto);
    const profile = await prisma.vibeProfile.update({
      where: { identityId: identity.id },
      data: {
        displayName: input.displayName,
        instagramUsername: input.instagramUsername,
        collegeId: input.collegeId,
        primaryIntent: input.primaryIntent,
        secondaryIntent: input.secondaryIntent,
        interests: input.interests,
      },
      select: profileSelect,
    });
    return profile;
  }
  @Delete('profile') async deleteProfile(@Req() request: VibeRequest) {
    const identity = await requireIdentity(request);
    await prisma.vibeProfile.update({
      where: { identityId: identity.id },
      data: { status: 'DELETED' },
    });
    return { deleted: true };
  }
  @Post('sessions') async createSession(@Req() request: VibeRequest) {
    const identity = await requireIdentity(request);
    const profile = await prisma.vibeProfile.findUnique({ where: { identityId: identity.id } });
    if (!profile || profile.status !== 'ACTIVE' || !identity.ageConfirmed)
      throw new HttpException('An active eligible profile is required.', HttpStatus.FORBIDDEN);
    const unfinished = await prisma.vibeSession.findFirst({
      where: { profileId: profile.id, status: 'PLAYING' },
      orderBy: { updatedAt: 'desc' },
    });
    if (unfinished) return this.sessionPayload(unfinished.id, profile.id);
    if (
      !this.limiter.check(
        identity.id,
        Number(process.env.VIBEMATCH_SESSION_RATE_LIMIT ?? 10),
        Number(process.env.VIBEMATCH_SESSION_RATE_WINDOW_SECONDS ?? 3600),
      ).allowed
    )
      throw new HttpException(
        'Too many game sessions. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const seed = Math.floor(Math.random() * 2147483647);
    const questionIds = selectQuestions(seed).map((q) => q.id);
    const session = await prisma.vibeSession.create({
      data: {
        profileId: profile.id,
        seed,
        totalRounds: questionIds.length,
        questionIds,
        scoringVersion: VIBE_SCORING_VERSION,
      },
    });
    return this.sessionPayload(session.id, profile.id);
  }
  @Get('sessions/:id') async getSession(@Param('id') id: string, @Req() request: VibeRequest) {
    return this.sessionPayload(id, (await this.profileFor(request)).id);
  }
  @Get('sessions/:id/current-round') async currentRound(
    @Param('id') id: string,
    @Req() request: VibeRequest,
  ) {
    const session = await this.ownedSession(id, request);
    const ids = session.questionIds as string[];
    const question = findQuestion(ids[session.currentRound]);
    if (!question) throw new HttpException('Round not found.', HttpStatus.NOT_FOUND);
    return { session: publicSession(session, session.answers), question: publicQuestion(question) };
  }
  @Post('sessions/:id/answers') async answer(
    @Param('id') id: string,
    @Body() dto: AnswerDto,
    @Req() request: VibeRequest,
  ) {
    const session = await this.ownedSession(id, request);
    const existingByKey = await prisma.vibeSessionAnswer.findUnique({
      where: { sessionId_idempotencyKey: { sessionId: id, idempotencyKey: dto.idempotencyKey } },
    });
    if (existingByKey) {
      if (existingByKey.optionId !== dto.optionId)
        throw new HttpException(
          'That idempotency key was already used for a different answer.',
          HttpStatus.CONFLICT,
        );
      return { session: await this.sessionPayload(id, session.profileId), duplicate: true };
    }
    const questionId = (session.questionIds as string[])[session.currentRound];
    const question = findQuestion(questionId);
    const option = question && findOption(question, dto.optionId);
    if (!question || !option)
      throw new HttpException(
        'That answer is not available for this round.',
        HttpStatus.BAD_REQUEST,
      );
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const previous = await tx.vibeSessionAnswer.findUnique({
          where: { sessionId_questionId: { sessionId: id, questionId } },
        });
        if (previous) {
          if (previous.optionId !== option.id)
            throw new HttpException('This round has already been answered.', HttpStatus.CONFLICT);
          return { duplicate: true, completed: false };
        }
        await tx.vibeSessionAnswer.create({
          data: {
            sessionId: id,
            round: session.currentRound,
            questionId,
            optionId: option.id,
            contribution: option.dnaContribution,
            idempotencyKey: dto.idempotencyKey,
          },
        });
        const count = await tx.vibeSessionAnswer.count({ where: { sessionId: id } });
        await tx.vibeSession.update({
          where: { id },
          data: {
            currentRound: count >= session.totalRounds ? session.totalRounds : count,
            status: count >= session.totalRounds ? 'COMPLETED' : 'PLAYING',
            completedAt: count >= session.totalRounds ? new Date() : null,
          },
        });
        return { duplicate: false, completed: count >= session.totalRounds };
      });
      if (outcome.completed) await this.completeDna(id, session.scoringVersion);
      return {
        session: await this.sessionPayload(id, session.profileId),
        duplicate: outcome.duplicate,
      };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
      const racedByKey = await prisma.vibeSessionAnswer.findUnique({
        where: { sessionId_idempotencyKey: { sessionId: id, idempotencyKey: dto.idempotencyKey } },
      });
      if (racedByKey) {
        if (racedByKey.optionId !== option.id)
          throw new HttpException(
            'That idempotency key was already used for a different answer.',
            HttpStatus.CONFLICT,
          );
        return { session: await this.sessionPayload(id, session.profileId), duplicate: true };
      }
      const racedByQuestion = await prisma.vibeSessionAnswer.findUnique({
        where: { sessionId_questionId: { sessionId: id, questionId } },
      });
      if (racedByQuestion) {
        if (racedByQuestion.optionId !== option.id)
          throw new HttpException('This round has already been answered.', HttpStatus.CONFLICT);
        return { session: await this.sessionPayload(id, session.profileId), duplicate: true };
      }
      throw error;
    }
  }
  @Post('sessions/:id/complete') async complete(
    @Param('id') id: string,
    @Req() request: VibeRequest,
  ) {
    const session = await this.ownedSession(id, request);
    if (session.status !== 'COMPLETED')
      throw new HttpException('Session is not complete.', HttpStatus.BAD_REQUEST);
    await this.completeDna(id, session.scoringVersion);
    return this.result(id, session.profileId);
  }
  @Get('sessions/:id/result') async resultEndpoint(
    @Param('id') id: string,
    @Req() request: VibeRequest,
  ) {
    const session = await this.ownedSession(id, request);
    return this.result(id, session.profileId);
  }
  private async profileFor(request: VibeRequest) {
    const identity = await requireIdentity(request);
    const profile = await prisma.vibeProfile.findUnique({ where: { identityId: identity.id } });
    if (!profile || profile.status === 'DELETED')
      throw new HttpException('Profile not found.', HttpStatus.NOT_FOUND);
    return profile;
  }
  private async ownedSession(id: string, request: VibeRequest) {
    const profile = await this.profileFor(request);
    const session = await prisma.vibeSession.findFirst({
      where: { id, profileId: profile.id },
      include: { answers: { orderBy: { round: 'asc' } } },
    });
    if (!session) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND);
    return session;
  }
  private async sessionPayload(id: string, profileId: string) {
    const session = await prisma.vibeSession.findFirst({
      where: { id, profileId },
      include: { answers: { orderBy: { round: 'asc' } } },
    });
    if (!session) throw new HttpException('Session not found.', HttpStatus.NOT_FOUND);
    const ids = session.questionIds as string[];
    const question =
      session.status === 'PLAYING' ? findQuestion(ids[session.currentRound]) : undefined;
    return {
      session: publicSession(session, session.answers),
      ...(question ? { question: publicQuestion(question) } : {}),
    };
  }
  private async completeDna(id: string, scoringVersion: string) {
    const answers = await prisma.vibeSessionAnswer.findMany({
      where: { sessionId: id },
      orderBy: { round: 'asc' },
    });
    let dna = emptyDna();
    for (const answer of answers)
      dna = addContribution(dna, answer.contribution as Record<string, number>);
    const normalized = normalizeDna(dna);
    const existing = await prisma.vibeDnaSnapshot.findFirst({
      where: { sessionId: id },
      orderBy: { calculatedAt: 'desc' },
    });
    if (!existing)
      await prisma.vibeDnaSnapshot.create({
        data: {
          sessionId: id,
          scoringVersion,
          ...normalized,
          coverage: Math.round((answers.length / VIBE_SESSION_LENGTH) * 100),
          answerCount: answers.length,
        },
      });
  }
  private async result(id: string, profileId: string) {
    const snapshot = await prisma.vibeDnaSnapshot.findFirst({
      where: { sessionId: id },
      orderBy: { calculatedAt: 'desc' },
      select: {
        scoringVersion: true,
        socialEnergy: true,
        adventure: true,
        spontaneity: true,
        humor: true,
        communication: true,
        intent: true,
        coverage: true,
        answerCount: true,
        calculatedAt: true,
      },
    });
    if (!snapshot) throw new HttpException('Result not found.', HttpStatus.NOT_FOUND);
    return { sessionId: id, profileId: undefined, result: snapshot };
  }
}

@Module({
  controllers: [VibeAuthController, VibeMatchController],
  providers: [
    VibeAuthGuard,
    VibeCsrfGuard,
    { provide: 'VIBE_EMAIL_PROVIDER', useFactory: createEmailProvider },
  ],
})
export class VibeMatchModule {}
