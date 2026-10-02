import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateGarbaCommentDto, CreateGarbaPostDto, CreateGarbaReportDto } from './dto';
import { GarbaService } from './garba.service';

function parseGarbaPage(value?: string) {
  if (value === undefined || value === '') return 1;
  if (!/^\d+$/.test(value)) throw new BadRequestException('page must be a whole number.');
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100)
    throw new BadRequestException('page must be between 1 and 100.');
  return page;
}

@Controller('garba')
export class GarbaController {
  constructor(@Inject(GarbaService) private readonly garba: GarbaService) {}
  @Get('season') season() { return this.garba.season(); }
  @Get() list(@Query('category') category?: string, @Query('page') rawPage?: string) { return this.garba.list(category, parseGarbaPage(rawPage)); }
  @Post() create(@Body() dto: CreateGarbaPostDto, @Req() request: Request) { return this.garba.create(dto, request.ip || 'anonymous'); }
  @Get(':publicId') detail(@Param('publicId') publicId: string) { return this.garba.detail(publicId); }
  @Post(':publicId/react') react(@Param('publicId') publicId: string, @Req() request: Request) { return this.garba.react(publicId, request.ip || 'anonymous'); }
  @Post(':publicId/comments') comment(@Param('publicId') publicId: string, @Body() dto: CreateGarbaCommentDto, @Req() request: Request) { return this.garba.comment(publicId, dto, request.ip || 'anonymous'); }
  @Post(':publicId/report') report(@Param('publicId') publicId: string, @Body() dto: CreateGarbaReportDto, @Req() request: Request) { return this.garba.report(publicId, dto, request.ip || 'anonymous'); }
  @Post(':publicId/comments/:commentId/report') reportComment(@Param('publicId') publicId: string, @Param('commentId') commentId: string, @Body() dto: CreateGarbaReportDto, @Req() request: Request) { return this.garba.reportComment(publicId, commentId, dto, request.ip || 'anonymous'); }
}
