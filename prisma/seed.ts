import { PrismaClient, AdminRole } from '@prisma/client';
import { normalizeTheme, themes } from '../packages/themes/src/index';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
async function main() {
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
