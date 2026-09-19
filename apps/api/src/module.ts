import { Controller, Get, Module } from '@nestjs/common';
@Controller('health')
class HealthController {
  @Get() getHealth() {
    return { status: 'ok', service: 'social-media-service-api' };
  }
}
@Module({ controllers: [HealthController] })
export class AppModule {}
