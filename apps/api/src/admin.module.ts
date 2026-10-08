import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { put } from '@vercel/blob';
import { AdminRole } from '@prisma/client';
import { AdminAuthController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard, Roles, RolesGuard, requireUser } from './admin-auth';
import {
  AdminAuditQueryDto,
  BulkModerationDto,
  AdminQueueQueryDto,
  AdminReportQueryDto,
  BulkModerationPipe,
  CreateThemeDto,
  ImportThemeDto,
  ListQueryDto,
  UpdateConfessionDto,
  UpdateProfileSettingsDto,
  UpdateThemeDto,
  AdminGarbaCommentQueryDto,
  AdminGarbaQueryDto,
  UpdateGarbaPostDto,
  UpdateGarbaCommentDto,
  UpdateGarbaSeasonDto,
  AdminUserQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  UpdateAdminRoleDto,
  UpdateAdminStatusDto,
  ResetAdminPasswordDto,
} from './admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(@Inject(AdminService) private readonly service: AdminService) {}
  @Get('dashboard') dashboard(@Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.dashboardExtended(requireUser(req));
  }
  @Get('users') @Roles(AdminRole.SUPER_ADMIN) users(@Query() query: AdminUserQueryDto) {
    return this.service.listAdministrators(query);
  }
  @Get('users/:id') @Roles(AdminRole.SUPER_ADMIN) user(@Param('id') id: string) {
    return this.service.getAdministrator(id);
  }
  @Post('users') @Roles(AdminRole.SUPER_ADMIN) createUser(
    @Body() body: CreateAdminUserDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.createAdministrator(body, requireUser(req));
  }
  @Patch('users/:id') @Roles(AdminRole.SUPER_ADMIN) updateUser(
    @Param('id') id: string,
    @Body() body: UpdateAdminUserDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateAdministrator(id, body, requireUser(req));
  }
  @Patch('users/:id/role') @Roles(AdminRole.SUPER_ADMIN) changeUserRole(
    @Param('id') id: string,
    @Body() body: UpdateAdminRoleDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.changeAdministratorRole(id, body, requireUser(req));
  }
  @Patch('users/:id/status') @Roles(AdminRole.SUPER_ADMIN) changeUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateAdminStatusDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.changeAdministratorStatus(id, body, requireUser(req));
  }
  @Post('users/:id/reset-password') @Roles(AdminRole.SUPER_ADMIN) resetUserPassword(
    @Param('id') id: string,
    @Body() body: ResetAdminPasswordDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.resetAdministratorPassword(id, body, requireUser(req));
  }
  @Post('users/:id/revoke-sessions') @Roles(AdminRole.SUPER_ADMIN) revokeUserSessions(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.revokeAdministratorSessions(id, requireUser(req));
  }
  @Delete('users/:id') @Roles(AdminRole.SUPER_ADMIN) deleteUser(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.changeAdministratorStatus(id, { status: 'DELETED' }, requireUser(req));
  }
  @Get('garba') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) garbaDashboard() {
    return this.service.garbaDashboard();
  }
  @Get('garba/posts') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) garbaPosts(
    @Query() query: AdminGarbaQueryDto,
  ) {
    return this.service.garbaPosts(query);
  }
  @Get('garba/posts/:id') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) garbaPost(
    @Param('id') id: string,
  ) {
    return this.service.garbaPost(id);
  }
  @Patch('garba/posts/:id') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) garbaEdit(
    @Param('id') id: string,
    @Body() body: UpdateGarbaPostDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateGarbaPost(id, body, requireUser(req));
  }
  @Post('garba/posts/:id/:action')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaTransition(
    @Param('id') id: string,
    @Param('action') action: 'approve' | 'reject' | 'archive' | 'restore',
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.garbaTransition(id, action, requireUser(req));
  }
  @Post('garba/posts/:id/comments-lock')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaLockComments(
    @Param('id') id: string,
    @Body() body: { locked: boolean },
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.garbaLockComments(id, body.locked === true, requireUser(req));
  }
  @Get('garba/comments') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) garbaComments(
    @Query() query: AdminGarbaCommentQueryDto,
  ) {
    return this.service.garbaComments(query);
  }
  @Post('garba/comments/:id/:action')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaCommentTransition(
    @Param('id') id: string,
    @Param('action') action: 'approve' | 'reject' | 'archive' | 'restore',
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.garbaCommentTransition(id, action, requireUser(req));
  }
  @Patch('garba/comments/:id') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) garbaCommentEdit(
    @Param('id') id: string,
    @Body() body: UpdateGarbaCommentDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateGarbaComment(id, body, requireUser(req));
  }
  @Delete('garba/comments/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaCommentDelete(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.deleteGarbaComment(id, requireUser(req));
  }
  @Get('garba/reports') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) garbaReports(
    @Query() query: AdminReportQueryDto,
  ) {
    return this.service.garbaReports(query);
  }
  @Post('garba/reports/:id/:action')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaReportAction(
    @Param('id') id: string,
    @Param('action') action: 'resolve' | 'dismiss',
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.garbaReportAction(id, action, requireUser(req));
  }
  @Get('garba/seasons') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) garbaSeasons() {
    return this.service.garbaSeasonSettings();
  }
  @Patch('garba/seasons') @Roles(AdminRole.SUPER_ADMIN) updateGarbaSeason(
    @Body() body: UpdateGarbaSeasonDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateGarbaSeason(body, requireUser(req));
  }
  @Get('confessions') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) queue(
    @Query() query: AdminQueueQueryDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.queue(query, requireUser(req));
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
  @Post('confessions/:id/restore') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) restore(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.restore(id, requireUser(req));
  }
  @Delete('confessions/:id') @Roles(AdminRole.SUPER_ADMIN) async permanentlyDelete(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.permanentlyDelete(id, requireUser(req));
  }
  @Post('confessions/bulk') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) bulk(
    @Body(new BulkModerationPipe()) body: BulkModerationDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.bulkModerate(body, requireUser(req));
  }
  @Get('reports') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR) reports(
    @Query() query: AdminReportQueryDto,
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
  @Get(['audit', 'audit-logs']) @Roles(AdminRole.SUPER_ADMIN) audit(
    @Query() query: AdminAuditQueryDto,
  ) {
    return this.service.audit(query);
  }
  @Get('themes') @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER) themes(
    @Query() query: ListQueryDto,
  ) {
    return this.service.themes(query);
  }
  @Post('themes') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) createTheme(
    @Body() body: CreateThemeDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.createTheme(body, requireUser(req));
  }
  @Get('themes/:id/export') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) exportTheme(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.exportTheme(id, requireUser(req));
  }
  @Post('themes/import/preview')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  previewThemeImport(@Body() body: ImportThemeDto) {
    return this.service.previewThemeImport(body);
  }
  @Post('themes/import') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) importTheme(
    @Body() body: ImportThemeDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.importTheme(body, requireUser(req));
  }
  @Patch('themes/:id') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) updateTheme(
    @Param('id') id: string,
    @Body() body: UpdateThemeDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateTheme(id, body, requireUser(req));
  }
  @Post('themes/:id/publish') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) publishTheme(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.publishTheme(id, requireUser(req));
  }
  @Post('themes/:id/activate') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) activateTheme(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.activateTheme(id, requireUser(req));
  }
  @Post('themes/:id/duplicate') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) duplicateTheme(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.duplicateTheme(id, requireUser(req));
  }
  @Delete('themes/:id') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) deleteTheme(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.deleteTheme(id, requireUser(req));
  }
  @Post('themes/:id/favorite')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER)
  favoriteTheme(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.favoriteTheme(id, requireUser(req));
  }
  @Delete('themes/:id/favorite')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER)
  unfavoriteTheme(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.unfavoriteTheme(id, requireUser(req));
  }
  @Get('profile-settings') @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER) profileSettings() {
    return this.service.profileSettings();
  }
  @Patch('profile-settings')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  updateProfileSettings(
    @Body() body: UpdateProfileSettingsDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateProfileSettings(body, requireUser(req));
  }
  @Post('profile-image')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        callback(null, ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype));
      },
    }),
  )
  async uploadProfileImage(
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined,
  ) {
    if (!file) throw new BadRequestException('Choose an image to upload.');
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
    if (!allowed.has(file.mimetype))
      throw new BadRequestException('Use a PNG, JPG, or WEBP image.');
    if (file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Images must be 5 MB or smaller.');
    if (!process.env.BLOB_READ_WRITE_TOKEN)
      throw new ServiceUnavailableException('Image uploads are not configured yet.');
    const extension =
      file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const blob = await put(`college-confession/profile-${Date.now()}.${extension}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url, filename: file.originalname, size: file.size };
  }
}
@Module({
  controllers: [AdminAuthController, AdminController],
  providers: [AdminService, JwtAuthGuard, RolesGuard],
})
export class AdminModule {}
