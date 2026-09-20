const requiredProductionVariables = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'WEB_ORIGIN',
  'ADMIN_ORIGIN',
  'PORT',
  'TRUST_PROXY_HOPS',
  'APP_VERSION',
  'GIT_COMMIT',
  'SUBMISSION_RATE_LIMIT',
  'SUBMISSION_RATE_WINDOW_SECONDS',
  'ADMIN_LOGIN_RATE_LIMIT',
  'ADMIN_LOGIN_RATE_WINDOW_SECONDS',
  'ADMIN_REFRESH_RATE_LIMIT',
  'ADMIN_REFRESH_RATE_WINDOW_SECONDS',
] as const;

const MIN_SECRET_LENGTH = 32;
const MAX_METADATA_LENGTH = 256;

function isPositiveInteger(value: string | undefined, max?: number) {
  if (!value || !/^[1-9]\d*$/.test(value)) return false;
  return max === undefined || Number(value) <= max;
}

function isOrigin(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function isPostgresUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') return false;
    if (!url.hostname) return false;
    const lower = value.toLowerCase();
    return !['replace-me', 'example.com', 'localhost', '127.0.0.1'].some((placeholder) =>
      lower.includes(placeholder),
    );
  } catch {
    return false;
  }
}

function isStrongSecret(value: string | undefined) {
  if (!value || value.length < MIN_SECRET_LENGTH) return false;
  const lower = value.toLowerCase();
  return !['replace', 'change-me', 'secret', 'password', 'development', 'example'].some((word) =>
    lower.includes(word),
  );
}

function isBoundedMetadata(value: string | undefined) {
  return Boolean(value?.trim() && value.length <= MAX_METADATA_LENGTH);
}

export function validateProductionEnvironment(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== 'production') return;

  const missing = requiredProductionVariables.filter((name) => !env[name]?.trim());
  const invalid = new Set<string>();
  if (!isPostgresUrl(env.DATABASE_URL)) invalid.add('DATABASE_URL');
  if (!isStrongSecret(env.JWT_SECRET)) invalid.add('JWT_SECRET');
  if (!isStrongSecret(env.JWT_REFRESH_SECRET)) invalid.add('JWT_REFRESH_SECRET');
  if (env.JWT_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    invalid.add('JWT_SECRET');
    invalid.add('JWT_REFRESH_SECRET');
  }
  if (!isOrigin(env.WEB_ORIGIN)) invalid.add('WEB_ORIGIN');
  if (!isOrigin(env.ADMIN_ORIGIN)) invalid.add('ADMIN_ORIGIN');
  if (!isPositiveInteger(env.PORT, 65535)) invalid.add('PORT');
  if (!isBoundedMetadata(env.APP_VERSION)) invalid.add('APP_VERSION');
  if (!isBoundedMetadata(env.GIT_COMMIT)) invalid.add('GIT_COMMIT');
  if (env.TRUST_PROXY_HOPS !== undefined && !/^\d+$/.test(env.TRUST_PROXY_HOPS)) {
    invalid.add('TRUST_PROXY_HOPS');
  }
  if (env.TRUST_PROXY_HOPS !== undefined && Number(env.TRUST_PROXY_HOPS) > 10) {
    invalid.add('TRUST_PROXY_HOPS');
  }

  for (const name of [
    'SUBMISSION_RATE_LIMIT',
    'SUBMISSION_RATE_WINDOW_SECONDS',
    'ADMIN_LOGIN_RATE_LIMIT',
    'ADMIN_LOGIN_RATE_WINDOW_SECONDS',
    'ADMIN_REFRESH_RATE_LIMIT',
    'ADMIN_REFRESH_RATE_WINDOW_SECONDS',
  ]) {
    if (!isPositiveInteger(env[name])) invalid.add(name);
  }

  const failures = [...new Set([...missing, ...invalid])];
  if (failures.length) {
    throw new Error(`Production configuration is invalid. Check: ${failures.join(', ')}`);
  }
}
