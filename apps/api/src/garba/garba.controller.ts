import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateGarbaCommentDto, CreateGarbaPostDto, CreateGarbaReportDto } from './dto';
import { GarbaService } from './garba.service';

@Controller('garba')
export class GarbaController {
  constructor(private readonly garba: GarbaService) {}
  @Get('season') season() { return this.garba.season(); }
  @Get() list(@Query('category') category?: string, @Query('page', new ParseIntPipe({ optional: true })) page?: number) { return this.garba.list(category, page ?? 1); }
  @Post() create(@Body() dto: CreateGarbaPostDto, @Req() request: Request) { return this.garba.create(dto, request.ip || 'anonymous'); }
  @Get(':publicId') detail(@Param('publicId') publicId: string) { return this.garba.detail(publicId); }
  @Post(':publicId/react') react(@Param('publicId') publicId: string, @Req() request: Request) { return this.garba.react(publicId, request.ip || 'anonymous'); }
  @Post(':publicId/comments') comment(@Param('publicId') publicId: string, @Body() dto: CreateGarbaCommentDto, @Req() request: Request) { return this.garba.comment(publicId, dto, request.ip || 'anonymous'); }
  @Post(':publicId/report') report(@Param('publicId') publicId: string, @Body() dto: CreateGarbaReportDto, @Req() request: Request) { return this.garba.report(publicId, dto, request.ip || 'anonymous'); }
  @Post(':publicId/comments/:commentId/report') reportComment(@Param('publicId') publicId: string, @Param('commentId') commentId: string, @Body() dto: CreateGarbaReportDto, @Req() request: Request) { return this.garba.reportComment(publicId, commentId, dto, request.ip || 'anonymous'); }
}
