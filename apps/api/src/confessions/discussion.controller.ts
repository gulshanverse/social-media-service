import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommentDto, CommentReportDto, ProfileDto, ReactionDto } from './discussion.dto';
import { COMMENTER_COOKIE, DiscussionService } from './discussion.service';

function token(request: Request) {
  return request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COMMENTER_COOKIE}=`))
    ?.slice(COMMENTER_COOKIE.length + 1);
}
function setCookie(response: Response, value: string) {
  response.cookie(COMMENTER_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 180 * 86400000,
  });
}
export function assertCommenterOrigin(request: Request) {
  const trustedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  if (!request.headers.origin || request.headers.origin !== trustedOrigin) {
    throw new ForbiddenException('A trusted browser origin is required.');
  }
}
@Controller('confessions')
export class DiscussionController {
  constructor(private readonly discussion: DiscussionService) {}
  @Get('identity') identity(@Req() request: Request) {
    return this.discussion.identity(token(request));
  }
  @Post('identity') async register(
    @Body() dto: ProfileDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertCommenterOrigin(request);
    const result = await this.discussion.register(dto, request.ip || 'anonymous');
    setCookie(response, result.token);
    return { profile: result.profile, expiresAt: result.expiresAt };
  }
  @Delete('identity') async revoke(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertCommenterOrigin(request);
    const result = await this.discussion.revoke(token(request));
    response.clearCookie(COMMENTER_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
    return result;
  }
  @Get(':publicId/reactions') reactions(
    @Param('publicId') publicId: string,
    @Req() request: Request,
  ) {
    return this.discussion.reactions(publicId, token(request), request.ip || 'anonymous');
  }
  @Post(':publicId/reactions') react(
    @Param('publicId') publicId: string,
    @Body() dto: ReactionDto,
    @Req() request: Request,
  ) {
    assertCommenterOrigin(request);
    return this.discussion.react(publicId, dto, token(request), request.ip || 'anonymous');
  }
  @Get(':publicId/comments') list(
    @Param('publicId') publicId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
  ) {
    return this.discussion.list(publicId, page ?? 1);
  }
  @Post(':publicId/comments') create(
    @Param('publicId') publicId: string,
    @Body() dto: CommentDto,
    @Req() request: Request,
  ) {
    assertCommenterOrigin(request);
    return this.discussion.create(publicId, dto, token(request), request.ip || 'anonymous');
  }
  @Post(':publicId/comments/:commentId/report') report(
    @Param('publicId') publicId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CommentReportDto,
    @Req() request: Request,
  ) {
    assertCommenterOrigin(request);
    return this.discussion.report(publicId, commentId, dto, request.ip || 'anonymous');
  }
}
