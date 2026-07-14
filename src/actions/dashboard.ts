'use server';

import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/session';
import { toNum } from '@/lib/utils';
import { startOfDay, endOfDay, startOfMonth, subDays, format } from 'date-fns';

export async function getDashboardData() {
  const session = await requireModule('dashboard');
  const companyId = session.user.companyId;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const last30 = subDays(now, 29);

  const [ordersToday, ordersMonth, products, pending, shipped, cancelled, recent, movements, mlConn] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          companyId,
          orderedAt: { gte: todayStart, lte: todayEnd },
          status: { not: 'CANCELADO' },
        },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: {
          companyId,
          orderedAt: { gte: monthStart },
          status: { not: 'CANCELADO' },
        },
        include: { items: true },
      }),
      prisma.product.findMany({ where: { companyId } }),
      prisma.order.count({ where: { companyId, status: 'AGUARDANDO' } }),
      prisma.order.count({ where: { companyId, status: 'ENVIADO' } }),
      prisma.order.count({ where: { companyId, status: 'CANCELADO' } }),
      prisma.order.findMany({
        where: { companyId },
        orderBy: { orderedAt: 'desc' },
        take: 8,
        include: { customer: true, items: true },
      }),
      prisma.order.findMany({
        where: {
          companyId,
          orderedAt: { gte: last30 },
          status: { not: 'CANCELADO' },
        },
        include: { items: { include: { product: true } } },
      }),
      prisma.marketplaceConnection.findUnique({
        where: {
          companyId_marketplace: { companyId, marketplace: 'MERCADO_LIVRE' },
        },
        select: { status: true, lastSyncAt: true, lastSyncError: true, nickname: true },
      }),
    ]);

  const lowStockCount = products.filter((p) => toNum(p.stock) <= toNum(p.minStock)).length;
  const soldToday = ordersToday.reduce((a, o) => a + toNum(o.total), 0);
  const soldMonth = ordersMonth.reduce((a, o) => a + toNum(o.total), 0);
  const costMonth = ordersMonth.reduce(
    (a, o) =>
      a +
      o.items.reduce(
        (b, i) => b + toNum(i.quantity) * toNum(i.productId ? 0 : 0),
        0,
      ),
    0,
  );
  // lucro aproximado: total - (qty * avgCost via items reload)
  let lucro = 0;
  for (const o of ordersMonth) {
    for (const i of o.items) {
      const p = products.find((x) => x.id === i.productId);
      lucro += toNum(i.totalPrice) - toNum(i.quantity) * toNum(p?.avgCost || p?.costPrice);
    }
  }

  const unitsSold = ordersMonth.reduce(
    (a, o) => a + o.items.reduce((b, i) => b + toNum(i.quantity), 0),
    0,
  );
  const stockUnits = products.reduce((a, p) => a + toNum(p.stock), 0);

  const byDayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(now, 29 - i), 'dd/MM');
    byDayMap.set(d, 0);
  }
  for (const o of movements) {
    const d = format(o.orderedAt, 'dd/MM');
    byDayMap.set(d, (byDayMap.get(d) ?? 0) + toNum(o.total));
  }

  const productSales = new Map<string, { name: string; qty: number }>();
  for (const o of movements) {
    for (const i of o.items) {
      const cur = productSales.get(i.productId) ?? {
        name: i.product.name,
        qty: 0,
      };
      cur.qty += toNum(i.quantity);
      productSales.set(i.productId, cur);
    }
  }

  const topProducts = [...productSales.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  const stockChart = [
    { name: 'OK', value: products.filter((p) => toNum(p.stock) > toNum(p.minStock)).length },
    {
      name: 'Baixo',
      value: products.filter(
        (p) => toNum(p.stock) > 0 && toNum(p.stock) <= toNum(p.minStock),
      ).length,
    },
    { name: 'Zerado', value: products.filter((p) => toNum(p.stock) <= 0).length },
  ];

  return {
    cards: {
      soldToday,
      soldMonth,
      lucro,
      unitsSold,
      stockUnits,
      pending,
      shipped,
      cancelled,
      productCount: products.length,
      ordersToday: ordersToday.length,
      lowStock: lowStockCount,
    },
    marketplace: {
      mlStatus: mlConn?.status ?? 'DISCONNECTED',
      mlNickname: mlConn?.nickname ?? null,
      lastSyncAt: mlConn?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: mlConn?.lastSyncError ?? null,
    },
    salesByDay: [...byDayMap.entries()].map(([date, total]) => ({ date, total })),
    topProducts,
    stockChart,
    recentOrders: recent,
  };
}
