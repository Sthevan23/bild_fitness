import { prisma } from '@/lib/prisma';
import { toNum } from '@/lib/utils';

export class MercadoLivreInventoryService {
  /** Baixa estoque uma única vez por pedido (idempotente via stockDeducted) */
  static async deductForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.stockDeducted || order.status === 'CANCELADO') {
      return { movements: 0 };
    }

    let movements = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: toNum(item.quantity) } },
        });
        await tx.stockMovement.create({
          data: {
            companyId: order.companyId,
            productId: product.id,
            type: 'SAIDA',
            quantity: item.quantity,
            unitCost: product.avgCost,
            totalCost: toNum(item.quantity) * toNum(product.avgCost),
            orderId: order.id,
            note: `Baixa automática ML pedido #${order.number}`,
          },
        });
        movements += 1;
      }
      await tx.order.update({
        where: { id: order.id },
        data: { stockDeducted: true },
      });
    });

    return { movements };
  }

  static async restoreIfCancelled(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || !order.stockDeducted || order.status !== 'CANCELADO') {
      return { movements: 0 };
    }

    let movements = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: toNum(item.quantity) } },
        });
        await tx.stockMovement.create({
          data: {
            companyId: order.companyId,
            productId: item.productId,
            type: 'ENTRADA',
            quantity: item.quantity,
            orderId: order.id,
            note: `Estorno cancelamento ML #${order.number}`,
          },
        });
        movements += 1;
      }
      await tx.order.update({
        where: { id: order.id },
        data: { stockDeducted: false },
      });
    });
    return { movements };
  }
}
