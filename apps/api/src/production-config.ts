const requiredProductionVariables = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'WEB_ORIGIN',
  'ADMIN_ORIGIN',
  'PORT',
  'APP_VERSION',
  'GIT_COMMIT',
  'SUBMISSION_RATE_LIMIT',
  'SUBMISSION_RATE_WINDOW_SECONDS',
  'ADMIN_LOGIN_RATE_LIMIT',
  'ADMIN_LOGIN_RATE_WINDOW_SECONDS',
  'ADMIN_REFRESH_RATE_LIMIT',
  'ADMIN_REFRESH_RATE_WINDOW_SECONDS',
] as const;

function isPositiveInteger(value: string | undefined) {
  return Boolean(value && /^[1-9]\d*$/.test(value));
}

function isOrigin(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.pathname === '/';
  } catch {
    return false;
  }
}

export function validateProductionEnvironment(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== 'production') return;

  const missing = requiredProductionVariables.filter((name) => !env[name]?.trim());
  const invalid: string[] = [];
  if (env.PORT && !isPositiveInteger(env.PORT)) invalid.push('PORT');
  if (!isOrigin(env.WEB_ORIGIN)) invalid.push('WEB_ORIGIN');
  if (!isOrigin(env.ADMIN_ORIGIN)) invalid.push('ADMIN_ORIGIN');
  for (const name of [
    'SUBMISSION_RATE_LIMIT',
    'SUBMISSION_RATE_WINDOW_SECONDS',
    'ADMIN_LOGIN_RATE_LIMIT',
    'ADMIN_LOGIN_RATE_WINDOW_SECONDS',
    'ADMIN_REFRESH_RATE_LIMIT',
    'ADMIN_REFRESH_RATE_WINDOW_SECONDS',
  ]) {
    if (env[name] && !isPositiveInteger(env[name])) invalid.push(name);
  }

  const failures = [...missing, ...invalid.filter((name) => !missing.includes(name as never))];
  if (failures.length)
    throw new Error(`Production configuration is invalid. Check: ${failures.join(', ')}`);
}
