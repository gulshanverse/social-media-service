import assert from 'node:assert/strict';
import { validateProductionEnvironment } from './production-config';

const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://db.internal/social_media',
  JWT_SECRET: 'access-key-with-random-material-1234567890',
  JWT_REFRESH_SECRET: 'refresh-key-with-random-material-0987654321',
  WEB_ORIGIN: 'https://web.example.com/',
  ADMIN_ORIGIN: 'https://admin.example.com/',
  PORT: '4000',
  TRUST_PROXY_HOPS: '1',
  APP_VERSION: '1.0.0',
  GIT_COMMIT: 'abc123',
  SUBMISSION_RATE_LIMIT: '5',
  SUBMISSION_RATE_WINDOW_SECONDS: '3600',
  ADMIN_LOGIN_RATE_LIMIT: '5',
  ADMIN_LOGIN_RATE_WINDOW_SECONDS: '900',
  ADMIN_REFRESH_RATE_LIMIT: '10',
  ADMIN_REFRESH_RATE_WINDOW_SECONDS: '900',
};

assert.doesNotThrow(() => validateProductionEnvironment(validProductionEnvironment));
assert.throws(
  () =>
    validateProductionEnvironment({
      ...validProductionEnvironment,
      JWT_SECRET: undefined,
      ADMIN_ORIGIN: 'not-an-origin',
    }),
  /JWT_SECRET, ADMIN_ORIGIN/,
);
assert.throws(
  () => validateProductionEnvironment({ ...validProductionEnvironment, PORT: 'four-thousand' }),
  /PORT/,
);
assert.throws(
  () => validateProductionEnvironment({ ...validProductionEnvironment, TRUST_PROXY_HOPS: '11' }),
  /TRUST_PROXY_HOPS/,
);
assert.throws(
  () =>
    validateProductionEnvironment({
      ...validProductionEnvironment,
      DATABASE_URL: 'postgresql://localhost/db',
    }),
  /DATABASE_URL/,
);
assert.throws(
  () =>
    validateProductionEnvironment({
      ...validProductionEnvironment,
      JWT_REFRESH_SECRET: validProductionEnvironment.JWT_SECRET,
    }),
  /JWT_SECRET, JWT_REFRESH_SECRET/,
);
assert.throws(
  () =>
    validateProductionEnvironment({
      ...validProductionEnvironment,
      ADMIN_LOGIN_RATE_LIMIT: '0',
    }),
  /ADMIN_LOGIN_RATE_LIMIT/,
);
assert.doesNotThrow(() => validateProductionEnvironment({ NODE_ENV: 'development' }));
console.log('phase 6 production configuration tests passed');
