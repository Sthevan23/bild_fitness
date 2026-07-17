import { prisma } from '../../../shared/prisma.js';
import { resolveActiveAccount } from '../../accounts/infrastructure/accounts.repo.js';
import { subDays, startOfDay, endOfDay } from 'date-fns';

function toNum(v: unknown) {
  return Number(v) || 0;
}

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
    case 'all':
      return undefined;
    default:
      return { gte: startOfDay(subDays(now, 29)), lte: endOfDay(now) };
  }
}

export type SalesFilters = {
  period?: string;
  from?: string;
  to?: string;
  search?: string;
};

export class ListSalesUseCase {
  async execute(companyId: string, activeCode: string | undefined, filters: SalesFilters) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const range = periodRange(filters.period, filters.from, filters.to);

    const orders = await prisma.order.findMany({
      where: {
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
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { orderedAt: 'desc' },
    });

    const rows = orders.flatMap((order) =>
      order.items.map((item) => ({
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
        marginPercent: toNum(item.marginPercent),
        status: order.status,
      })),
    );

    const totals = rows.reduce(
      (acc, r) => {
        acc.grossRevenue += r.grossRevenue;
        acc.netRevenue += r.netRevenue;
        acc.productCost += r.productCost;
        acc.grossProfit += r.grossProfit;
        acc.units += r.quantity;
        return acc;
      },
      { grossRevenue: 0, netRevenue: 0, productCost: 0, grossProfit: 0, units: 0 },
    );

    const marginPercent = totals.grossRevenue > 0 ? (totals.grossProfit / totals.grossRevenue) * 100 : 0;

    return {
      account: account.code,
      rows,
      totals: { ...totals, marginPercent, count: rows.length },
    };
  }
}
