import { PrismaClient } from '@prisma/client';
import { themes } from '../packages/themes/src/index';

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
  console.log(`Seeded ${themes.length} themes.`);
}

main().finally(() => prisma.$disconnect());
