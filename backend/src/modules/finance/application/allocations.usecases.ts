import { prisma } from '../../../shared/prisma.js';
import { resolveActiveAccount } from '../../accounts/infrastructure/accounts.repo.js';
import type { AccountCode } from '@pep/shared';

function toNum(v: unknown) {
  return Number(v) || 0;
}

function accountAmount(
  code: AccountCode,
  row: { allocatedPcp: unknown; allocatedRc: unknown; allocatedPp: unknown },
) {
  if (code === 'PCP') return toNum(row.allocatedPcp);
  if (code === 'RC') return toNum(row.allocatedRc);
  return toNum(row.allocatedPp);
}

export class ListCostAllocationsUseCase {
  async execute(companyId: string, activeCode?: string, month?: string) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const rows = await prisma.costAllocation.findMany({
      where: {
        companyId,
        ...(month ? { monthLabel: month.toUpperCase() } : {}),
      },
      orderBy: [{ monthLabel: 'asc' }, { category: 'asc' }, { description: 'asc' }],
    });

    const months = [...new Set(rows.map((r) => r.monthLabel))];
    const enriched = rows.map((r) => ({
      ...r,
      amount: toNum(r.amount),
      ratePcp: toNum(r.ratePcp),
      rateRc: toNum(r.rateRc),
      ratePp: toNum(r.ratePp),
      allocatedPcp: toNum(r.allocatedPcp),
      allocatedRc: toNum(r.allocatedRc),
      allocatedPp: toNum(r.allocatedPp),
      accountAmount: accountAmount(account.code as AccountCode, r),
    }));

    const totals = enriched.reduce(
      (acc, r) => {
        acc.total += r.accountAmount;
        if (r.category.includes('FIXO')) acc.fixos += r.accountAmount;
        else acc.variaveis += r.accountAmount;
        return acc;
      },
      { total: 0, fixos: 0, variaveis: 0 },
    );

    return { account: account.code, months, rows: enriched, totals };
  }
}
