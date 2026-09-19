import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.theme.createMany({
    data: [
      {
        slug: 'midnight',
        name: 'Midnight',
        background: '#070A12',
        gradient: 'linear-gradient(135deg,#070A12,#101C3B)',
        textColor: '#FFFFFF',
        accentColor: '#00B8FF',
        fontFamily: 'Inter',
      },
      {
        slug: 'ngl-classic',
        name: 'NGL Classic',
        background: '#FF2D75',
        gradient: 'linear-gradient(135deg,#FF2D75,#FF7A00)',
        textColor: '#FFFFFF',
        accentColor: '#FFD54A',
        fontFamily: 'Inter',
      },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded themes.');
}
main().finally(() => prisma.$disconnect());
