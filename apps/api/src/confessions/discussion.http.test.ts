import assert from 'node:assert/strict';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { COMMENTER_COOKIE, DiscussionService } from './discussion.service';
import { DiscussionController } from './discussion.controller';

const trustedOrigin = 'https://web.example.test';
const sessionToken = 'test-token_123-abc';
const originalNodeEnv = process.env.NODE_ENV;
const originalWebOrigin = process.env.WEB_ORIGIN;

function createHttpApp(nodeEnv: string) {
  process.env.NODE_ENV = nodeEnv;
  process.env.WEB_ORIGIN = trustedOrigin;
  const discussion = {
    register: async () => ({
      profile: { id: 'profile-test', displayName: 'Test User' },
      token: sessionToken,
      expiresAt: new Date('2027-05-16T00:00:00.000Z'),
    }),
    identity: async (token?: string) =>
      token === sessionToken ? { id: 'profile-test', displayName: 'Test User' } : null,
    revoke: async (token?: string) => ({ revoked: token === sessionToken }),
  } as unknown as DiscussionService;
  const controller = new DiscussionController(discussion);
  const app = express();
  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers.origin === trustedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', trustedOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'content-type');
      res.status(204).end();
      return;
    }
    next();
  });
  app.post('/confessions/identity', async (req, res, next) => {
    try {
      const body = await controller.register(req.body, req, res);
      res.status(201).json(body);
    } catch (error) {
      next(error);
    }
  });
  app.get('/confessions/identity', async (req, res, next) => {
    try {
      res.status(200).json(await controller.identity(req));
    } catch (error) {
      next(error);
    }
  });
  app.delete('/confessions/identity', async (req, res, next) => {
    try {
      res.status(200).json(await controller.revoke(req, res));
    } catch (error) {
      next(error);
    }
  });
  return app;
}

async function verifyEnvironment(
  nodeEnv: string,
  expectedSameSite: string,
  expectedSecure: boolean,
) {
  const app = createHttpApp(nodeEnv);
  try {
    const registration = await request(app)
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

    const identity = await request(app)
      .get('/confessions/identity')
      .set('Cookie', cookie.split(';', 1)[0])
      .expect(200);
    assert.equal(identity.body.id, 'profile-test', 'the issued cookie must be reusable');

    const invalidIdentity = await request(app)
      .get('/confessions/identity')
      .set('Cookie', `${COMMENTER_COOKIE}=invalid`)
      .expect(200);
    assert.equal(invalidIdentity.body, null, 'invalid cookies must be handled safely');

    const revoked = await request(app)
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

    const preflight = await request(app)
      .options('/confessions/identity')
      .set('Origin', trustedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204);
    assert.equal(preflight.headers['access-control-allow-origin'], trustedOrigin);
    assert.equal(preflight.headers['access-control-allow-credentials'], 'true');
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalWebOrigin === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = originalWebOrigin;
  }
}

async function main() {
  await verifyEnvironment('development', 'Lax', false);
  await verifyEnvironment('production', 'None', true);
  console.log('commenter cookie HTTP regression tests passed');
}

void main();
