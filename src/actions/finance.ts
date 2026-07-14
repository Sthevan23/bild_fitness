'use server';

import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/session';
import { toNum } from '@/lib/utils';
import { financeSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import type { FinanceStatus, FinanceType } from '@prisma/client';

export async function listFinance(filters?: { type?: FinanceType | 'ALL'; from?: string; to?: string }) {
  const session = await requireModule('financeiro');
  return prisma.financeEntry.findMany({
    where: {
      companyId: session.user.companyId,
      ...(filters?.type && filters.type !== 'ALL' ? { type: filters.type } : {}),
      ...(filters?.from && filters?.to
        ? { createdAt: { gte: new Date(filters.from), lte: new Date(filters.to) } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createFinanceEntry(data: {
  type: FinanceType;
  description: string;
  amount: number;
  status?: FinanceStatus;
  category?: string;
  dueDate?: string;
}) {
  const session = await requireModule('financeiro');
  const parsed = financeSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const status =
    parsed.data.status ?? (parsed.data.type === 'ENTRADA' ? 'RECEBIDO' : 'PENDENTE');
  await prisma.financeEntry.create({
    data: {
      companyId: session.user.companyId,
      type: parsed.data.type,
      description: parsed.data.description,
      amount: parsed.data.amount,
      status,
      category: parsed.data.category,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      paidAt: status === 'PAGO' || status === 'RECEBIDO' ? new Date() : null,
    },
  });
  revalidatePath('/financeiro');
  return { ok: true };
}

export async function getFinanceSummary() {
  const session = await requireModule('financeiro');
  const entries = await prisma.financeEntry.findMany({
    where: { companyId: session.user.companyId },
  });
  const entradas = entries
    .filter((e) => e.type === 'ENTRADA' && e.status !== 'CANCELADO')
    .reduce((a, e) => a + toNum(e.amount), 0);
  const saidas = entries
    .filter((e) => e.type === 'SAIDA' && e.status !== 'CANCELADO')
    .reduce((a, e) => a + toNum(e.amount), 0);
  const aPagar = entries
    .filter((e) => e.type === 'SAIDA' && e.status === 'PENDENTE')
    .reduce((a, e) => a + toNum(e.amount), 0);
  const aReceber = entries
    .filter((e) => e.type === 'ENTRADA' && e.status === 'PENDENTE')
    .reduce((a, e) => a + toNum(e.amount), 0);
  return { entradas, saidas, lucro: entradas - saidas, aPagar, aReceber, entries };
}
