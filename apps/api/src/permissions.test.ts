import 'reflect-metadata';
import assert from 'node:assert/strict';
import { AdminRole, PermissionEffect } from '@prisma/client';
import { AdminController } from './admin.module';
import { RbacController, RbacService } from './rbac.module';
import { effectivePermissionKeys, hasPermission } from './permissions';
import { prisma, setPrismaForTests } from './admin-auth';

function databaseFor(options: {
  role: AdminRole;
  grants?: string[];
  overrides?: Record<string, PermissionEffect>;
}) {
  return {
    adminUser: {
      findUnique: async () => ({
        role: options.role,
        roleAssignments: [
          {
            role: {
              permissions: (options.grants ?? []).map((permissionKey) => ({ permissionKey })),
            },
          },
        ],
      }),
    },
    adminPermissionOverride: {
      findUnique: async ({
        where,
      }: {
        where: { adminId_permissionKey: { permissionKey: string } };
      }) => {
        const effect = options.overrides?.[where.adminId_permissionKey.permissionKey];
        return effect ? { effect } : null;
      },
    },
  } as never;
}

async function main() {
  const realPrisma = prisma;
  for (const [method, permission] of Object.entries({
    dashboard: 'dashboard.read',
    queue: 'confessions.read',
    permanentlyDelete: 'confessions.delete',
    bulk: 'confessions.moderate',
    resolve: 'reports.manage',
    audit: 'audit.read',
    createTheme: 'themes.manage',
    updateGarbaSeason: 'garba.seasons.manage',
  }))
    assert.deepEqual(
      Reflect.getMetadata('permissions', (AdminController.prototype as any)[method]),
      [permission],
    );
  assert.equal(
    await hasPermission(
      databaseFor({ role: AdminRole.MODERATOR }),
      { id: 'mod', role: AdminRole.MODERATOR },
      'confessions.moderate',
    ),
    true,
  );
  assert.equal(
    await hasPermission(
      databaseFor({ role: AdminRole.DESIGNER }),
      { id: 'designer', role: AdminRole.DESIGNER },
      'confessions.moderate',
    ),
    false,
  );
  assert.equal(
    await hasPermission(
      databaseFor({ role: AdminRole.DESIGNER, grants: ['confessions.read'] }),
      { id: 'designer', role: AdminRole.DESIGNER },
      'confessions.read',
    ),
    true,
  );
  assert.equal(
    await hasPermission(
      databaseFor({
        role: AdminRole.MODERATOR,
        overrides: { 'confessions.moderate': PermissionEffect.DENY },
      }),
      { id: 'mod', role: AdminRole.MODERATOR },
      'confessions.moderate',
    ),
    false,
  );
  assert.equal(
    await hasPermission(
      databaseFor({
        role: AdminRole.DESIGNER,
        overrides: { 'confessions.read': PermissionEffect.GRANT },
      }),
      { id: 'designer', role: AdminRole.DESIGNER },
      'confessions.read',
    ),
    true,
  );
  assert.equal(
    await hasPermission(
      databaseFor({ role: AdminRole.DESIGNER, grants: ['roles.manage'] }),
      { id: 'designer', role: AdminRole.DESIGNER },
      'roles.manage',
    ),
    false,
  );
  assert.equal(
    await hasPermission(
      databaseFor({ role: AdminRole.MODERATOR }),
      { id: 'mod', role: AdminRole.MODERATOR },
      'not-real',
    ),
    false,
  );
  assert.equal(
    await hasPermission(
      databaseFor({ role: AdminRole.SUPER_ADMIN }),
      { id: 'super', role: AdminRole.SUPER_ADMIN },
      'permissions.manage',
    ),
    true,
  );
  assert.deepEqual(
    effectivePermissionKeys(
      AdminRole.DESIGNER,
      ['confessions.read', 'not-real'],
      [
        { permissionKey: 'confessions.read', effect: PermissionEffect.DENY },
        { permissionKey: 'reports.read', effect: PermissionEffect.GRANT },
      ],
    ),
    ['dashboard.read', 'reports.read', 'themes.read', 'themes.manage', 'profile.manage'],
  );
  assert.deepEqual(
    effectivePermissionKeys(
      AdminRole.SUPER_ADMIN,
      [],
      [{ permissionKey: 'confessions.read', effect: PermissionEffect.DENY }],
    ),
    [
      'dashboard.read',
      'users.manage',
      'sessions.manage',
      'confessions.read',
      'confessions.edit',
      'confessions.moderate',
      'confessions.delete',
      'reports.read',
      'reports.manage',
      'audit.read',
      'themes.read',
      'themes.manage',
      'profile.manage',
      'garba.read',
      'garba.edit',
      'garba.moderate',
      'garba.seasons.manage',
      'roles.manage',
      'permissions.manage',
    ],
  );
  assert.deepEqual(Reflect.getMetadata('permissions', RbacController.prototype.userAccess), [
    'permissions.manage',
  ]);
  setPrismaForTests({
    adminUser: {
      findUnique: async () => ({
        id: 'target',
        email: 'target@example.com',
        name: 'Target',
        role: AdminRole.DESIGNER,
        isActive: true,
        bannedAt: null,
        deletedAt: null,
        roleAssignments: [
          {
            role: {
              id: 'role-1',
              key: 'CUSTOM_DESIGNER',
              name: 'Custom Designer',
              description: null,
              system: false,
              permissions: [{ permissionKey: 'confessions.read' }],
            },
          },
        ],
        permissionOverrides: [
          { permissionKey: 'confessions.read', effect: PermissionEffect.DENY },
          { permissionKey: 'reports.read', effect: PermissionEffect.GRANT },
        ],
      }),
    },
  } as any);
  try {
    const access = await new RbacService().userAccess('target', {
      id: 'super',
      email: 'super@example.com',
      name: null,
      role: AdminRole.SUPER_ADMIN,
    });
    assert.equal(access.admin.email, 'target@example.com');
    assert.equal('passwordHash' in access.admin, false);
    assert.deepEqual(access.roles[0].permissions, ['confessions.read']);
    assert.deepEqual(access.effectivePermissions, [
      'dashboard.read',
      'reports.read',
      'themes.read',
      'themes.manage',
      'profile.manage',
    ]);
    await assert.rejects(
      () =>
        new RbacService().userAccess('target', {
          id: 'designer',
          email: 'designer@example.com',
          name: null,
          role: AdminRole.DESIGNER,
        }),
      /SUPER_ADMIN authorization required/,
    );
  } finally {
    setPrismaForTests(realPrisma);
  }
  const rbac = new RbacService();
  await assert.rejects(
    () =>
      rbac.clearOverride('admin', 'not-real', {
        id: 'super',
        email: 'super@example.com',
        name: null,
        role: AdminRole.SUPER_ADMIN,
      }),
    /Unknown permission/,
  );
  await assert.rejects(
    () =>
      rbac.clearOverride('admin', 'roles.manage', {
        id: 'super',
        email: 'super@example.com',
        name: null,
        role: AdminRole.SUPER_ADMIN,
      }),
    /Reserved permissions/,
  );
  console.log('dynamic RBAC evaluator tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
