import { prisma } from '../../../shared/prisma.js';
import { resolveActiveAccount } from '../../accounts/infrastructure/accounts.repo.js';
import { startOfDay, endOfDay, startOfMonth, subDays, format } from 'date-fns';

function toNum(v: unknown) {
  return Number(v) || 0;
}

export class GetDashboardUseCase {
  async execute(companyId: string, activeCode?: string) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const accountId = account.id;
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const last30 = subDays(now, 29);
    const orderScope = { companyId, accountId };

    const [
      todayAgg,
      monthAgg,
      monthUnits,
      monthProfit,
      accountStocks,
      pending,
      shipped,
      cancelled,
      recent,
      last30Orders,
      topItems,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          ...orderScope,
          orderedAt: { gte: todayStart, lte: todayEnd },
          status: { not: 'CANCELADO' },
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { ...orderScope, orderedAt: { gte: monthStart }, status: { not: 'CANCELADO' } },
        _sum: { total: true },
      }),
      prisma.orderItem.aggregate({
        where: {
          order: { ...orderScope, orderedAt: { gte: monthStart }, status: { not: 'CANCELADO' } },
        },
        _sum: { quantity: true },
      }),
      prisma.orderItem.aggregate({
        where: {
          order: { ...orderScope, orderedAt: { gte: monthStart }, status: { not: 'CANCELADO' } },
        },
        _sum: { grossProfit: true },
      }),
      prisma.accountStock.findMany({
        where: { accountId },
        select: { stock: true, minStock: true, productId: true },
      }),
      prisma.order.count({ where: { ...orderScope, status: 'AGUARDANDO' } }),
      prisma.order.count({ where: { ...orderScope, status: 'ENVIADO' } }),
      prisma.order.count({ where: { ...orderScope, status: 'CANCELADO' } }),
      prisma.order.findMany({
        where: orderScope,
        orderBy: { orderedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          orderedAt: true,
          customer: { select: { name: true } },
        },
      }),
      // Chart 30d: só total + data (sem items)
      prisma.order.findMany({
        where: { ...orderScope, orderedAt: { gte: last30 }, status: { not: 'CANCELADO' } },
        select: { orderedAt: true, total: true },
        orderBy: { orderedAt: 'asc' },
        take: 2000,
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { ...orderScope, orderedAt: { gte: last30 }, status: { not: 'CANCELADO' } },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 6,
      }),
    ]);

    const byDayMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) byDayMap.set(format(subDays(now, 29 - i), 'dd/MM'), 0);
    for (const o of last30Orders) {
      const d = format(o.orderedAt, 'dd/MM');
      byDayMap.set(d, (byDayMap.get(d) ?? 0) + toNum(o.total));
    }

    const productIds = topItems.map((t) => t.productId);
    const products = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    return {
      account: { code: account.code, name: account.name, cnpj: account.cnpj },
      cards: {
        soldToday: toNum(todayAgg._sum.total),
        soldMonth: toNum(monthAgg._sum.total),
        lucro: toNum(monthProfit._sum.grossProfit),
        unitsSold: toNum(monthUnits._sum.quantity),
        stockUnits: accountStocks.reduce((a, r) => a + toNum(r.stock), 0),
        pending,
        shipped,
        cancelled,
        productCount: accountStocks.length,
        ordersToday: todayAgg._count,
        lowStock: accountStocks.filter((r) => toNum(r.stock) > 0 && toNum(r.stock) <= toNum(r.minStock))
          .length,
      },
      salesByDay: [...byDayMap.entries()].map(([date, total]) => ({ date, total })),
      topProducts: topItems.map((t) => ({
        name: nameById.get(t.productId) || t.productId,
        qty: toNum(t._sum.quantity),
      })),
      stockChart: [
        { name: 'OK', value: accountStocks.filter((r) => toNum(r.stock) > toNum(r.minStock)).length },
        {
          name: 'Baixo',
          value: accountStocks.filter((r) => toNum(r.stock) > 0 && toNum(r.stock) <= toNum(r.minStock))
            .length,
        },
        { name: 'Zerado', value: accountStocks.filter((r) => toNum(r.stock) <= 0).length },
      ],
      recentOrders: recent,
    };
  }
}
