import { PrismaClient, AdminRole } from '@prisma/client';
import { normalizeTheme, themes } from '../packages/themes/src/index';
import bcrypt from 'bcryptjs';
import { PERMISSION_CATALOG, PERMISSIONS } from '../apps/api/src/permissions';

const prisma = new PrismaClient();
async function main() {
  await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
  const moderator = await prisma.adminRoleDefinition.upsert({
    where: { key: 'MODERATOR' },
    update: {},
    create: {
      id: 'rbac-role-moderator',
      key: 'MODERATOR',
      name: 'Moderator',
      description: 'Legacy moderator capability set',
      system: true,
    },
  });
  const designer = await prisma.adminRoleDefinition.upsert({
    where: { key: 'DESIGNER' },
    update: {},
    create: {
      id: 'rbac-role-designer',
      key: 'DESIGNER',
      name: 'Designer',
      description: 'Legacy designer capability set',
      system: true,
    },
  });
  await prisma.adminRolePermission.createMany({
    data: [
      ...[
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
      ].map((permissionKey) => ({ roleId: moderator.id, permissionKey })),
      ...[
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.THEMES_READ,
        PERMISSIONS.THEMES_MANAGE,
        PERMISSIONS.PROFILE_MANAGE,
      ].map((permissionKey) => ({ roleId: designer.id, permissionKey })),
    ],
    skipDuplicates: true,
  });
  const legacyAdmins = await prisma.adminUser.findMany({
    where: { role: { in: [AdminRole.MODERATOR, AdminRole.DESIGNER] } },
    select: { id: true, role: true },
  });
  await prisma.adminRoleAssignment.createMany({
    data: legacyAdmins.map((admin) => ({
      adminId: admin.id,
      roleId: admin.role === AdminRole.MODERATOR ? moderator.id : designer.id,
    })),
    skipDuplicates: true,
  });
  await prisma.theme.createMany({
    data: themes.map((theme) => {
      const normalized = normalizeTheme({ ...theme, slug: theme.id });
      return {
        id: normalized.id,
        slug: normalized.slug,
        name: normalized.name,
        background: normalized.background,
        gradient: normalized.gradient,
        textColor: normalized.textColor,
        accentColor: normalized.accentColor,
        fontFamily: normalized.fontFamily,
        borderStyle: normalized.borderStyle,
        logoVisibility: normalized.logoVisibility,
        handleVisibility: normalized.handleVisibility,
        layoutVariant: normalized.layoutVariant,
        radius: normalized.radius,
      };
    }),
    skipDuplicates: true,
  });
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (email && password) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingAdmin = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });
    if (existingAdmin && process.env.NODE_ENV === 'production') {
      console.log('Production seed preserved the existing administrator.');
    } else {
      if (
        process.env.NODE_ENV === 'production' &&
        process.env.ADMIN_SEED_ALLOW_PRODUCTION !== 'true'
      ) {
        throw new Error(
          'Production administrator bootstrap requires ADMIN_SEED_ALLOW_PRODUCTION=true and only creates a missing administrator.',
        );
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.adminUser.upsert({
        where: { email: normalizedEmail },
        update: process.env.NODE_ENV === 'production' ? {} : { passwordHash },
        create: {
          email: normalizedEmail,
          passwordHash,
          role: AdminRole.SUPER_ADMIN,
          name: 'Development Admin',
        },
      });
      console.log(`Seeded admin ${normalizedEmail}.`);
    }
  }
  console.log(`Seeded ${themes.length} themes.`);
}
main().finally(() => prisma.$disconnect());
