import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Query,
} from '@nestjs/common';
import type { Request } from 'express';
import { CreateConfessionDto } from './dto';
import { ConfessionsService } from './confessions.service';
import { CreateReportDto } from './report.dto';

@Controller('confessions')
export class ConfessionsController {
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

  @Get(':publicId')
  findOne(@Param('publicId') publicId: string) {
    return this.confessions.findPublished(publicId);
  }

  @Post(':publicId/report')
  report(
    @Param('publicId') publicId: string,
    @Body() dto: CreateReportDto,
    @Req() request: Request,
  ) {
    return this.confessions.report(publicId, dto.reason, request.ip || 'anonymous');
  }
}
