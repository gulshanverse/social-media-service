import { Controller, Get, HttpException, HttpStatus, Module } from '@nestjs/common';
import { ConfessionsModule } from './confessions/confessions.module';
import { AdminModule } from './admin.module';
import { prisma } from './admin-auth';
import { metricsSnapshot } from './observability';

@Controller('health')
export class HealthController {
  @Get() getHealth() {
    return { status: 'ok', service: 'social-media-service-api' };
  }
  @Get('live') live() {
    return { status: 'ok', service: 'social-media-service-api' };
  }
  @Get('ready') async ready() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new HttpException(
        { status: 'not_ready', database: 'unavailable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
  @Get('version') version() {
    return {
      service: 'social-media-service-api',
      version: process.env.APP_VERSION ?? '0.1.0',
      commit: process.env.GIT_COMMIT ?? 'development',
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
  @Get('metrics') metrics() {
    return metricsSnapshot();
  }
}

@Controller()
export class MetricsController {
  @Get('metrics') metrics() {
    return metricsSnapshot();
  }
}

@Module({
  imports: [ConfessionsModule, AdminModule],
  controllers: [HealthController, MetricsController],
})
export class AppModule {}
