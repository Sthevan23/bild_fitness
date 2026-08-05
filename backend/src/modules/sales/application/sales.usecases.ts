import { prisma } from '../../../shared/prisma.js';
import { resolveActiveAccount } from '../../accounts/infrastructure/accounts.repo.js';
import { subDays, startOfDay, endOfDay } from 'date-fns';

function toNum(v: unknown) {
  return Number(v) || 0;
}

/** Limite de linhas na tela — histórico completo fica no banco; UI não carrega tudo. */
const LIST_LIMIT = 400;

function periodRange(period?: string, from?: string, to?: string) {
  if (from || to) {
    return {
      gte: from ? startOfDay(new Date(from)) : undefined,
      lte: to ? endOfDay(new Date(to)) : undefined,
    };
  }
  const now = new Date();
  switch (period) {
    case 'hoje':
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case '7':
      return { gte: startOfDay(subDays(now, 6)), lte: endOfDay(now) };
    case '15':
      return { gte: startOfDay(subDays(now, 14)), lte: endOfDay(now) };
    case '30':
      return { gte: startOfDay(subDays(now, 29)), lte: endOfDay(now) };
    case '90':
      return { gte: startOfDay(subDays(now, 89)), lte: endOfDay(now) };
    case '365':
      return { gte: startOfDay(subDays(now, 364)), lte: endOfDay(now) };
    case '730':
    case '2y':
      return { gte: startOfDay(subDays(now, 729)), lte: endOfDay(now) };
    case 'all':
      return undefined;
    default:
      return { gte: startOfDay(subDays(now, 729)), lte: endOfDay(now) };
  }
}

export type SalesFilters = {
  period?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
};

export class ListSalesUseCase {
  async execute(companyId: string, activeCode: string | undefined, filters: SalesFilters) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const range = periodRange(filters.period, filters.from, filters.to);
    const take = Math.min(Math.max(Number(filters.limit) || LIST_LIMIT, 1), 800);

    const where = {
      companyId,
      accountId: account.id,
      ...(range ? { orderedAt: range } : {}),
      ...(filters.search
        ? {
            OR: [
              { number: { contains: filters.search } },
              { notes: { contains: filters.search } },
              { customer: { name: { contains: filters.search } } },
              { items: { some: { product: { sku: { contains: filters.search } } } } },
            ],
          }
        : {}),
    };

    const [orders, tax, aggregate] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderedAt: true,
          netAmount: true,
          total: true,
          status: true,
          notes: true,
          customer: { select: { name: true } },
          items: {
            select: {
              id: true,
              quantity: true,
              totalPrice: true,
              productCost: true,
              taxAmount: true,
              grossProfit: true,
              marginPercent: true,
              product: { select: { sku: true, name: true } },
            },
          },
        },
        orderBy: { orderedAt: 'desc' },
        take,
      }),
      prisma.accountTaxRate.findUnique({
        where: { accountId_channel: { accountId: account.id, channel: 'ML' } },
      }),
      // Totais do período completo (não só das linhas limitadas da tela)
      prisma.order.aggregate({
        where: { ...where, status: { not: 'CANCELADO' } },
        _sum: { total: true, netAmount: true },
        _count: true,
      }),
    ]);

    const ratePercent = tax ? toNum(tax.ratePercent) : 0;
    const targetMarginPercent = tax ? toNum(tax.targetMarginPercent) : 15;

    const rows = orders.flatMap((order) =>
      order.items.map((item) => {
        const marginPercent = toNum(item.marginPercent);
        return {
          id: item.id,
          orderId: order.id,
          date: order.orderedAt,
          account: account.code,
          quantity: toNum(item.quantity),
          sku: item.product.sku,
          description: item.product.name || order.notes || '',
          customer: order.customer?.name || null,
          netRevenue: toNum(order.netAmount),
          grossRevenue: toNum(item.totalPrice) || toNum(order.total),
          productCost: toNum(item.productCost),
          taxAmount: toNum(item.taxAmount),
          grossProfit: toNum(item.grossProfit),
          marginPercent,
          belowTarget: marginPercent < targetMarginPercent,
          status: order.status,
        };
      }),
    );

    const listTotals = rows.reduce(
      (acc, r) => {
        acc.grossRevenue += r.grossRevenue;
        acc.netRevenue += r.netRevenue;
        acc.productCost += r.productCost;
        acc.grossProfit += r.grossProfit;
        acc.units += r.quantity;
        if (r.belowTarget) acc.belowTarget += 1;
        return acc;
      },
      { grossRevenue: 0, netRevenue: 0, productCost: 0, grossProfit: 0, units: 0, belowTarget: 0 },
    );

    const periodGross = toNum(aggregate._sum.total);
    const periodNet = toNum(aggregate._sum.netAmount);
    const marginPercent =
      listTotals.grossRevenue > 0 ? (listTotals.grossProfit / listTotals.grossRevenue) * 100 : 0;

    return {
      account: account.code,
      settings: { ratePercent, targetMarginPercent },
      rows,
      truncated: orders.length >= take,
      limit: take,
      totals: {
        ...listTotals,
        // Preferência: totais do período no banco quando disponíveis
        grossRevenue: periodGross || listTotals.grossRevenue,
        netRevenue: periodNet || listTotals.netRevenue,
        marginPercent,
        count: aggregate._count || rows.length,
        listed: rows.length,
        belowTarget: listTotals.belowTarget,
      },
    };
  }
}
