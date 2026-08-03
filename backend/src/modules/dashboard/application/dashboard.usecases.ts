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

    const [ordersToday, ordersMonth, accountStocks, pending, shipped, cancelled, recent, movements] =
      await Promise.all([
        prisma.order.findMany({
          where: { ...orderScope, orderedAt: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELADO' } },
          include: { items: true },
        }),
        prisma.order.findMany({
          where: { ...orderScope, orderedAt: { gte: monthStart }, status: { not: 'CANCELADO' } },
          include: { items: true },
        }),
        prisma.accountStock.findMany({ where: { accountId }, include: { product: true } }),
        prisma.order.count({ where: { ...orderScope, status: 'AGUARDANDO' } }),
        prisma.order.count({ where: { ...orderScope, status: 'ENVIADO' } }),
        prisma.order.count({ where: { ...orderScope, status: 'CANCELADO' } }),
        prisma.order.findMany({
          where: orderScope,
          orderBy: { orderedAt: 'desc' },
          take: 8,
          include: { customer: true, items: true },
        }),
        prisma.order.findMany({
          where: { ...orderScope, orderedAt: { gte: last30 }, status: { not: 'CANCELADO' } },
          include: { items: { include: { product: true } } },
        }),
      ]);

    let lucro = 0;
    for (const o of ordersMonth) {
      for (const i of o.items) {
        const row = accountStocks.find((x) => x.productId === i.productId);
        const p = row?.product;
        lucro += toNum(i.totalPrice) - toNum(i.quantity) * toNum(p?.avgCost || p?.costPrice);
      }
    }

    const byDayMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) byDayMap.set(format(subDays(now, 29 - i), 'dd/MM'), 0);
    for (const o of movements) {
      const d = format(o.orderedAt, 'dd/MM');
      byDayMap.set(d, (byDayMap.get(d) ?? 0) + toNum(o.total));
    }

    const productSales = new Map<string, { name: string; qty: number }>();
    for (const o of movements) {
      for (const i of o.items) {
        const cur = productSales.get(i.productId) ?? { name: i.product.name, qty: 0 };
        cur.qty += toNum(i.quantity);
        productSales.set(i.productId, cur);
      }
    }

    return {
      account: { code: account.code, name: account.name, cnpj: account.cnpj },
      cards: {
        soldToday: ordersToday.reduce((a, o) => a + toNum(o.total), 0),
        soldMonth: ordersMonth.reduce((a, o) => a + toNum(o.total), 0),
        lucro,
        unitsSold: ordersMonth.reduce((a, o) => a + o.items.reduce((b, i) => b + toNum(i.quantity), 0), 0),
        stockUnits: accountStocks.reduce((a, r) => a + toNum(r.stock), 0),
        pending,
        shipped,
        cancelled,
        productCount: accountStocks.length,
        ordersToday: ordersToday.length,
        lowStock: accountStocks.filter((r) => toNum(r.stock) > 0 && toNum(r.stock) <= toNum(r.minStock)).length,
      },
      salesByDay: [...byDayMap.entries()].map(([date, total]) => ({ date, total })),
      topProducts: [...productSales.values()].sort((a, b) => b.qty - a.qty).slice(0, 6),
      stockChart: [
        { name: 'OK', value: accountStocks.filter((r) => toNum(r.stock) > toNum(r.minStock)).length },
        {
          name: 'Baixo',
          value: accountStocks.filter((r) => toNum(r.stock) > 0 && toNum(r.stock) <= toNum(r.minStock)).length,
        },
        { name: 'Zerado', value: accountStocks.filter((r) => toNum(r.stock) <= 0).length },
      ],
      recentOrders: recent,
    };
  }
}
