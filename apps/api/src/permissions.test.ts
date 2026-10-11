import 'reflect-metadata';
import assert from 'node:assert/strict';
import { AdminRole, PermissionEffect } from '@prisma/client';
import { AdminController } from './admin.module';
import { hasPermission } from './permissions';

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
  console.log('dynamic RBAC evaluator tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
