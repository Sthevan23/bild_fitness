import { ACCOUNT_CODES, type AccountCode } from '@pep/shared';
import { prisma } from '../../../shared/prisma.js';

export async function ensureSalesAccountRows(companyId: string) {
  const accounts = [];
  for (const code of ACCOUNT_CODES) {
    const account = await prisma.salesAccount.upsert({
      where: { companyId_code: { companyId, code } },
      create: { companyId, code, name: code.toLowerCase() },
      update: { active: true },
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
  for (const product of products) {
    for (const account of accounts) {
      await prisma.accountStock.upsert({
        where: { accountId_productId: { accountId: account.id, productId: product.id } },
        create: {
          accountId: account.id,
          productId: product.id,
          stock: product.stock,
          minStock: product.minStock,
        },
        update: {},
      });
    }
  }
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
  const normalized = ((code || 'PEP').toUpperCase() as AccountCode);
  const account = accounts.find((a) => a.code === normalized) ?? accounts[0];
  if (!account) throw new Error('Nenhuma conta configurada');
  return { ...account, code: account.code as AccountCode };
}
