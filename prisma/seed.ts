import { PrismaClient, AdminRole } from '@prisma/client';
import { themes } from '../packages/themes/src/index';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
async function main() {
  await prisma.theme.createMany({
    data: themes.map((theme) => ({
      slug: theme.id,
      name: theme.name,
      background: theme.background,
      gradient: theme.gradient,
      textColor: theme.textColor,
      accentColor: theme.accentColor,
      fontFamily: theme.fontFamily,
    })),
    skipDuplicates: true,
  });
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (email && password) {
    await prisma.adminUser.upsert({
      where: { email: email.toLowerCase() },
      update: { passwordHash: await bcrypt.hash(password, 12) },
      create: {
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        role: AdminRole.SUPER_ADMIN,
        name: 'Development Admin',
      },
    });
    console.log(`Seeded admin ${email}.`);
  }
  console.log(`Seeded ${themes.length} themes.`);
}
main().finally(() => prisma.$disconnect());
