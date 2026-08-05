import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { upsertCatalogProducts } from '../src/modules/products/application/catalog.js';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Bild Fitness',
    },
    update: { name: 'Bild Fitness' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@bildfitness.local' },
    create: {
      companyId: company.id,
      name: 'Administrador',
      email: 'admin@bildfitness.local',
      password,
      role: 'ADMIN',
      active: true,
    },
    update: { password, active: true, role: 'ADMIN' },
  });

  // Migra PEP legado → P&P
  const legacy = await prisma.salesAccount.findFirst({
    where: { companyId: company.id, code: 'PEP' },
  });
  if (legacy) {
    const existing = await prisma.salesAccount.findFirst({
      where: { companyId: company.id, code: 'P&P' },
    });
    if (!existing) {
      await prisma.salesAccount.update({
        where: { id: legacy.id },
        data: { code: 'P&P', name: 'P&P', active: true },
      });
    } else {
      await prisma.salesAccount.delete({ where: { id: legacy.id } });
    }
  }

  for (const code of ['P&P', 'RC', 'PCP']) {
    await prisma.salesAccount.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      create: { companyId: company.id, code, name: code },
      update: { active: true, name: code },
    });
  }

  const catalogCount = await upsertCatalogProducts(prisma, company.id);
  console.log(`Seed OK — admin@bildfitness.local / admin123 · catálogo ${catalogCount} produtos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
