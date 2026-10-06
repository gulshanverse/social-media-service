import 'reflect-metadata';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { SafeApiExceptionFilter } from '../api-errors';
import { prisma, setPrismaForTests } from '../admin-auth';
import { hashValue } from './auth';
import { VibeAuthController } from './vibematch.module';
import {
  createEmailProvider,
  DevelopmentEmailProvider,
  ResendEmailProvider,
  type ResendEmailConfiguration,
  type ResendEmailPayload,
} from './email-provider';

const config: ResendEmailConfiguration = {
  apiKey: 'test-api-key-placeholder',
  from: 'VibeMatch <no-reply@example.test>',
  appUrl: 'https://vibe.example.test/',
  webOrigin: 'https://vibe.example.test/',
};

type TestState = { createdMagicLink?: { tokenHash: string } };

function linkFrom(payload: ResendEmailPayload) {
  const href = payload.html?.match(/href="([^"]+)"/)?.[1];
  assert.ok(href, 'email contains a sign-in CTA');
  return new URL(href.replaceAll('&amp;', '&'));
}

function fakePrisma() {
  const state: TestState = {};
  const client = {
    vibeIdentity: { findUnique: async () => null },
    vibeMagicLink: {
      updateMany: async () => ({ count: 0 }),
      create: async ({ data }: { data: { tokenHash: string } }) => {
        state.createdMagicLink = data;
        return { id: 'test-magic-link', ...data };
      },
    },
    vibeProfile: { findUnique: async () => null },
  } as unknown as PrismaClient;
  return { client, state };
}

async function withAuthHttpApp<T>(
  provider: ResendEmailProvider,
  run: (server: ReturnType<INestApplication['getHttpServer']>, state: TestState) => Promise<T>,
) {
  const originalPrisma = prisma;
  const testPrisma = fakePrisma();
  setPrismaForTests(testPrisma.client);
  const moduleRef = await Test.createTestingModule({
    controllers: [VibeAuthController],
    providers: [{ provide: 'VIBE_EMAIL_PROVIDER', useValue: provider }],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new SafeApiExceptionFilter());
  await app.init();
  try {
    return await run(app.getHttpServer(), testPrisma.state);
  } finally {
    await app.close();
    setPrismaForTests(originalPrisma);
  }
}

async function run() {
  assert.ok(createEmailProvider({ NODE_ENV: 'development' }) instanceof DevelopmentEmailProvider);

  const productionProvider = createEmailProvider({
    NODE_ENV: 'production',
    RESEND_API_KEY: config.apiKey,
    VIBEMATCH_EMAIL_FROM: config.from,
    VIBEMATCH_APP_URL: config.appUrl,
    WEB_ORIGIN: config.webOrigin,
  });
  assert.ok(productionProvider instanceof ResendEmailProvider);
  assert.equal(productionProvider instanceof DevelopmentEmailProvider, false);

  assert.throws(
    () =>
      createEmailProvider({
        NODE_ENV: 'production',
        VIBEMATCH_EMAIL_FROM: config.from,
        VIBEMATCH_APP_URL: config.appUrl,
      }),
    /RESEND_API_KEY/,
  );
  assert.throws(
    () =>
      createEmailProvider({
        NODE_ENV: 'production',
        RESEND_API_KEY: config.apiKey,
        VIBEMATCH_APP_URL: config.appUrl,
      }),
    /VIBEMATCH_EMAIL_FROM/,
  );
  assert.throws(
    () =>
      createEmailProvider({
        NODE_ENV: 'production',
        RESEND_API_KEY: config.apiKey,
        VIBEMATCH_EMAIL_FROM: config.from,
      }),
    /VIBEMATCH_APP_URL/,
  );
  assert.throws(
    () => new ResendEmailProvider({ ...config, webOrigin: 'https://other.example.test/' }),
    /must match WEB_ORIGIN/,
  );

  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const sent: ResendEmailPayload[] = [];
    const provider = new ResendEmailProvider(config, async (payload) => {
      sent.push(payload);
      return { error: null };
    });
    await withAuthHttpApp(provider, async (server, state) => {
      const response = await request(server)
        .post('/vibematch/auth/magic-link')
        .send({ email: '  Person@Example.com ' })
        .expect(201);
      assert.equal(
        response.body.message,
        'If that email can receive messages, a sign-in link has been sent.',
      );
      assert.equal('developmentToken' in response.body, false);
      assert.equal(sent.length, 1);
      assert.equal(sent[0].from, config.from);
      assert.deepEqual(sent[0].to, ['person@example.com']);
      assert.equal(sent[0].subject, 'Your VibeMatch sign-in link');
      assert.match(sent[0].html ?? '', /VibeMatch/);
      assert.match(sent[0].html ?? '', /do not share this link/i);
      assert.match(sent[0].text ?? '', /expires at .*\(UTC\)/);

      const link = linkFrom(sent[0]);
      assert.equal(link.origin, 'https://vibe.example.test');
      assert.equal(link.pathname, '/vibematch/verify');
      assert.equal(link.search, '');
      const token = new URLSearchParams(link.hash.slice(1)).get('token');
      assert.ok(token);
      assert.equal(state.createdMagicLink?.tokenHash, hashValue(token));
      assert.equal(JSON.stringify(response.body).includes(token), false);
      assert.equal(JSON.stringify(response.body).includes(link.toString()), false);
    });

    const providerApiKey = 'provider-key-placeholder';
    let failedToken = '';
    const failingProvider = new ResendEmailProvider(
      { ...config, apiKey: providerApiKey },
      async (payload) => {
        const link = linkFrom(payload);
        failedToken = new URLSearchParams(link.hash.slice(1)).get('token') ?? '';
        return { error: new Error(`provider details ${providerApiKey} ${failedToken}`) };
      },
    );
    await withAuthHttpApp(failingProvider, async (server) => {
      const response = await request(server)
        .post('/vibematch/auth/magic-link')
        .send({ email: 'person@example.com' })
        .expect(500);
      assert.equal(response.body.message, 'Internal server error.');
      assert.equal(JSON.stringify(response.body).includes(providerApiKey), false);
      assert.equal(JSON.stringify(response.body).includes(failedToken), false);
    });
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }

  console.log(
    'VibeMatch Resend selection, email payload, production HTTP privacy, and failure-sanitization tests passed',
  );
}

void run();
