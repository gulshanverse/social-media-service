import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  HttpException,
  HttpStatus,
  UseGuards,
  Module,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminRole, BawalBoxResponseStatus } from '@prisma/client';
import { JwtAuthGuard, Permissions, Roles, RolesGuard, requireUser } from '../admin-auth';
import { SubmissionRateLimiter } from '../confessions/rate-limit';
import { PERMISSIONS } from '../permissions';
import { BawalBoxService } from './bawalbox.service';
import {
  BawalBoxQuestionQueryDto,
  CreateBawalBoxQuestionDto,
  CreateBawalBoxResponseDto,
  ModerateBawalBoxResponseDto,
  UpdateBawalBoxQuestionDto,
  UpdateBawalBoxSettingsDto,
} from './dto';

@Controller('bawalbox')
export class BawalBoxPublicController {
  private readonly rateLimiter = new SubmissionRateLimiter();
  constructor(@Inject(BawalBoxService) private readonly service: BawalBoxService) {}
  @Get()
  page() {
    return this.service.publicPage();
  }
  @Post('questions/:id/responses')
  response(
    @Param('id') id: string,
    @Body() body: CreateBawalBoxResponseDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = this.rateLimiter.check(
      request.ip || 'anonymous',
      Number(process.env.SUBMISSION_RATE_LIMIT) || 5,
      Number(process.env.SUBMISSION_RATE_WINDOW_SECONDS) || 3600,
    );
    if (!result.allowed) {
      response.setHeader('Retry-After', `${result.retryAfterSeconds}`);
      throw new HttpException(
        'Too many submissions. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.service.createResponse(id, body.content);
  }
}

@Controller('admin/bawalbox')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BawalBoxAdminController {
  constructor(@Inject(BawalBoxService) private readonly service: BawalBoxService) {}
  @Get('settings')
  @Permissions(PERMISSIONS.BAWALBOX_READ)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER)
  settings() {
    return this.service.settings();
  }
  @Patch('settings')
  @Permissions(PERMISSIONS.BAWALBOX_MANAGE)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  updateSettings(
    @Body() body: UpdateBawalBoxSettingsDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateSettings(body, requireUser(req));
  }
  @Get('questions')
  @Permissions(PERMISSIONS.BAWALBOX_READ)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER)
  questions(@Query() query: BawalBoxQuestionQueryDto) {
    return this.service.listQuestions(query.status, query.page, query.limit);
  }
  @Post('questions')
  @Permissions(PERMISSIONS.BAWALBOX_MANAGE)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  createQuestion(
    @Body() body: CreateBawalBoxQuestionDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.createQuestion(body, requireUser(req));
  }
  @Patch('questions/:id')
  @Permissions(PERMISSIONS.BAWALBOX_MANAGE)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  updateQuestion(
    @Param('id') id: string,
    @Body() body: UpdateBawalBoxQuestionDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateQuestion(id, body, requireUser(req));
  }
  @Get('questions/:id/responses')
  @Permissions(PERMISSIONS.BAWALBOX_READ)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER)
  responses(@Param('id') id: string, @Query('status') status?: BawalBoxResponseStatus) {
    return this.service.responses(id, status);
  }
  @Patch('responses/:id')
  @Permissions(PERMISSIONS.BAWALBOX_MODERATE)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  moderate(
    @Param('id') id: string,
    @Body() body: ModerateBawalBoxResponseDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.moderateResponse(id, body, requireUser(req));
  }
}

@Module({
  controllers: [BawalBoxPublicController, BawalBoxAdminController],
  providers: [BawalBoxService, JwtAuthGuard, RolesGuard],
})
export class BawalBoxModule {}
