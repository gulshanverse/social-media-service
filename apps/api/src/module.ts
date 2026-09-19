import { Controller, Get, Module } from '@nestjs/common';
import { ConfessionsModule } from './confessions/confessions.module';
@Controller('health')
class HealthController {
  @Get() getHealth() {
    return { status: 'ok', service: 'social-media-service-api' };
  }
}
@Module({ imports: [ConfessionsModule], controllers: [HealthController] })
export class AppModule {}
