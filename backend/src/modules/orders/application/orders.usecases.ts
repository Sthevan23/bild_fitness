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
      // Histórico mínimo: 2 anos
      return { gte: startOfDay(subDays(now, 729)), lte: endOfDay(now) };
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
      limit?: number;
    },
  ) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const range = periodRange(filters.period);
    const take = Math.min(Math.max(Number(filters.limit) || 300, 1), 500);
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
      select: {
        id: true,
        number: true,
        status: true,
        platform: true,
        total: true,
        freight: true,
        netAmount: true,
        trackingCode: true,
        orderedAt: true,
        stockDeducted: true,
        customer: { select: { id: true, name: true, phone: true, document: true } },
        account: { select: { id: true, code: true, name: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            productId: true,
            product: { select: { id: true, sku: true, name: true } },
          },
        },
      },
      orderBy: { orderedAt: 'desc' },
      take,
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

      const productIds = new Set<string>();
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;
          const qty = toNum(item.quantity);
          productIds.add(product.id);
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
          if (toNum(stockRow.stock) < qty) {
            throw new AppError(`Estoque insuficiente: ${product.name}`);
          }
          await tx.accountStock.update({
            where: { id: stockRow.id },
            data: { stock: { decrement: qty } },
          });
          await tx.stockMovement.create({
            data: {
              companyId,
              accountId: account.id,
              productId: product.id,
              type: 'SAIDA',
              quantity: qty,
              unitCost: product.avgCost,
              totalCost: qty * toNum(product.avgCost),
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
