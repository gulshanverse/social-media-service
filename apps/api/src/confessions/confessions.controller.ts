import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Query,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CreateConfessionDto } from './dto';
import { ConfessionsService } from './confessions.service';
import { CreateReportDto } from './report.dto';
import { SubmissionRateLimiter } from './rate-limit';

function rateSetting(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : fallback;
}

@Controller('confessions')
export class ConfessionsController {
  private readonly reportRateLimiter = new SubmissionRateLimiter();

  constructor(@Inject(ConfessionsService) private readonly confessions: ConfessionsService) {}

  @Post()
  create(@Body() dto: CreateConfessionDto, @Req() request: Request) {
    return this.confessions.create(dto, request.ip || 'anonymous');
  }

  @Get()
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.confessions.list({ page: page ?? 1, limit: limit ?? 12 });
  }

  @Get('profile-settings')
  profileSettings() {
    return this.confessions.profileSettings();
  }

  @Get('theme/active')
  activeTheme() {
    return this.confessions.resolvePublicTheme();
  }

  @Get(':publicId')
  findOne(@Param('publicId') publicId: string) {
    return this.confessions.findPublished(publicId);
  }

  @Post(':publicId/report')
  report(
    @Param('publicId') publicId: string,
    @Body() dto: CreateReportDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const clientKey = request.ip || 'anonymous';
    const result = this.reportRateLimiter.check(
      clientKey,
      rateSetting(process.env.REPORT_RATE_LIMIT, 5, 100),
      rateSetting(process.env.REPORT_RATE_WINDOW_SECONDS, 3600, 86_400),
    );
    if (!result.allowed) {
      response.setHeader('Retry-After', `${result.retryAfterSeconds}`);
      throw new HttpException(
        'Too many reports. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.confessions.report(publicId, dto.reason, request.ip || 'anonymous');
  }
}
