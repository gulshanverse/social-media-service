import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateConfessionDto } from './dto';
import { ConfessionsService } from './confessions.service';

@Controller('confessions')
export class ConfessionsController {
  constructor(@Inject(ConfessionsService) private readonly confessions: ConfessionsService) {}

  @Post()
  create(
    @Body() dto: CreateConfessionDto,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('x-real-ip') realIp?: string,
  ) {
    const clientKey = (forwardedFor?.split(',')[0] ?? realIp ?? 'anonymous').trim();
    return this.confessions.create(dto, clientKey);
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
}
