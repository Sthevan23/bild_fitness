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
    const entries = await prisma.financeEntry.findMany({
      where: accountFinanceWhere(companyId, account.id, account.code),
    });
    const entradas = entries
      .filter((e) => e.type === 'ENTRADA' && e.status !== 'CANCELADO')
      .reduce((a, e) => a + toNum(e.amount), 0);
    const saidas = entries
      .filter((e) => e.type === 'SAIDA' && e.status !== 'CANCELADO')
      .reduce((a, e) => a + toNum(e.amount), 0);
    return {
      accountCode: account.code,
      entradas,
      saidas,
      lucro: entradas - saidas,
      aPagar: entries
        .filter((e) => e.type === 'SAIDA' && e.status === 'PENDENTE')
        .reduce((a, e) => a + toNum(e.amount), 0),
      aReceber: entries
        .filter((e) => e.type === 'ENTRADA' && e.status === 'PENDENTE')
        .reduce((a, e) => a + toNum(e.amount), 0),
      entries,
    };
  }
}
