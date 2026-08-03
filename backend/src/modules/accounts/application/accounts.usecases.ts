import {
  normalizeAccountCode,
  updateAccountSchema,
  setActiveAccountSchema,
  updateMarginSettingsSchema,
} from '@pep/shared';
import { prisma } from '../../../shared/prisma.js';
import { AppError } from '../../../shared/errors.js';
import {
  ensureSalesAccountRows,
  ensureSalesAccounts,
  resolveActiveAccount,
} from '../infrastructure/accounts.repo.js';
import { calcSaleEconomics } from '../../spreadsheet-import/application/planilha-parser.js';

function toNum(v: unknown) {
  return Number(v) || 0;
}

export class ListAccountsUseCase {
  async execute(companyId: string) {
    return ensureSalesAccountRows(companyId);
  }
}

export class GetAccountsHubUseCase {
  async execute(companyId: string, activeCode?: string | null) {
    const accounts = await ensureSalesAccounts(companyId);
    const code = normalizeAccountCode(activeCode);

    const taxRows = await prisma.accountTaxRate.findMany({
      where: { companyId, channel: 'ML' },
    });

    const stockCounts = await Promise.all(
      accounts.map(async (a) => {
        const rows = await prisma.accountStock.findMany({
          where: { accountId: a.id },
          select: { stock: true, minStock: true },
        });
        return {
          accountId: a.id,
          skus: rows.length,
          low: rows.filter((r) => Number(r.stock) > 0 && Number(r.stock) <= Number(r.minStock)).length,
          zerado: rows.filter((r) => Number(r.stock) <= 0).length,
        };
      }),
    );

    return {
      ok: true as const,
      activeCode: code,
      accounts: accounts.map((a) => {
        const stock = stockCounts.find((s) => s.accountId === a.id);
        const tax = taxRows.find((t) => t.accountId === a.id);
        return {
          id: a.id,
          code: a.code,
          name: a.name,
          cnpj: a.cnpj,
          active: a.active,
          isSelected: a.code === code,
          ratePercent: tax ? toNum(tax.ratePercent) : 0,
          targetMarginPercent: tax ? toNum(tax.targetMarginPercent) : 15,
          stock: stock ?? { skus: 0, low: 0, zerado: 0 },
        };
      }),
    };
  }
}

export class UpdateAccountUseCase {
  async execute(companyId: string, input: unknown) {
    const data = updateAccountSchema.parse(input);
    const accounts = await ensureSalesAccountRows(companyId);
    const account = accounts.find((a) => a.code === data.code);
    if (!account) throw new AppError('Conta não encontrada');
    await prisma.salesAccount.update({
      where: { id: account.id },
      data: {
        cnpj: data.cnpj?.trim() || null,
        name: data.name?.trim() || account.name,
      },
    });
    return { ok: true as const };
  }
}

export class SetActiveAccountUseCase {
  async execute(companyId: string, input: unknown) {
    const data = setActiveAccountSchema.parse(input);
    const account = await resolveActiveAccount(companyId, data.code);
    return { ok: true as const, code: account.code, accountId: account.id };
  }
}

export class GetActiveAccountUseCase {
  async execute(companyId: string, code?: string | null) {
    return resolveActiveAccount(companyId, code);
  }
}

export class GetMarginSettingsUseCase {
  async execute(companyId: string, activeCode?: string | null) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const tax = await prisma.accountTaxRate.findUnique({
      where: { accountId_channel: { accountId: account.id, channel: 'ML' } },
    });
    return {
      account: account.code,
      ratePercent: tax ? toNum(tax.ratePercent) : 0,
      targetMarginPercent: tax ? toNum(tax.targetMarginPercent) : 15,
    };
  }
}

export class UpdateMarginSettingsUseCase {
  async execute(companyId: string, activeCode: string | undefined, input: unknown) {
    const data = updateMarginSettingsSchema.parse(input);
    const account = await resolveActiveAccount(companyId, activeCode);

    await prisma.accountTaxRate.upsert({
      where: { accountId_channel: { accountId: account.id, channel: 'ML' } },
      create: {
        companyId,
        accountId: account.id,
        channel: 'ML',
        ratePercent: data.ratePercent,
        targetMarginPercent: data.targetMarginPercent,
      },
      update: {
        ratePercent: data.ratePercent,
        targetMarginPercent: data.targetMarginPercent,
      },
    });

    let recalculated = 0;
    if (data.recalculate !== false) {
      const orders = await prisma.order.findMany({
        where: { companyId, accountId: account.id },
        include: { items: { include: { product: true } } },
      });
      for (const order of orders) {
        for (const item of order.items) {
          const units = toNum(item.quantity);
          const revenue = toNum(item.totalPrice) || toNum(order.total);
          const net = toNum(order.netAmount) || revenue;
          const unitCost =
            units > 0 && toNum(item.productCost) > 0
              ? toNum(item.productCost) / units
              : toNum(item.product.costPrice);
          const economics = calcSaleEconomics({
            revenueProducts: revenue,
            netTotal: net,
            unitCost,
            units: units || 1,
            taxRatePercent: data.ratePercent,
          });
          await prisma.orderItem.update({
            where: { id: item.id },
            data: {
              productCost: economics.productCost,
              taxAmount: economics.taxAmount,
              grossProfit: economics.grossProfit,
              marginPercent: economics.marginPercent,
            },
          });
          recalculated += 1;
        }
      }
    }

    return {
      ok: true as const,
      account: account.code,
      ratePercent: data.ratePercent,
      targetMarginPercent: data.targetMarginPercent,
      recalculated,
    };
  }
}
