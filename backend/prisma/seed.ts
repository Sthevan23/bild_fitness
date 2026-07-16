import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

  for (const code of ['PEP', 'RC', 'PCP']) {
    await prisma.salesAccount.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      create: { companyId: company.id, code, name: code.toLowerCase() },
      update: { active: true },
    });
  }

  console.log('Seed OK — admin@bildfitness.local / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
