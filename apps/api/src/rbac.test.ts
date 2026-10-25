import 'reflect-metadata';
import assert from 'node:assert/strict';
import { AdminRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RbacService, RoleDto, UpdateRoleDto } from './rbac.module';
import { prisma, setPrismaForTests } from './admin-auth';

const actor = {
  id: 'super-1',
  email: 'super@example.com',
  name: null,
  role: AdminRole.SUPER_ADMIN,
};
const role = {
  id: 'role-reviewer',
  key: 'REVIEWER',
  name: 'Reviewer',
  description: 'Initial',
  system: false,
};
const systemRole = {
  id: 'role-moderator',
  key: 'MODERATOR',
  name: 'Moderator',
  description: null,
  system: true,
};

async function main() {
  const realPrisma = prisma;
  const permissions = new Set(['dashboard.read']);
  const audits: unknown[] = [];
  const roles = new Map([
    ['REVIEWER', { ...role }],
    ['MODERATOR', { ...systemRole }],
  ]);
  const assignments = new Set<string>();
  const db: any = {
    $transaction: async (callback: (database: any) => Promise<unknown>) => callback(db),
    adminRoleDefinition: {
      findUnique: async ({ where }: any) =>
        roles.get(where.key) ?? [...roles.values()].find((item) => item.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const found = [...roles.values()].find((item) => item.id === where.id)!;
        Object.assign(found, data);
        return found;
      },
      delete: async ({ where }: any) => {
        const found = [...roles.entries()].find(([, item]) => item.id === where.id)!;
        roles.delete(found[0]);
        return found[1];
      },
      create: async ({ data }: any) => {
        const created = {
          id: 'created',
          key: data.key,
          name: data.name,
          description: data.description,
          system: false,
        };
        roles.set(created.key, created);
        return { ...created, permissions: data.permissions.create };
      },
    },
    adminRolePermission: {
      deleteMany: async () => permissions.clear(),
      createMany: async ({ data }: any) =>
        data.forEach(({ permissionKey }: any) => permissions.add(permissionKey)),
    },
    adminRoleAssignment: {
      upsert: async ({ where, create }: any) => {
        assignments.add(`${where.adminId_roleId.adminId}:${where.adminId_roleId.roleId}`);
        return create;
      },
      deleteMany: async () => undefined,
    },
    adminUser: { findUnique: async () => ({ id: 'target' }) },
    auditLog: {
      create: async ({ data }: any) => {
        audits.push(data);
      },
    },
  };
  // The final role read is modeled with the current in-memory role and permissions.
  db.adminRoleDefinition.findUnique = async ({ where, ...args }: any) => {
    const found =
      roles.get(where.key) ?? [...roles.values()].find((item) => item.id === where.id) ?? null;
    if (!found) return null;
    return args.select
      ? found
      : { ...found, permissions: [...permissions].map((permissionKey) => ({ permissionKey })) };
  };
  setPrismaForTests(db);
  try {
    const service = new RbacService();
    const updated = await service.updateRole(
      'reviewer',
      {
        name: 'Content Reviewer',
        description: 'Reviews content',
        permissions: ['confessions.read'],
      },
      actor,
    );
    assert.equal((updated as any).name, 'Content Reviewer');
    assert.equal((updated as any).description, 'Reviews content');
    assert.deepEqual((updated as any).permissions, [{ permissionKey: 'confessions.read' }]);
    assert.equal((audits.at(-1) as any).action, 'RBAC_ROLE_UPDATED');
    assert.equal((roles.get('REVIEWER') as any).key, 'REVIEWER');

    await assert.rejects(
      () =>
        service.createRole(
          { key: 'super_admin', name: 'Spoof', permissions: [] } as RoleDto,
          actor,
        ),
      /SUPER_ADMIN role is reserved/,
    );
    await assert.rejects(
      () => service.updateRole('SUPER_ADMIN', { name: 'Spoof' }, actor),
      /SUPER_ADMIN role is reserved/,
    );
    await assert.rejects(
      () => service.deleteRole('super_admin', actor),
      /SUPER_ADMIN role is reserved/,
    );
    await assert.rejects(
      () => service.assignRole('target', { roleKey: 'super_admin' }, actor),
      /SUPER_ADMIN role is reserved/,
    );
    await assert.rejects(
      () => service.removeRole('target', 'SUPER_ADMIN', actor),
      /SUPER_ADMIN role is reserved/,
    );
    await assert.rejects(
      () => service.updateRole('MODERATOR', { name: 'Changed' }, actor),
      /System roles cannot be changed/,
    );

    await service.assignRole('target', { roleKey: 'moderator' }, actor);
    assert.ok(assignments.has('target:role-moderator'));
    await service.removeRole('target', 'moderator', actor);
    assert.equal((audits.at(-1) as any).metadata.roleKey, 'MODERATOR');

    const invalid = plainToInstance(UpdateRoleDto, {
      name: '',
      description: 123,
      permissions: ['dashboard.read', 4],
    });
    assert.ok(
      (await validate(invalid, { whitelist: true, forbidNonWhitelisted: true })).length > 0,
    );
    const invalidCreate = plainToInstance(RoleDto, {
      key: 'X',
      name: '',
      permissions: 'not-array',
    });
    assert.ok(
      (await validate(invalidCreate, { whitelist: true, forbidNonWhitelisted: true })).length > 0,
    );
    console.log('dynamic RBAC mutation tests passed');
  } finally {
    setPrismaForTests(realPrisma);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
