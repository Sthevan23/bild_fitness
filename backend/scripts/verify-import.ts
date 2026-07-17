import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const taxes = await prisma.accountTaxRate.findMany({ include: { account: true } });
  console.log(
    'taxes',
    taxes.map((x) => ({ code: x.account.code, rate: Number(x.ratePercent) })),
  );
  console.log({
    orders: await prisma.order.count(),
    products: await prisma.product.count(),
    kits: await prisma.productKitComponent.count(),
    mlRaw: await prisma.mlSaleRaw.count(),
    accounts: await prisma.salesAccount.findMany({ select: { code: true, active: true } }),
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
