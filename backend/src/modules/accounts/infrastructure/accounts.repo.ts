import { ACCOUNT_CODES, normalizeAccountCode, type AccountCode } from '@pep/shared';
import { prisma } from '../../../shared/prisma.js';

export async function ensureSalesAccountRows(companyId: string) {
  // Migra legado PEP → P&P
  const legacy = await prisma.salesAccount.findFirst({
    where: { companyId, code: 'PEP' },
  });
  if (legacy) {
    const existingPp = await prisma.salesAccount.findFirst({
      where: { companyId, code: 'P&P' },
    });
    if (!existingPp) {
      await prisma.salesAccount.update({
        where: { id: legacy.id },
        data: { code: 'P&P', name: 'P&P' },
      });
    } else {
      await prisma.salesAccount.delete({ where: { id: legacy.id } });
    }
  }

  const accounts = [];
  for (const code of ACCOUNT_CODES) {
    const account = await prisma.salesAccount.upsert({
      where: { companyId_code: { companyId, code } },
      create: { companyId, code, name: code },
      update: { active: true, name: code },
    });
    accounts.push(account);
  }
  return accounts;
}

export async function ensureSalesAccounts(companyId: string) {
  const accounts = await ensureSalesAccountRows(companyId);
  const products = await prisma.product.findMany({
    where: { companyId },
    select: { id: true, stock: true, minStock: true },
  });
  if (!products.length) return accounts;

  // createMany em lote em vez de upsert sequencial (evita tempestade de queries)
  await prisma.accountStock.createMany({
    data: products.flatMap((product) =>
      accounts.map((account) => ({
        accountId: account.id,
        productId: product.id,
        stock: 0,
        minStock: product.minStock,
      })),
    ),
    skipDuplicates: true,
  });
  return accounts;
}

export async function syncProductTotalStock(productId: string) {
  const rows = await prisma.accountStock.findMany({
    where: { productId },
    select: { stock: true },
  });
  const total = rows.reduce((a: number, r: { stock: unknown }) => a + Number(r.stock), 0);
  await prisma.product.update({ where: { id: productId }, data: { stock: total } });
}

export async function resolveActiveAccount(companyId: string, code?: string | null) {
  const accounts = await ensureSalesAccountRows(companyId);
  const normalized = normalizeAccountCode(code);
  const account = accounts.find((a) => a.code === normalized) ?? accounts[0];
  if (!account) throw new Error('Nenhuma conta configurada');
  return { ...account, code: account.code as AccountCode };
}
