import { ForbiddenException } from '@nestjs/common';
import { AdminRole, PermissionEffect, PrismaClient } from '@prisma/client';

export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard.read',
  USERS_MANAGE: 'users.manage',
  SESSIONS_MANAGE: 'sessions.manage',
  CONFESSIONS_READ: 'confessions.read',
  CONFESSIONS_EDIT: 'confessions.edit',
  CONFESSIONS_MODERATE: 'confessions.moderate',
  CONFESSIONS_DELETE: 'confessions.delete',
  REPORTS_READ: 'reports.read',
  REPORTS_MANAGE: 'reports.manage',
  AUDIT_READ: 'audit.read',
  THEMES_READ: 'themes.read',
  THEMES_MANAGE: 'themes.manage',
  PROFILE_MANAGE: 'profile.manage',
  GARBA_READ: 'garba.read',
  GARBA_EDIT: 'garba.edit',
  GARBA_MODERATE: 'garba.moderate',
  GARBA_SEASONS_MANAGE: 'garba.seasons.manage',
  BAWALBOX_READ: 'bawalbox.read',
  BAWALBOX_MANAGE: 'bawalbox.manage',
  BAWALBOX_MODERATE: 'bawalbox.moderate',
  ROLES_MANAGE: 'roles.manage',
  PERMISSIONS_MANAGE: 'permissions.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const RESERVED_PERMISSIONS = new Set<PermissionKey>([
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.PERMISSIONS_MANAGE,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.SESSIONS_MANAGE,
]);

const permissionEntries: ReadonlyArray<[PermissionKey, string, boolean]> = [
  [PERMISSIONS.DASHBOARD_READ, 'Read dashboard aggregates', false],
  [PERMISSIONS.USERS_MANAGE, 'Manage administrator accounts', true],
  [PERMISSIONS.SESSIONS_MANAGE, 'Revoke administrator sessions', true],
  [PERMISSIONS.CONFESSIONS_READ, 'Read confession moderation records', false],
  [PERMISSIONS.CONFESSIONS_EDIT, 'Edit confession content', false],
  [PERMISSIONS.CONFESSIONS_MODERATE, 'Transition confession moderation state', false],
  [PERMISSIONS.CONFESSIONS_DELETE, 'Permanently delete confessions', false],
  [PERMISSIONS.REPORTS_READ, 'Read confession reports', false],
  [PERMISSIONS.REPORTS_MANAGE, 'Resolve and dismiss confession reports', false],
  [PERMISSIONS.AUDIT_READ, 'Read audit activity', false],
  [PERMISSIONS.THEMES_READ, 'Read themes', false],
  [PERMISSIONS.THEMES_MANAGE, 'Create and manage themes', false],
  [PERMISSIONS.PROFILE_MANAGE, 'Manage profile settings', false],
  [PERMISSIONS.GARBA_READ, 'Read Garba moderation records', false],
  [PERMISSIONS.GARBA_EDIT, 'Edit Garba content', false],
  [PERMISSIONS.GARBA_MODERATE, 'Transition Garba moderation state', false],
  [PERMISSIONS.GARBA_SEASONS_MANAGE, 'Manage Garba seasons', false],
  [PERMISSIONS.BAWALBOX_READ, 'Read BawalBox content and settings', false],
  [PERMISSIONS.BAWALBOX_MANAGE, 'Manage BawalBox branding and questions', false],
  [PERMISSIONS.BAWALBOX_MODERATE, 'Moderate BawalBox responses', false],
  [PERMISSIONS.ROLES_MANAGE, 'Manage custom administrator roles', true],
  [PERMISSIONS.PERMISSIONS_MANAGE, 'Assign permissions and overrides', true],
];

export const PERMISSION_CATALOG = permissionEntries.map(([key, description, reserved]) => ({
  key,
  description,
  reserved,
}));
export function effectivePermissionKeys(
  role: AdminRole,
  rolePermissionKeys: Iterable<string>,
  overrides: Iterable<{ permissionKey: string; effect: PermissionEffect }>,
) {
  if (role === AdminRole.SUPER_ADMIN) return PERMISSION_CATALOG.map(({ key }) => key);
  const effective = new Set<PermissionKey>(LEGACY_ROLE_PERMISSIONS[role]);
  for (const permissionKey of rolePermissionKeys)
    if (Object.values(PERMISSIONS).includes(permissionKey as PermissionKey))
      effective.add(permissionKey as PermissionKey);
  for (const override of overrides) {
    if (override.effect === PermissionEffect.GRANT)
      effective.add(override.permissionKey as PermissionKey);
    else effective.delete(override.permissionKey as PermissionKey);
  }
  return PERMISSION_CATALOG.filter(({ key }) => effective.has(key)).map(({ key }) => key);
}

const LEGACY_ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<PermissionKey>> = {
  [AdminRole.SUPER_ADMIN]: new Set(Object.values(PERMISSIONS)),
  [AdminRole.MODERATOR]: new Set([
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.CONFESSIONS_READ,
    PERMISSIONS.CONFESSIONS_EDIT,
    PERMISSIONS.CONFESSIONS_MODERATE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_MANAGE,
    PERMISSIONS.THEMES_READ,
    PERMISSIONS.GARBA_READ,
    PERMISSIONS.GARBA_EDIT,
    PERMISSIONS.GARBA_MODERATE,
    PERMISSIONS.BAWALBOX_READ,
    PERMISSIONS.BAWALBOX_MODERATE,
  ]),
  [AdminRole.DESIGNER]: new Set([
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.THEMES_READ,
    PERMISSIONS.THEMES_MANAGE,
    PERMISSIONS.PROFILE_MANAGE,
    PERMISSIONS.BAWALBOX_READ,
    PERMISSIONS.BAWALBOX_MANAGE,
  ]),
};

export type PermissionIdentity = { id: string; role: AdminRole };

export async function hasPermission(
  database: PrismaClient,
  identity: PermissionIdentity,
  permission: string,
): Promise<boolean> {
  if (!Object.values(PERMISSIONS).includes(permission as PermissionKey)) return false;
  if (identity.role === AdminRole.SUPER_ADMIN) return true;
  if (RESERVED_PERMISSIONS.has(permission as PermissionKey)) return false;
  try {
    const [admin, override] = await Promise.all([
      database.adminUser.findUnique({
        where: { id: identity.id },
        select: {
          role: true,
          roleAssignments: {
            select: { role: { select: { permissions: { select: { permissionKey: true } } } } },
          },
        },
      }),
      database.adminPermissionOverride?.findUnique
        ? database.adminPermissionOverride.findUnique({
            where: { adminId_permissionKey: { adminId: identity.id, permissionKey: permission } },
            select: { effect: true },
          })
        : null,
    ]);
    if (!admin || override?.effect === PermissionEffect.DENY) return false;
    const inherited = new Set<PermissionKey>(LEGACY_ROLE_PERMISSIONS[admin.role]);
    for (const assignment of admin.roleAssignments ?? [])
      for (const grant of assignment.role.permissions)
        inherited.add(grant.permissionKey as PermissionKey);
    return (
      override?.effect === PermissionEffect.GRANT || inherited.has(permission as PermissionKey)
    );
  } catch {
    return false;
  }
}

export async function assertPermissions(
  database: PrismaClient,
  identity: PermissionIdentity,
  required: readonly string[],
) {
  for (const permission of required) {
    if (!(await hasPermission(database, identity, permission)))
      throw new ForbiddenException('You do not have permission for this operation.');
  }
}
