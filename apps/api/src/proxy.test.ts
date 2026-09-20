import assert from 'node:assert/strict';
import request from 'supertest';
import { configureTrustedProxy, createApp } from './main';

const originalTrustProxyHops = process.env.TRUST_PROXY_HOPS;

async function run() {
  const configured: Array<{ key: string; value: unknown }> = [];
  const fakeApp = {
    getHttpAdapter: () => ({
      getInstance: () => ({
        set: (key: string, value: unknown) => configured.push({ key, value }),
      }),
    }),
  };
  delete process.env.TRUST_PROXY_HOPS;
  assert.equal(configureTrustedProxy(fakeApp), 0);
  assert.deepEqual(configured.at(-1), { key: 'trust proxy', value: 0 });

  process.env.TRUST_PROXY_HOPS = '2';
  assert.equal(configureTrustedProxy(fakeApp), 2);
  assert.deepEqual(configured.at(-1), { key: 'trust proxy', value: 2 });

  const app = await createApp();
  const express = app.getHttpAdapter().getInstance();
  express.get(
    '/test/client-ip',
    (request: { ip?: string }, response: { json: (body: unknown) => void }) =>
      response.json({ ip: request.ip }),
  );
  await app.init();
  try {
    process.env.TRUST_PROXY_HOPS = '0';
    // Reconfigure the real Express adapter to model a direct/untrusted client.
    configureTrustedProxy(app);
    const result = await request(app.getHttpServer())
      .get('/test/client-ip')
      .set('X-Forwarded-For', '198.51.100.10, 203.0.113.20')
      .set('X-Real-IP', '198.51.100.10')
      .expect(200);
    assert.notEqual(result.body.ip, '198.51.100.10');
    assert.notEqual(result.body.ip, '203.0.113.20');
    assert.match(result.body.ip, /127\.0\.0\.1|::1/);
  } finally {
    await app.close();
    if (originalTrustProxyHops === undefined) delete process.env.TRUST_PROXY_HOPS;
    else process.env.TRUST_PROXY_HOPS = originalTrustProxyHops;
  }
  console.log('proxy: native request.ip and spoofed forwarded-header tests passed');
}

void run();
