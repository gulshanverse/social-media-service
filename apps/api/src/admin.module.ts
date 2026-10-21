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
import { AdminRole, ConfessionCommentStatus } from '@prisma/client';
import { AdminAuthController } from './admin.controller';
import { AdminService } from './admin.service';
import {
  JwtAuthGuard,
  Permissions,
  Roles,
  RolesGuard,
  prisma,
  recordAudit,
  requireUser,
} from './admin-auth';
import { PERMISSIONS } from './permissions';
import { RbacController, RbacService } from './rbac.module';
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
  @Permissions(PERMISSIONS.DASHBOARD_READ)
  @Get('dashboard')
  dashboard(@Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.dashboardExtended(requireUser(req));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_READ)
  @Get('confession-comments')
  comments(@Query('status') status?: string, @Query('page') rawPage?: string) {
    const page = Math.min(100, Math.max(1, Number(rawPage) || 1));
    const validStatus =
      status && Object.values(ConfessionCommentStatus).includes(status as ConfessionCommentStatus)
        ? (status as ConfessionCommentStatus)
        : undefined;
    const where = validStatus ? { status: validStatus } : {};
    return Promise.all([
      prisma.confessionComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * 25,
        take: 25,
        include: {
          profile: true,
          confession: { select: { publicId: true, content: true } },
          parent: { select: { content: true } },
        },
      }),
      prisma.confessionComment.count({ where }),
    ]).then(([items, total]) => ({ items, page, limit: 25, total, hasMore: page * 25 < total }));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_MODERATE)
  @Post('confession-comments/:id/:action')
  async moderateComment(
    @Param('id') id: string,
    @Param('action') action: 'approve' | 'reject' | 'archive' | 'lock',
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    const statusByAction = {
      approve: ConfessionCommentStatus.PUBLISHED,
      reject: ConfessionCommentStatus.REJECTED,
      archive: ConfessionCommentStatus.ARCHIVED,
      lock: ConfessionCommentStatus.LOCKED,
    } as const;
    const status = statusByAction[action];
    if (!status) throw new BadRequestException('Unsupported comment moderation action.');
    const result = await prisma.confessionComment.updateMany({
      where: {
        id,
        status: {
          in: [
            ConfessionCommentStatus.PENDING,
            ConfessionCommentStatus.PUBLISHED,
            ConfessionCommentStatus.LOCKED,
          ],
        },
      },
      data: { status },
    });
    if (!result.count)
      throw new BadRequestException('Comment is unavailable or already moderated.');
    await recordAudit(
      requireUser(req).id,
      `COMMENT_${action.toUpperCase()}`,
      'CONFESSION_COMMENT',
      id,
    );
    return { id, status };
  }
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @Get('users')
  @Roles(AdminRole.SUPER_ADMIN)
  users(@Query() query: AdminUserQueryDto) {
    return this.service.listAdministrators(query);
  }
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @Get('users/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  user(@Param('id') id: string) {
    return this.service.getAdministrator(id);
  }
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @Post('users')
  @Roles(AdminRole.SUPER_ADMIN)
  createUser(
    @Body() body: CreateAdminUserDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.createAdministrator(body, requireUser(req));
  }
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @Patch('users/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  updateUser(
    @Param('id') id: string,
    @Body() body: UpdateAdminUserDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateAdministrator(id, body, requireUser(req));
  }
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @Patch('users/:id/role')
  @Roles(AdminRole.SUPER_ADMIN)
  changeUserRole(
    @Param('id') id: string,
    @Body() body: UpdateAdminRoleDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.changeAdministratorRole(id, body, requireUser(req));
  }
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @Patch('users/:id/status')
  @Roles(AdminRole.SUPER_ADMIN)
  changeUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateAdminStatusDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.changeAdministratorStatus(id, body, requireUser(req));
  }
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @Post('users/:id/reset-password')
  @Roles(AdminRole.SUPER_ADMIN)
  resetUserPassword(
    @Param('id') id: string,
    @Body() body: ResetAdminPasswordDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.resetAdministratorPassword(id, body, requireUser(req));
  }
  @Permissions(PERMISSIONS.SESSIONS_MANAGE)
  @Post('users/:id/revoke-sessions')
  @Roles(AdminRole.SUPER_ADMIN)
  revokeUserSessions(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.revokeAdministratorSessions(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @Delete('users/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  deleteUser(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.changeAdministratorStatus(id, { status: 'DELETED' }, requireUser(req));
  }
  @Permissions(PERMISSIONS.GARBA_READ)
  @Get('garba')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaDashboard() {
    return this.service.garbaDashboard();
  }
  @Permissions(PERMISSIONS.GARBA_READ)
  @Get('garba/posts')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaPosts(@Query() query: AdminGarbaQueryDto) {
    return this.service.garbaPosts(query);
  }
  @Permissions(PERMISSIONS.GARBA_READ)
  @Get('garba/posts/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaPost(@Param('id') id: string) {
    return this.service.garbaPost(id);
  }
  @Permissions(PERMISSIONS.GARBA_EDIT)
  @Patch('garba/posts/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaEdit(
    @Param('id') id: string,
    @Body() body: UpdateGarbaPostDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateGarbaPost(id, body, requireUser(req));
  }
  @Permissions(PERMISSIONS.GARBA_MODERATE)
  @Post('garba/posts/:id/:action')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaTransition(
    @Param('id') id: string,
    @Param('action') action: 'approve' | 'reject' | 'archive' | 'restore',
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.garbaTransition(id, action, requireUser(req));
  }
  @Permissions(PERMISSIONS.GARBA_MODERATE)
  @Post('garba/posts/:id/comments-lock')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaLockComments(
    @Param('id') id: string,
    @Body() body: { locked: boolean },
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.garbaLockComments(id, body.locked === true, requireUser(req));
  }
  @Permissions(PERMISSIONS.GARBA_READ)
  @Get('garba/comments')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaComments(@Query() query: AdminGarbaCommentQueryDto) {
    return this.service.garbaComments(query);
  }
  @Permissions(PERMISSIONS.GARBA_MODERATE)
  @Post('garba/comments/:id/:action')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaCommentTransition(
    @Param('id') id: string,
    @Param('action') action: 'approve' | 'reject' | 'archive' | 'restore',
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.garbaCommentTransition(id, action, requireUser(req));
  }
  @Permissions(PERMISSIONS.GARBA_EDIT)
  @Patch('garba/comments/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaCommentEdit(
    @Param('id') id: string,
    @Body() body: UpdateGarbaCommentDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateGarbaComment(id, body, requireUser(req));
  }
  @Permissions(PERMISSIONS.GARBA_MODERATE)
  @Delete('garba/comments/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaCommentDelete(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.deleteGarbaComment(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.GARBA_READ)
  @Get('garba/reports')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaReports(@Query() query: AdminReportQueryDto) {
    return this.service.garbaReports(query);
  }
  @Permissions(PERMISSIONS.GARBA_MODERATE)
  @Post('garba/reports/:id/:action')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaReportAction(
    @Param('id') id: string,
    @Param('action') action: 'resolve' | 'dismiss',
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.garbaReportAction(id, action, requireUser(req));
  }
  @Permissions(PERMISSIONS.GARBA_READ)
  @Get('garba/seasons')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  garbaSeasons() {
    return this.service.garbaSeasonSettings();
  }
  @Permissions(PERMISSIONS.GARBA_SEASONS_MANAGE)
  @Patch('garba/seasons')
  @Roles(AdminRole.SUPER_ADMIN)
  updateGarbaSeason(
    @Body() body: UpdateGarbaSeasonDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateGarbaSeason(body, requireUser(req));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_READ)
  @Get('confessions')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  queue(@Query() query: AdminQueueQueryDto, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.queue(query, requireUser(req));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_READ)
  @Get('confessions/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
  @Permissions(PERMISSIONS.CONFESSIONS_EDIT)
  @Patch('confessions/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  edit(
    @Param('id') id: string,
    @Body() body: UpdateConfessionDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.edit(id, body, requireUser(req));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_MODERATE)
  @Post('confessions/:id/approve')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  approve(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.transition(id, 'approve', requireUser(req));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_MODERATE)
  @Post('confessions/:id/reject')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  reject(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.transition(id, 'reject', requireUser(req));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_MODERATE)
  @Post('confessions/:id/archive')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  archive(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.transition(id, 'archive', requireUser(req));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_MODERATE)
  @Post('confessions/:id/restore')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  restore(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.restore(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_DELETE)
  @Delete('confessions/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  async permanentlyDelete(
    @Param('id') id: string,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.permanentlyDelete(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.CONFESSIONS_MODERATE)
  @Post('confessions/bulk')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  bulk(
    @Body(new BulkModerationPipe()) body: BulkModerationDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.bulkModerate(body, requireUser(req));
  }
  @Permissions(PERMISSIONS.REPORTS_READ)
  @Get('reports')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  reports(@Query() query: AdminReportQueryDto) {
    return this.service.reports(query);
  }
  @Permissions(PERMISSIONS.REPORTS_READ)
  @Get('reports/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  report(@Param('id') id: string) {
    return this.service.report(id);
  }
  @Permissions(PERMISSIONS.REPORTS_MANAGE)
  @Post('reports/:id/resolve')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  resolve(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.reportAction(id, 'resolve', requireUser(req));
  }
  @Permissions(PERMISSIONS.REPORTS_MANAGE)
  @Post('reports/:id/dismiss')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  dismiss(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.reportAction(id, 'dismiss', requireUser(req));
  }
  @Permissions(PERMISSIONS.AUDIT_READ)
  @Get(['audit', 'audit-logs'])
  @Roles(AdminRole.SUPER_ADMIN)
  audit(@Query() query: AdminAuditQueryDto) {
    return this.service.audit(query);
  }
  @Permissions(PERMISSIONS.THEMES_READ)
  @Get('themes')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER)
  themes(@Query() query: ListQueryDto) {
    return this.service.themes(query);
  }
  @Permissions(PERMISSIONS.THEMES_MANAGE)
  @Post('themes')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  createTheme(@Body() body: CreateThemeDto, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.createTheme(body, requireUser(req));
  }
  @Permissions(PERMISSIONS.THEMES_READ)
  @Get('themes/:id/export')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  exportTheme(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.exportTheme(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.THEMES_MANAGE)
  @Post('themes/import/preview')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  previewThemeImport(@Body() body: ImportThemeDto) {
    return this.service.previewThemeImport(body);
  }
  @Permissions(PERMISSIONS.THEMES_MANAGE)
  @Post('themes/import')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  importTheme(@Body() body: ImportThemeDto, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.importTheme(body, requireUser(req));
  }
  @Permissions(PERMISSIONS.THEMES_MANAGE)
  @Patch('themes/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  updateTheme(
    @Param('id') id: string,
    @Body() body: UpdateThemeDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateTheme(id, body, requireUser(req));
  }
  @Permissions(PERMISSIONS.THEMES_MANAGE)
  @Post('themes/:id/publish')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  publishTheme(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.publishTheme(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.THEMES_MANAGE)
  @Post('themes/:id/activate')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  activateTheme(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.activateTheme(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.THEMES_MANAGE)
  @Post('themes/:id/duplicate')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  duplicateTheme(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.duplicateTheme(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.THEMES_MANAGE)
  @Delete('themes/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  deleteTheme(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.deleteTheme(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.THEMES_READ)
  @Post('themes/:id/favorite')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER)
  favoriteTheme(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.favoriteTheme(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.THEMES_READ)
  @Delete('themes/:id/favorite')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.DESIGNER)
  unfavoriteTheme(@Param('id') id: string, @Req() req: { user?: ReturnType<typeof requireUser> }) {
    return this.service.unfavoriteTheme(id, requireUser(req));
  }
  @Permissions(PERMISSIONS.PROFILE_MANAGE)
  @Get('profile-settings')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  profileSettings() {
    return this.service.profileSettings();
  }
  @Permissions(PERMISSIONS.PROFILE_MANAGE)
  @Patch('profile-settings')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
  updateProfileSettings(
    @Body() body: UpdateProfileSettingsDto,
    @Req() req: { user?: ReturnType<typeof requireUser> },
  ) {
    return this.service.updateProfileSettings(body, requireUser(req));
  }
  @Permissions(PERMISSIONS.PROFILE_MANAGE)
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
  controllers: [AdminAuthController, AdminController, RbacController],
  providers: [AdminService, RbacService, JwtAuthGuard, RolesGuard],
})
export class AdminModule {}
