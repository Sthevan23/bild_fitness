import { prisma } from '../../../shared/prisma.js';
import { resolveActiveAccount } from '../../accounts/infrastructure/accounts.repo.js';
import type { FinanceStatus, FinanceType } from '@prisma/client';

function accountFinanceWhere(companyId: string, accountId: string, accountCode: string) {
  return {
    companyId,
    OR: [
      { order: { accountId } },
      {
        orderId: null,
        OR: [{ category: { contains: accountCode } }, { description: { contains: accountCode } }],
      },
    ],
  };
}

function toNum(v: unknown) {
  return Number(v) || 0;
}

export class ListFinanceUseCase {
  async execute(companyId: string, activeCode?: string, type?: FinanceType | 'ALL') {
    const account = await resolveActiveAccount(companyId, activeCode);
    return prisma.financeEntry.findMany({
      where: {
        ...accountFinanceWhere(companyId, account.id, account.code),
        ...(type && type !== 'ALL' ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }
}

export class CreateFinanceUseCase {
  async execute(
    companyId: string,
    data: {
      type: FinanceType;
      description: string;
      amount: number;
      status?: FinanceStatus;
      category?: string;
      dueDate?: string;
    },
    activeCode?: string,
  ) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const status = data.status ?? (data.type === 'ENTRADA' ? 'RECEBIDO' : 'PENDENTE');
    const category = data.category?.trim() || `Conta ${account.code}`;
    const description = data.description.includes(account.code)
      ? data.description
      : `${data.description} · ${account.code}`;
    await prisma.financeEntry.create({
      data: {
        companyId,
        type: data.type,
        description,
        amount: data.amount,
        status,
        category,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        paidAt: status === 'PAGO' || status === 'RECEBIDO' ? new Date() : null,
      },
    });
    return { ok: true as const };
  }
}

export class FinanceSummaryUseCase {
  async execute(companyId: string, activeCode?: string) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const where = {
      ...accountFinanceWhere(companyId, account.id, account.code),
      status: { not: 'CANCELADO' as const },
    };
    const [entradasAgg, saidasAgg, aPagarAgg, aReceberAgg, recent] = await Promise.all([
      prisma.financeEntry.aggregate({
        where: { ...where, type: 'ENTRADA' },
        _sum: { amount: true },
      }),
      prisma.financeEntry.aggregate({
        where: { ...where, type: 'SAIDA' },
        _sum: { amount: true },
      }),
      prisma.financeEntry.aggregate({
        where: {
          ...accountFinanceWhere(companyId, account.id, account.code),
          type: 'SAIDA',
          status: 'PENDENTE',
        },
        _sum: { amount: true },
      }),
      prisma.financeEntry.aggregate({
        where: {
          ...accountFinanceWhere(companyId, account.id, account.code),
          type: 'ENTRADA',
          status: 'PENDENTE',
        },
        _sum: { amount: true },
      }),
      prisma.financeEntry.findMany({
        where: accountFinanceWhere(companyId, account.id, account.code),
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    const entradas = toNum(entradasAgg._sum.amount);
    const saidas = toNum(saidasAgg._sum.amount);
    return {
      accountCode: account.code,
      entradas,
      saidas,
      lucro: entradas - saidas,
      aPagar: toNum(aPagarAgg._sum.amount),
      aReceber: toNum(aReceberAgg._sum.amount),
      entries: recent,
    };
  }
}
