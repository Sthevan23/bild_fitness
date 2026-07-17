import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const companyId = '00000000-0000-0000-0000-000000000001';

async function main() {
  const legacy = await prisma.salesAccount.findFirst({ where: { companyId, code: 'PEP' } });
  const pp = await prisma.salesAccount.findFirst({ where: { companyId, code: 'P&P' } });
  if (legacy && !pp) {
    await prisma.salesAccount.update({
      where: { id: legacy.id },
      data: { code: 'P&P', name: 'P&P', active: true },
    });
    console.log('migrated PEP -> P&P');
  } else if (legacy && pp) {
    await prisma.salesAccount.delete({ where: { id: legacy.id } });
    console.log('deleted PEP, P&P exists');
  }
  console.log(
    await prisma.salesAccount.findMany({
      where: { companyId },
      select: { code: true, active: true },
    }),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
