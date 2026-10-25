import { Module } from '@nestjs/common';
import { prisma } from '../admin-auth';
import { ConfessionsController } from './confessions.controller';
import { DiscussionController } from './discussion.controller';
import { DiscussionService } from './discussion.service';
import {
  CONFESSIONS_PRISMA,
  CONFESSIONS_RATE_LIMITER,
  ConfessionsService,
} from './confessions.service';
import { SubmissionRateLimiter } from './rate-limit';

@Module({
  // Register fixed discussion routes before the public :publicId route.
  controllers: [DiscussionController, ConfessionsController],
  providers: [
    ConfessionsService,
    DiscussionService,
    { provide: CONFESSIONS_PRISMA, useValue: prisma },
    { provide: CONFESSIONS_RATE_LIMITER, useClass: SubmissionRateLimiter },
  ],
})
export class ConfessionsModule {}
