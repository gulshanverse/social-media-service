import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { prisma, setPrismaForTests } from '../admin-auth';
import {
  atomicallyClaimMagicLink,
  assertVibeStateChangingOrigin,
  createToken,
  emailHash,
  hashValue,
  isAllowedVibeOrigin,
  normalizeEmail,
  requireVibeSession,
  VIBE_GUEST_SESSION_COOKIE,
  VIBE_GUEST_SESSION_TTL_MS,
} from './auth';
import { GuestStartDto } from './dto';
import { VibeMatchController } from './vibematch.module';
import {
  createEmailProvider,
  DevelopmentEmailProvider,
  ResendEmailProvider,
} from './email-provider';
import {
  addContribution,
  emptyDna,
  findOption,
  findQuestion,
  normalizeDna,
  selectQuestions,
} from './questions';

(async function run() {
  const realPrisma = prisma;
  const normalizedGuestInput = plainToInstance(GuestStartDto, {
    displayName: '  Sam Student  ',
    instagramUsername: ' @sam.student ',
  });
  assert.deepEqual(await validate(normalizedGuestInput), []);
  assert.equal(normalizedGuestInput.displayName, 'Sam Student');
  assert.equal(normalizedGuestInput.instagramUsername, 'sam.student');
  assert.ok(
    (
      await validate(
        plainToInstance(GuestStartDto, {
          displayName: ' ',
          instagramUsername: 'https://instagram.com/sam',
        }),
      )
    ).length > 0,
  );

  const guestToken = createToken();
  const guestRecord = {
    id: 'guest-session-test',
    expiresAt: new Date(Date.now() + VIBE_GUEST_SESSION_TTL_MS),
    revokedAt: null,
  };
  let touchedGuestId = '';
  setPrismaForTests({
    vibeGuestSession: {
      findUnique: async ({ where }: { where: { tokenHash: string } }) => {
        assert.equal(where.tokenHash, hashValue(guestToken));
        return guestRecord;
      },
      update: async ({ where }: { where: { id: string } }) => {
        touchedGuestId = where.id;
        return guestRecord;
      },
    },
  } as never);
  const guestRequest = {
    headers: {
      'x-vibematch-mode': 'guest',
      cookie: `${VIBE_GUEST_SESSION_COOKIE}=${guestToken}`,
    },
  } as never;
  const guestPrincipal = await requireVibeSession(guestRequest);
  assert.equal(guestPrincipal.kind, 'guest');
  assert.equal(touchedGuestId, guestRecord.id);
  const expiredGuestRequest = {
    headers: {
      'x-vibematch-mode': 'guest',
      cookie: `${VIBE_GUEST_SESSION_COOKIE}=${guestToken}`,
    },
  } as never;
  guestRecord.expiresAt = new Date(Date.now() - 1);
  await assert.rejects(
    () => requireVibeSession(expiredGuestRequest),
    /Quick Play session has expired/,
  );
  setPrismaForTests(realPrisma);

  const firstGuestToken = createToken();
  const secondGuestToken = createToken();
  const testSessions: Array<Record<string, any>> = [];
  const controllerPrisma = {
    vibeGuestSession: {
      findUnique: async ({ where }: { where: { tokenHash: string } }) => ({
        id: where.tokenHash === hashValue(firstGuestToken) ? 'guest-one' : 'guest-two',
        expiresAt: new Date(Date.now() + VIBE_GUEST_SESSION_TTL_MS),
        revokedAt: null,
      }),
      update: async () => ({}),
    },
    vibeSession: {
      findFirst: async ({ where }: { where: Record<string, any> }) =>
        testSessions.find((session) =>
          Object.entries(where).every(([key, value]) => session[key] === value),
        ) ?? null,
      create: async ({ data }: { data: Record<string, any> }) => {
        const session = {
          ...data,
          id: 'guest-game-one',
          status: 'PLAYING',
          currentRound: 0,
          startedAt: new Date(),
          completedAt: null,
          answers: [],
        };
        testSessions.push(session);
        return session;
      },
    },
  };
  setPrismaForTests(controllerPrisma as never);
  const controller = new VibeMatchController();
  const firstGuestRequest = {
    headers: {
      'x-vibematch-mode': 'guest',
      cookie: `${VIBE_GUEST_SESSION_COOKIE}=${firstGuestToken}`,
    },
  } as never;
  const createdGuestGame = await controller.createSession(firstGuestRequest);
  assert.equal(createdGuestGame.session.id, 'guest-game-one');
  assert.equal(testSessions[0].guestSessionId, 'guest-one');
  assert.equal(testSessions[0].profileId, undefined);
  const secondGuestRequest = {
    headers: {
      'x-vibematch-mode': 'guest',
      cookie: `${VIBE_GUEST_SESSION_COOKIE}=${secondGuestToken}`,
    },
  } as never;
  await assert.rejects(
    () => controller.currentRound('guest-game-one', secondGuestRequest),
    /Session not found/,
  );
  setPrismaForTests(realPrisma);

  assert.equal(normalizeEmail('  Person@Example.COM '), 'person@example.com');
  assert.equal(emailHash('Person@example.com'), emailHash(' person@EXAMPLE.COM '));
  const token = createToken();
  assert.equal(token.length > 30, true);
  assert.notEqual(token, hashValue(token));

  const selected = selectQuestions(42);
  assert.equal(selected.length, 7);
  assert.equal(new Set(selected.map((question) => question.id)).size, 7);
  assert.equal(
    selected.every((question) => question.active),
    true,
  );
  const option = findOption(selected[0], selected[0].answerOptions[0].id);
  assert.ok(option);
  assert.equal(findOption(selected[0], 'tampered-option'), undefined);

  const dna = addContribution(emptyDna(), option.dnaContribution);
  const normalized = normalizeDna(dna);
  assert.equal(Object.keys(normalized).length, 6);
  assert.equal(
    Object.values(normalized).every((value) => value >= 0 && value <= 100),
    true,
  );
  assert.equal(findQuestion('not-a-server-question'), undefined);

  const provider = new DevelopmentEmailProvider();
  const expiresAt = new Date(Date.now() + 60_000);
  await provider.sendMagicLink({ email: 'person@example.com', token, expiresAt });
  assert.equal(provider.delivered[0].token, token);
  assert.equal(provider.delivered[0].email, 'person@example.com');
  let usedAt: Date | null = null;
  const atomicUpdate = async ({ data }: { data: { usedAt: Date } }) => {
    if (usedAt) return { count: 0 };
    usedAt = data.usedAt;
    return { count: 1 };
  };
  const claims = await Promise.all([
    atomicallyClaimMagicLink(atomicUpdate, 'link-1'),
    atomicallyClaimMagicLink(atomicUpdate, 'link-1'),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
  assert.ok(createEmailProvider({ NODE_ENV: 'development' }) instanceof DevelopmentEmailProvider);
  assert.ok(
    createEmailProvider({
      NODE_ENV: 'production',
      RESEND_API_KEY: 'resend-test-key-placeholder',
      VIBEMATCH_EMAIL_FROM: 'VibeMatch <no-reply@example.test>',
      VIBEMATCH_APP_URL: 'https://vibe.example.com/',
      WEB_ORIGIN: 'https://vibe.example.com/',
    }) instanceof ResendEmailProvider,
  );
  assert.throws(
    () => createEmailProvider({ NODE_ENV: 'production' }),
    /RESEND_API_KEY, VIBEMATCH_EMAIL_FROM, VIBEMATCH_APP_URL/,
  );
  const validOrigin = {
    method: 'POST',
    headers: { origin: 'https://vibe.example.com' },
  } as never;
  assert.equal(
    isAllowedVibeOrigin(validOrigin, {
      NODE_ENV: 'production',
      WEB_ORIGIN: 'https://vibe.example.com',
    }),
    true,
  );
  assert.doesNotThrow(() =>
    assertVibeStateChangingOrigin(validOrigin, {
      NODE_ENV: 'production',
      WEB_ORIGIN: 'https://vibe.example.com',
    }),
  );
  assert.throws(
    () =>
      assertVibeStateChangingOrigin(
        { method: 'POST', headers: { origin: 'https://evil.example.com' } } as never,
        { NODE_ENV: 'production', WEB_ORIGIN: 'https://vibe.example.com' },
      ),
    /valid VibeMatch request origin/,
  );
  assert.throws(
    () =>
      assertVibeStateChangingOrigin({ method: 'POST', headers: {} } as never, {
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://vibe.example.com',
      }),
    /valid VibeMatch request origin/,
  );
  console.log(
    'VibeMatch auth, concurrency guards, CSRF origin validation, deterministic scoring, and provider tests passed',
  );
})();
