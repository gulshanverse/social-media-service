import { Controller, Get, Module } from '@nestjs/common';
import { ConfessionsModule } from './confessions/confessions.module';
import { AdminModule } from './admin.module';
@Controller('health')
class HealthController {
  @Get() getHealth() {
    return { status: 'ok', service: 'social-media-service-api' };
  }
}
@Module({ imports: [ConfessionsModule, AdminModule], controllers: [HealthController] })
export class AppModule {}
