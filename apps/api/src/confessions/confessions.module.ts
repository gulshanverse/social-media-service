import { Module } from '@nestjs/common';
import { prisma } from '../admin-auth';
import { ConfessionsController } from './confessions.controller';
import {
  CONFESSIONS_PRISMA,
  CONFESSIONS_RATE_LIMITER,
  ConfessionsService,
} from './confessions.service';
import { SubmissionRateLimiter } from './rate-limit';

@Module({
  controllers: [ConfessionsController],
  providers: [
    ConfessionsService,
    { provide: CONFESSIONS_PRISMA, useValue: prisma },
    { provide: CONFESSIONS_RATE_LIMITER, useClass: SubmissionRateLimiter },
  ],
})
export class ConfessionsModule {}
