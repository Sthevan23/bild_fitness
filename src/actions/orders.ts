'use server';

import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/session';
import { toNum } from '@/lib/utils';
import type { OrderStatus, Platform } from '@prisma/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { revalidatePath } from 'next/cache';

function periodRange(period?: string, from?: string, to?: string) {
  const now = new Date();
  if (from && to) return { gte: startOfDay(new Date(from)), lte: endOfDay(new Date(to)) };
  switch (period) {
    case 'hoje':
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case 'ontem': {
      const d = subDays(now, 1);
      return { gte: startOfDay(d), lte: endOfDay(d) };
    }
    case '7':
      return { gte: startOfDay(subDays(now, 6)), lte: endOfDay(now) };
    case '15':
      return { gte: startOfDay(subDays(now, 14)), lte: endOfDay(now) };
    case '30':
      return { gte: startOfDay(subDays(now, 29)), lte: endOfDay(now) };
    default:
      return undefined;
  }
}

export async function listOrders(filters: {
  period?: string;
  from?: string;
  to?: string;
  platform?: Platform | 'ALL';
  status?: OrderStatus | 'ALL';
  search?: string;
}) {
  const session = await requireModule('pedidos');
  const range = periodRange(filters.period, filters.from, filters.to);
  return prisma.order.findMany({
    where: {
      companyId: session.user.companyId,
      ...(range ? { orderedAt: range } : {}),
      ...(filters.platform && filters.platform !== 'ALL' ? { platform: filters.platform } : {}),
      ...(filters.status && filters.status !== 'ALL' ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { number: { contains: filters.search } },
              { customer: { name: { contains: filters.search } } },
              { trackingCode: { contains: filters.search } },
            ],
          }
        : {}),
    },
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { orderedAt: 'desc' },
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, trackingCode?: string) {
  const session = await requireModule('pedidos');
  const order = await prisma.order.findFirst({
    where: { id: orderId, companyId: session.user.companyId },
    include: { items: true },
  });
  if (!order) return { error: 'Pedido não encontrado' };

  if (status === 'ENVIADO' && order.status !== 'ENVIADO') {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        if (toNum(product.stock) < toNum(item.quantity)) {
          throw new Error(`Estoque insuficiente: ${product.name}`);
        }
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: toNum(item.quantity) } },
        });
        await tx.stockMovement.create({
          data: {
            companyId: session.user.companyId,
            productId: product.id,
            type: 'SAIDA',
            quantity: item.quantity,
            unitCost: product.avgCost,
            totalCost: toNum(item.quantity) * toNum(product.avgCost),
            orderId: order.id,
            userId: session.user.id,
            note: `Baixa pedido #${order.number}`,
          },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status,
          trackingCode: trackingCode || order.trackingCode,
          shippedAt: new Date(),
        },
      });
    });
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: { status, trackingCode: trackingCode || order.trackingCode },
    });
  }

  revalidatePath('/pedidos');
  revalidatePath('/expedicao');
  revalidatePath('/estoque');
  revalidatePath('/dashboard');
  return { ok: true };
}
