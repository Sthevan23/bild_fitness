import { prisma } from '../../../shared/prisma.js';
import { AppError } from '../../../shared/errors.js';
import { resolveActiveAccount, syncProductTotalStock } from '../../accounts/infrastructure/accounts.repo.js';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import type { OrderStatus, Platform } from '@prisma/client';

function periodRange(period?: string) {
  const now = new Date();
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

function toNum(v: unknown) {
  return Number(v) || 0;
}

export class ListOrdersUseCase {
  async execute(
    companyId: string,
    activeCode: string | undefined,
    filters: {
      period?: string;
      platform?: Platform | 'ALL';
      status?: OrderStatus | 'ALL';
      search?: string;
    },
  ) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const range = periodRange(filters.period);
    return prisma.order.findMany({
      where: {
        companyId,
        accountId: account.id,
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
      include: { customer: true, items: { include: { product: true } }, account: true },
      orderBy: { orderedAt: 'desc' },
    });
  }
}

export class UpdateOrderStatusUseCase {
  async execute(
    companyId: string,
    userId: string,
    orderId: string,
    status: OrderStatus,
    trackingCode?: string,
    activeCode?: string,
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId },
      include: { items: true },
    });
    if (!order) throw new AppError('Pedido não encontrado', 404);

    if (status === 'ENVIADO' && order.status !== 'ENVIADO' && !order.stockDeducted) {
      const account =
        order.accountId
          ? await prisma.salesAccount.findUnique({ where: { id: order.accountId } })
          : await resolveActiveAccount(companyId, activeCode);
      if (!account) throw new AppError('Conta inválida');

      const productIds: string[] = [];
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;
          productIds.push(product.id);
          const stockRow = await tx.accountStock.upsert({
            where: { accountId_productId: { accountId: account.id, productId: product.id } },
            create: {
              accountId: account.id,
              productId: product.id,
              stock: 0,
              minStock: product.minStock,
            },
            update: {},
          });
          if (toNum(stockRow.stock) < toNum(item.quantity)) {
            throw new AppError(`Estoque insuficiente: ${product.name}`);
          }
          await tx.accountStock.update({
            where: { id: stockRow.id },
            data: { stock: { decrement: toNum(item.quantity) } },
          });
          await tx.stockMovement.create({
            data: {
              companyId,
              accountId: account.id,
              productId: product.id,
              type: 'SAIDA',
              quantity: item.quantity,
              unitCost: product.avgCost,
              totalCost: toNum(item.quantity) * toNum(product.avgCost),
              orderId: order.id,
              userId,
              note: `Baixa pedido #${order.number}`,
            },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: {
            status,
            accountId: account.id,
            trackingCode: trackingCode || order.trackingCode,
            shippedAt: new Date(),
            stockDeducted: true,
          },
        });
      });
      for (const id of productIds) await syncProductTotalStock(id);
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: { status, trackingCode: trackingCode || order.trackingCode },
      });
    }
    return { ok: true as const };
  }
}
