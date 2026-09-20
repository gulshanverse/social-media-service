import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './module';
import { SafeApiExceptionFilter } from './api-errors';
import { requestIdMiddleware, structuredLog } from './observability';
import { prisma } from './admin-auth';
import { validateProductionEnvironment } from './production-config';

const DEFAULT_TRUST_PROXY_HOPS = 0;
const MAX_TRUST_PROXY_HOPS = 10;

function readTrustProxyHops(value = process.env.TRUST_PROXY_HOPS): number {
  const raw =
    value ?? (process.env.NODE_ENV === 'production' ? undefined : `${DEFAULT_TRUST_PROXY_HOPS}`);
  if (!raw || !/^\d+$/.test(raw)) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
  }
  const hops = Number(raw);
  if (!Number.isSafeInteger(hops) || hops > MAX_TRUST_PROXY_HOPS) {
    throw new Error(`TRUST_PROXY_HOPS must be between 0 and ${MAX_TRUST_PROXY_HOPS}.`);
  }
  return hops;
}

/** Configure Express's native proxy-aware IP resolution. */
export function configureTrustedProxy(app: {
  getHttpAdapter: () => { getInstance: () => { set: (key: string, value: unknown) => void } };
}) {
  const hops = readTrustProxyHops();
  app.getHttpAdapter().getInstance().set('trust proxy', hops);
  return hops;
}

export async function createApp() {
  validateProductionEnvironment();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: '32kb' }));
  configureTrustedProxy(app);
  app.use(helmet());
  app.useGlobalFilters(new SafeApiExceptionFilter());
  const allowedOrigins = [
    process.env.WEB_ORIGIN ??
      (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000'),
    process.env.ADMIN_ORIGIN ??
      (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3001'),
  ].filter((origin): origin is string => Boolean(origin));
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
  return app;
}

export async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 4000);
  structuredLog('info', 'api.started', {
    service: 'social-media-service-api',
    port: process.env.PORT ?? 4000,
    environment: process.env.NODE_ENV ?? 'development',
  });
  const shutdown = async (signal: string) => {
    structuredLog('info', 'api.shutdown_started', { signal });
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

const invokedFile = process.argv[1] ?? '';
if (invokedFile.endsWith('/main.ts') || invokedFile.endsWith('/main.js')) void bootstrap();
