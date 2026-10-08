import 'reflect-metadata';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { CreateAdminUserDto, UpdateAdminStatusDto } from './admin.dto';
import { AdminIdentity, setPrismaForTests, prisma } from './admin-auth';

const realPrisma = prisma;
const actor: AdminIdentity = {
  id: 'super-1',
  email: 'super@example.com',
  name: 'Super',
  role: AdminRole.SUPER_ADMIN,
};
const base = {
  id: 'new-1',
  email: 'moderator@example.com',
  name: 'Moderator',
  role: AdminRole.MODERATOR,
  isActive: true,
  bannedAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function run() {
  const audits: any[] = [];
  const activityWheres: any[] = [];
  let revoked = 0;
  const database = {
    confession: { count: async () => 0 },
    report: { count: async () => 0 },
    theme: { count: async () => 0 },
    adminUser: {
      findUnique: async ({ where }: any) => (where.id === 'new-1' ? base : null),
      findFirst: async () => null,
      create: async ({ data }: any) => ({
        ...base,
        email: data.email,
        name: data.name,
        role: data.role,
      }),
      update: async ({ data }: any) => ({ ...base, ...data }),
    },
    adminSession: {
      updateMany: async () => {
        revoked += 1;
        return { count: 2 };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        audits.push(data);
        return data;
      },
      findMany: async ({ where }: any) => {
        activityWheres.push(where);
        return [];
      },
    },
  } as any;
  try {
    setPrismaForTests(database);
    const service = new AdminService();
    const created = await service.createAdministrator(
      {
        email: '  MODERATOR@example.com ',
        name: 'New Moderator',
        role: AdminRole.MODERATOR,
        password: 'a-secure-password',
      },
      actor,
    );
    assert.equal(created.email, 'moderator@example.com');
    assert.equal((created as any).passwordHash, undefined);
    assert.equal(audits.at(-1).action, 'ADMIN_USER_CREATED');
    assert.ok(
      (
        await validate(
          plainToInstance(CreateAdminUserDto, {
            email: 'bad',
            role: AdminRole.MODERATOR,
            password: 'short',
          }),
        )
      ).length > 0,
    );
    await assert.rejects(
      () =>
        service.createAdministrator(
          { email: 'x@example.com', role: AdminRole.SUPER_ADMIN, password: 'a-secure-password' },
          actor,
        ),
      /MODERATOR or DESIGNER/,
    );
    const result = await service.changeAdministratorStatus(
      'new-1',
      plainToInstance(UpdateAdminStatusDto, { status: 'BANNED' }),
      actor,
    );
    assert.equal(result.status, 'BANNED');
    assert.equal(revoked, 1);
    assert.equal(audits.at(-1).action, 'ADMIN_BANNED');
    await service.dashboardExtended(actor);
    await service.dashboardExtended({ ...actor, role: AdminRole.MODERATOR });
    await service.dashboardExtended({ ...actor, id: 'designer-1', role: AdminRole.DESIGNER });
    assert.equal(activityWheres[0].actorId, undefined);
    assert.equal(activityWheres[1].actorId, actor.id);
    assert.equal(activityWheres[2].actorId, 'designer-1');
    console.log('administrator management tests passed');
  } finally {
    setPrismaForTests(realPrisma);
  }
}
void run();
