import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminRole, ReportStatus } from '@prisma/client';
import { AdminAuthController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard, Roles, RolesGuard, requireUser } from './admin-auth';
import {
  AdminQueueQueryDto,
  CreateThemeDto,
  UpdateConfessionDto,
  UpdateThemeDto,
} from './admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get('dashboard') dashboard() {
    return this.service.dashboard();
  }
  @Get('confessions') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) queue(
    @Query() query: AdminQueueQueryDto,
  ) {
    return this.service.queue(query);
  }
  @Get('confessions/:id') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) detail(
    @Param('id') id: string,
  ) {
    return this.service.detail(id);
  }
  @Patch('confessions/:id') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) edit(
    @Param('id') id: string,
    @Body() body: UpdateConfessionDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.edit(id, body, requireUser(req));
  }
  @Post('confessions/:id/approve') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) approve(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.transition(id, 'approve', requireUser(req));
  }
  @Post('confessions/:id/reject') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) reject(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.transition(id, 'reject', requireUser(req));
  }
  @Post('confessions/:id/archive') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) archive(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.transition(id, 'archive', requireUser(req));
  }
  @Get('reports') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) reports(
    @Query() query: { page?: number; limit?: number; status?: ReportStatus },
  ) {
    return this.service.reports(query);
  }
  @Get('reports/:id') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) report(
    @Param('id') id: string,
  ) {
    return this.service.report(id);
  }
  @Post('reports/:id/resolve') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) resolve(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.reportAction(id, 'resolve', requireUser(req));
  }
  @Post('reports/:id/dismiss') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) dismiss(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.reportAction(id, 'dismiss', requireUser(req));
  }
  @Get('audit-logs') @Roles(AdminRole.SUPER_ADMIN) audit(
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.service.audit(query);
  }
  @Get('themes') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER) themes() {
    return this.service.themes();
  }
  @Post('themes') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) createTheme(
    @Body() body: CreateThemeDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.createTheme(body, requireUser(req));
  }
  @Patch('themes/:id') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) updateTheme(
    @Param('id') id: string,
    @Body() body: UpdateThemeDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateTheme(id, body, requireUser(req));
  }
}
@Module({
  controllers: [AdminAuthController, AdminController],
  providers: [AdminService, JwtAuthGuard, RolesGuard],
})
export class AdminModule {}
