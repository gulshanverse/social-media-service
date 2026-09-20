import assert from 'node:assert/strict';
import { validateProductionEnvironment } from './production-config';

const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://db.example/social_media',
  JWT_SECRET: 'a'.repeat(64),
  JWT_REFRESH_SECRET: 'b'.repeat(64),
  WEB_ORIGIN: 'https://web.example.com/',
  ADMIN_ORIGIN: 'https://admin.example.com/',
  PORT: '4000',
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
assert.doesNotThrow(() => validateProductionEnvironment({ NODE_ENV: 'development' }));
console.log('phase 6 production configuration tests passed');
