import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './module';
import { SafeApiExceptionFilter } from './api-errors';
import { requestIdMiddleware, structuredLog } from './observability';
import { prisma } from './admin-auth';

export async function createApp() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.use(helmet());
  app.use(requestIdMiddleware);
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
