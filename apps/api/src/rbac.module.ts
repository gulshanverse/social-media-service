import {
  BadRequestException,
  Body,
  Controller,
  createParamDecorator,
  Delete,
  ExecutionContext,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { AdminRole, PermissionEffect, Prisma } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard, Permissions, prisma, requireUser, RolesGuard } from './admin-auth';
import type { AdminIdentity } from './admin-auth';
import { PERMISSION_CATALOG, PERMISSIONS, RESERVED_PERMISSIONS } from './permissions';

class RoleDto {
  @IsString() @MinLength(2) @MaxLength(80) key!: string;
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(240) description?: string;
  @IsArray() @IsString({ each: true }) permissions!: string[];
}
class RolePermissionsDto {
  @IsArray() @IsString({ each: true }) permissions!: string[];
}
class RoleAssignmentDto {
  @IsString() @MinLength(1) @MaxLength(80) roleKey!: string;
}
class PermissionOverrideDto {
  @IsString() @MinLength(1) @MaxLength(120) permissionKey!: string;
  @IsEnum(PermissionEffect) effect!: PermissionEffect;
}

function assertSuperAdmin(actor: AdminIdentity) {
  if (actor.role !== AdminRole.SUPER_ADMIN)
    throw new ForbiddenException('SUPER_ADMIN authorization required.');
}

const ReqUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  requireUser(context.switchToHttp().getRequest()),
);

@Injectable()
export class RbacService {
  private validatePermissionKeys(keys: string[]) {
    const known = new Set(PERMISSION_CATALOG.map((permission) => permission.key));
    const unique = [...new Set(keys)];
    if (unique.some((key) => !known.has(key as (typeof PERMISSION_CATALOG)[number]['key'])))
      throw new BadRequestException('Unknown permission.');
    if (unique.some((key) => RESERVED_PERMISSIONS.has(key as never)))
      throw new BadRequestException('Reserved permissions can only be managed by SUPER_ADMIN.');
    return unique;
  }
  private async audit(
    database: Prisma.TransactionClient,
    actorId: string,
    action: string,
    entityId: string,
    metadata: Prisma.InputJsonValue,
  ) {
    await database.auditLog.create({
      data: { actorId, action, entity: 'RBAC', entityId, metadata },
    });
  }
  async permissions(actor: AdminIdentity) {
    assertSuperAdmin(actor);
    return PERMISSION_CATALOG;
  }
  async roles(actor: AdminIdentity) {
    assertSuperAdmin(actor);
    return prisma.adminRoleDefinition.findMany({
      orderBy: { key: 'asc' },
      include: {
        permissions: { select: { permissionKey: true } },
        _count: { select: { assignments: true } },
      },
    });
  }
  async createRole(body: RoleDto, actor: AdminIdentity) {
    assertSuperAdmin(actor);
    const permissions = this.validatePermissionKeys(body.permissions);
    return prisma.$transaction(async (database) => {
      const role = await database.adminRoleDefinition.create({
        data: {
          key: body.key.trim().toUpperCase(),
          name: body.name.trim(),
          description: body.description?.trim() || null,
          permissions: { create: permissions.map((permissionKey) => ({ permissionKey })) },
        },
        include: { permissions: true },
      });
      await this.audit(database, actor.id, 'RBAC_ROLE_CREATED', role.id, {
        key: role.key,
        permissions,
      });
      return role;
    });
  }
  async updateRole(key: string, body: RolePermissionsDto, actor: AdminIdentity) {
    assertSuperAdmin(actor);
    const permissions = this.validatePermissionKeys(body.permissions);
    return prisma.$transaction(async (database) => {
      const role = await database.adminRoleDefinition.findUnique({ where: { key } });
      if (!role || role.system) throw new BadRequestException('System roles cannot be changed.');
      await database.adminRolePermission.deleteMany({ where: { roleId: role.id } });
      await database.adminRolePermission.createMany({
        data: permissions.map((permissionKey) => ({ roleId: role.id, permissionKey })),
      });
      await this.audit(database, actor.id, 'RBAC_ROLE_PERMISSIONS_CHANGED', role.id, {
        key: role.key,
        permissions,
      });
      return database.adminRoleDefinition.findUnique({
        where: { id: role.id },
        include: { permissions: true },
      });
    });
  }
  async deleteRole(key: string, actor: AdminIdentity) {
    assertSuperAdmin(actor);
    return prisma.$transaction(async (database) => {
      const role = await database.adminRoleDefinition.findUnique({ where: { key } });
      if (!role || role.system) throw new BadRequestException('System roles cannot be deleted.');
      await database.adminRoleDefinition.delete({ where: { id: role.id } });
      await this.audit(database, actor.id, 'RBAC_ROLE_DELETED', role.id, { key: role.key });
      return { key: role.key, deleted: true };
    });
  }
  async assignRole(adminId: string, body: RoleAssignmentDto, actor: AdminIdentity) {
    assertSuperAdmin(actor);
    return prisma.$transaction(async (database) => {
      const role = await database.adminRoleDefinition.findUnique({ where: { key: body.roleKey } });
      const target = await database.adminUser.findUnique({
        where: { id: adminId },
        select: { id: true },
      });
      if (!role || !target) throw new NotFoundException('Administrator or role not found.');
      const assignment = await database.adminRoleAssignment.upsert({
        where: { adminId_roleId: { adminId, roleId: role.id } },
        update: {},
        create: { adminId, roleId: role.id },
      });
      await this.audit(database, actor.id, 'RBAC_ROLE_ASSIGNED', adminId, {
        roleKey: role.key,
      });
      return assignment;
    });
  }
  async removeRole(adminId: string, key: string, actor: AdminIdentity) {
    assertSuperAdmin(actor);
    return prisma.$transaction(async (database) => {
      const role = await database.adminRoleDefinition.findUnique({ where: { key } });
      if (!role) throw new NotFoundException('Role not found.');
      await database.adminRoleAssignment.deleteMany({ where: { adminId, roleId: role.id } });
      await this.audit(database, actor.id, 'RBAC_ROLE_REMOVED', adminId, { roleKey: key });
      return { adminId, roleKey: key, removed: true };
    });
  }
  async override(adminId: string, body: PermissionOverrideDto, actor: AdminIdentity) {
    assertSuperAdmin(actor);
    const [permission, target] = await Promise.all([
      prisma.permission.findUnique({ where: { key: body.permissionKey } }),
      prisma.adminUser.findUnique({ where: { id: adminId }, select: { id: true } }),
    ]);
    if (!permission || !target)
      throw new NotFoundException('Administrator or permission not found.');
    if (permission.reserved)
      throw new BadRequestException('Reserved permissions cannot be overridden.');
    return prisma.$transaction(async (database) => {
      const override = await database.adminPermissionOverride.upsert({
        where: { adminId_permissionKey: { adminId, permissionKey: body.permissionKey } },
        update: { effect: body.effect },
        create: { adminId, permissionKey: body.permissionKey, effect: body.effect },
      });
      await this.audit(database, actor.id, 'RBAC_PERMISSION_OVERRIDE_CHANGED', adminId, {
        permissionKey: body.permissionKey,
        effect: body.effect,
      });
      return override;
    });
  }
  async clearOverride(adminId: string, key: string, actor: AdminIdentity) {
    assertSuperAdmin(actor);
    this.validatePermissionKeys([key]);
    return prisma.$transaction(async (database) => {
      await database.adminPermissionOverride.deleteMany({
        where: { adminId, permissionKey: key },
      });
      await this.audit(database, actor.id, 'RBAC_PERMISSION_OVERRIDE_CLEARED', adminId, {
        permissionKey: key,
      });
      return { adminId, permissionKey: key, cleared: true };
    });
  }
}

@Controller('admin/rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RbacController {
  constructor(private readonly service: RbacService) {}
  @Get('permissions')
  @Permissions(PERMISSIONS.PERMISSIONS_MANAGE)
  permissions(@ReqUser() actor: AdminIdentity) {
    return this.service.permissions(actor);
  }
  @Get('roles')
  @Permissions(PERMISSIONS.ROLES_MANAGE)
  roles(@ReqUser() actor: AdminIdentity) {
    return this.service.roles(actor);
  }
  @Post('roles')
  @Permissions(PERMISSIONS.ROLES_MANAGE)
  createRole(@Body() body: RoleDto, @ReqUser() actor: AdminIdentity) {
    return this.service.createRole(body, actor);
  }
  @Patch('roles/:key')
  @Permissions(PERMISSIONS.ROLES_MANAGE)
  updateRole(
    @Param('key') key: string,
    @Body() body: RolePermissionsDto,
    @ReqUser() actor: AdminIdentity,
  ) {
    return this.service.updateRole(key, body, actor);
  }
  @Delete('roles/:key')
  @Permissions(PERMISSIONS.ROLES_MANAGE)
  deleteRole(@Param('key') key: string, @ReqUser() actor: AdminIdentity) {
    return this.service.deleteRole(key, actor);
  }
  @Post('users/:id/roles')
  @Permissions(PERMISSIONS.ROLES_MANAGE)
  assignRole(
    @Param('id') id: string,
    @Body() body: RoleAssignmentDto,
    @ReqUser() actor: AdminIdentity,
  ) {
    return this.service.assignRole(id, body, actor);
  }
  @Delete('users/:id/roles/:key')
  @Permissions(PERMISSIONS.ROLES_MANAGE)
  removeRole(@Param('id') id: string, @Param('key') key: string, @ReqUser() actor: AdminIdentity) {
    return this.service.removeRole(id, key, actor);
  }
  @Put('users/:id/overrides')
  @Permissions(PERMISSIONS.PERMISSIONS_MANAGE)
  override(
    @Param('id') id: string,
    @Body() body: PermissionOverrideDto,
    @ReqUser() actor: AdminIdentity,
  ) {
    return this.service.override(id, body, actor);
  }
  @Delete('users/:id/overrides/:key')
  @Permissions(PERMISSIONS.PERMISSIONS_MANAGE)
  clearOverride(
    @Param('id') id: string,
    @Param('key') key: string,
    @ReqUser() actor: AdminIdentity,
  ) {
    return this.service.clearOverride(id, key, actor);
  }
}
