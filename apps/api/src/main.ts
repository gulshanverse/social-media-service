import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.use(helmet());
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
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
