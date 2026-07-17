import { prisma } from '../../../shared/prisma.js';
import { syncProductTotalStock } from '../../accounts/infrastructure/accounts.repo.js';

function toNum(v: unknown) {
  return Number(v) || 0;
}

function normalizeDesc(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Aplica entrada de estoque para uma entrega confirmada (status ENTREGA). */
export async function applyDeliveryStockEntry(
  companyId: string,
  deliveryId: string,
  userId?: string,
) {
  const delivery = await prisma.purchaseDelivery.findFirst({
    where: { id: deliveryId, companyId },
    include: { lines: { include: { product: true } }, account: true },
  });
  if (!delivery) throw new Error('Entrega não encontrada');
  if (delivery.status !== 'ENTREGA') throw new Error('Somente entregas confirmadas geram estoque');
  if (delivery.stockApplied) return { applied: false, reason: 'already_applied' as const };

  const productIds = new Set<string>();
  await prisma.$transaction(async (tx) => {
    for (const line of delivery.lines) {
      let productId = line.productId;
      if (!productId) {
        const match = await tx.product.findFirst({
          where: {
            companyId,
            name: { contains: line.description.slice(0, 20) },
          },
        });
        if (match) productId = match.id;
      }
      if (!productId) continue;

      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) continue;
      productIds.add(productId);

      const qty = toNum(line.quantity);
      if (qty <= 0) continue;

      const stockRow = await tx.accountStock.upsert({
        where: { accountId_productId: { accountId: delivery.accountId, productId } },
        create: {
          accountId: delivery.accountId,
          productId,
          stock: qty,
          minStock: product.minStock,
        },
        update: { stock: { increment: qty } },
      });
      void stockRow;

      await tx.stockMovement.create({
        data: {
          companyId,
          accountId: delivery.accountId,
          productId,
          type: 'ENTRADA',
          quantity: qty,
          unitCost: toNum(line.unitCost) || toNum(product.costPrice),
          totalCost: qty * (toNum(line.unitCost) || toNum(product.costPrice)),
          userId: userId || null,
          note: `Entrega fornecedor · ${delivery.supplierName || '—'}`,
        },
      });
    }

    await tx.purchaseDelivery.update({
      where: { id: delivery.id },
      data: { stockApplied: true, deliveredAt: delivery.deliveredAt || new Date() },
    });
  });

  for (const id of productIds) await syncProductTotalStock(id);
  return { applied: true as const };
}

export async function findProductIdByDescription(companyId: string, description: string) {
  const products = await prisma.product.findMany({
    where: { companyId },
    select: { id: true, name: true },
  });
  const target = normalizeDesc(description);
  const exact = products.find((p) => normalizeDesc(p.name) === target);
  if (exact) return exact.id;
  const partial = products.find(
    (p) => normalizeDesc(p.name).includes(target) || target.includes(normalizeDesc(p.name)),
  );
  return partial?.id || null;
}
