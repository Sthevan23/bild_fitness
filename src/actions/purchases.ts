'use server';

import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/session';
import { toNum } from '@/lib/utils';
import { endOfDay, startOfDay } from 'date-fns';

export async function getPurchaseList(from: string, to: string) {
  const session = await requireModule('compras');
  const companyId = session.user.companyId;
  const orders = await prisma.order.findMany({
    where: {
      companyId,
      status: { not: 'CANCELADO' },
      orderedAt: { gte: startOfDay(new Date(from)), lte: endOfDay(new Date(to)) },
    },
    include: { items: true },
  });
  const products = await prisma.product.findMany({ where: { companyId } });
  const sold = new Map<string, number>();
  for (const o of orders) {
    for (const i of o.items) {
      sold.set(i.productId, (sold.get(i.productId) ?? 0) + toNum(i.quantity));
    }
  }

  return products
    .map((p) => {
      const vendido = sold.get(p.id) ?? 0;
      const estoque = toNum(p.stock);
      const necessario = Math.max(0, vendido - estoque);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        vendido,
        estoque,
        necessario,
        unit: p.unit,
      };
    })
    .filter((r) => r.vendido > 0 || r.necessario > 0)
    .sort((a, b) => b.necessario - a.necessario);
}
