import assert from 'node:assert/strict';
import { HttpException, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { getCorsOptions } from '../main';
import { COMMENTER_COOKIE, DiscussionService } from './discussion.service';
import { DiscussionController } from './discussion.controller';

const trustedOrigin = 'https://web.example.test';
const trustedAdminOrigin = 'https://admin.example.test';
const unapprovedOrigin = 'https://unapproved.example.test';
const sessionToken = 'test-token_123-abc';
const originalNodeEnv = process.env.NODE_ENV;
const originalWebOrigin = process.env.WEB_ORIGIN;
const originalAdminOrigin = process.env.ADMIN_ORIGIN;

@Module({})
class HttpTestModule {}

async function createHttpApp(nodeEnv: string) {
  process.env.NODE_ENV = nodeEnv;
  process.env.WEB_ORIGIN = trustedOrigin;
  process.env.ADMIN_ORIGIN = trustedAdminOrigin;
  const activeSessions = new Set<string>();
  const discussion = {
    register: async () => {
      activeSessions.add(sessionToken);
      return {
        profile: { id: 'profile-test', displayName: 'Test User' },
        token: sessionToken,
        expiresAt: new Date('2027-05-16T00:00:00.000Z'),
      };
    },
    identity: async (token?: string) =>
      token && activeSessions.has(token) ? { id: 'profile-test', displayName: 'Test User' } : null,
    revoke: async (token?: string) => ({ revoked: Boolean(token && activeSessions.delete(token)) }),
  } as unknown as DiscussionService;
  const controller = new DiscussionController(discussion);
  const app = await NestFactory.create(HttpTestModule, { logger: false });
  app.enableCors(getCorsOptions());
  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  const router = express.Router();
  router.post('/confessions/identity', async (req, res, next) => {
    try {
      res.status(201).json(await controller.register(req.body, req, res));
    } catch (error) {
      next(error);
    }
  });
  router.get('/confessions/identity', async (req, res, next) => {
    try {
      res.status(200).json(await controller.identity(req));
    } catch (error) {
      next(error);
    }
  });
  router.delete('/confessions/identity', async (req, res, next) => {
    try {
      res.status(200).json(await controller.revoke(req, res));
    } catch (error) {
      next(error);
    }
  });
  app.use(router);
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = error instanceof HttpException ? error.getStatus() : 500;
    res.status(status).json({ statusCode: status });
  });
  await app.init();
  return app;
}

async function verifyEnvironment(
  nodeEnv: string,
  expectedSameSite: string,
  expectedSecure: boolean,
) {
  const app = await createHttpApp(nodeEnv);
  const server = app.getHttpServer();
  try {
    const registration = await request(server)
      .post('/confessions/identity')
      .set('Origin', trustedOrigin)
      .send({ displayName: 'Test User', instagramUsername: 'test.user' })
      .expect(201);
    const cookie = registration.headers['set-cookie']?.[0] as string | undefined;
    assert.ok(cookie, 'registration must return Set-Cookie');
    assert.match(cookie, new RegExp(`^${COMMENTER_COOKIE}=${sessionToken};`));
    assert.match(cookie, /(?:^|;\s*)HttpOnly(?:;|$)/i);
    assert.match(cookie, /(?:^|;\s*)Path=\/(?:;|$)/i);
    assert.match(cookie, /(?:^|;\s*)Max-Age=15552000(?:;|$)/i);
    assert.match(cookie, new RegExp(`(?:^|;\\s*)SameSite=${expectedSameSite}(?:;|$)`, 'i'));
    assert.equal(/(?:^|;\s*)Secure(?:;|$)/i.test(cookie), expectedSecure);
    assert.equal(registration.body.profile.id, 'profile-test');
    assert.equal(registration.headers['access-control-allow-origin'], trustedOrigin);
    assert.equal(registration.headers['access-control-allow-credentials'], 'true');

    const identity = await request(server)
      .get('/confessions/identity')
      .set('Origin', trustedOrigin)
      .set('Cookie', cookie.split(';', 1)[0])
      .expect(200);
    assert.equal(identity.body.id, 'profile-test', 'the issued cookie must be reusable');

    const invalidIdentity = await request(server)
      .get('/confessions/identity')
      .set('Cookie', `${COMMENTER_COOKIE}=invalid`)
      .expect(200);
    assert.equal(invalidIdentity.body, null, 'invalid cookies must be handled safely');

    const revoked = await request(server)
      .delete('/confessions/identity')
      .set('Origin', trustedOrigin)
      .set('Cookie', cookie.split(';', 1)[0])
      .expect(200);
    assert.deepEqual(revoked.body, { revoked: true });
    const clearingCookie = revoked.headers['set-cookie']?.[0] as string | undefined;
    assert.ok(clearingCookie, 'revocation must return a clearing Set-Cookie header');
    assert.match(clearingCookie, new RegExp(`^${COMMENTER_COOKIE}=;`));
    assert.match(clearingCookie, /(?:^|;\s*)Max-Age=0(?:;|$)/i);
    assert.match(clearingCookie, /(?:^|;\s*)Path=\/(?:;|$)/i);
    assert.match(clearingCookie, /(?:^|;\s*)HttpOnly(?:;|$)/i);
    assert.match(clearingCookie, new RegExp(`(?:^|;\\s*)SameSite=${expectedSameSite}(?:;|$)`, 'i'));
    assert.equal(/(?:^|;\s*)Secure(?:;|$)/i.test(clearingCookie), expectedSecure);

    const postRevocationIdentity = await request(server)
      .get('/confessions/identity')
      .set('Origin', trustedOrigin)
      .set('Cookie', cookie.split(';', 1)[0])
      .expect(200);
    assert.equal(postRevocationIdentity.body, null, 'revocation must invalidate the old session');

    const preflight = await request(server)
      .options('/confessions/identity')
      .set('Origin', trustedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204);
    assert.equal(preflight.headers['access-control-allow-origin'], trustedOrigin);
    assert.equal(preflight.headers['access-control-allow-credentials'], 'true');

    const rejectedRegistration = await request(server)
      .post('/confessions/identity')
      .set('Origin', unapprovedOrigin)
      .send({ displayName: 'Unapproved', instagramUsername: 'unapproved' })
      .expect(403);
    assert.equal(rejectedRegistration.headers['access-control-allow-origin'], undefined);

    const rejectedPreflight = await request(server)
      .options('/confessions/identity')
      .set('Origin', unapprovedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204);
    assert.equal(rejectedPreflight.headers['access-control-allow-origin'], undefined);
  } finally {
    await app.close();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalWebOrigin === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = originalWebOrigin;
    if (originalAdminOrigin === undefined) delete process.env.ADMIN_ORIGIN;
    else process.env.ADMIN_ORIGIN = originalAdminOrigin;
  }
}

async function main() {
  await verifyEnvironment('development', 'Lax', false);
  await verifyEnvironment('production', 'None', true);
  console.log('commenter cookie HTTP regression tests passed');
}

void main();
