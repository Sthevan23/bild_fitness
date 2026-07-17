import { prisma } from '../../../shared/prisma.js';
import { AppError } from '../../../shared/errors.js';
import { resolveActiveAccount } from '../../accounts/infrastructure/accounts.repo.js';
import {
  applyDeliveryStockEntry,
  findProductIdByDescription,
} from './delivery-stock.service.js';
import type { PurchaseDeliveryStatus } from '@prisma/client';

function toNum(v: unknown) {
  return Number(v) || 0;
}

export class ListDeliveriesUseCase {
  async execute(companyId: string, activeCode?: string, status?: PurchaseDeliveryStatus | 'ALL') {
    const account = await resolveActiveAccount(companyId, activeCode);
    return prisma.purchaseDelivery.findMany({
      where: {
        companyId,
        accountId: account.id,
        ...(status && status !== 'ALL' ? { status } : {}),
      },
      include: { lines: { include: { product: true } }, account: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export class CreateDeliveryUseCase {
  async execute(
    companyId: string,
    activeCode: string | undefined,
    data: {
      supplierName?: string;
      status?: PurchaseDeliveryStatus;
      lines: Array<{ description: string; quantity: number; unitCost?: number; productId?: string }>;
    },
    userId?: string,
  ) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const status = data.status || 'PEDIDO';

    const delivery = await prisma.purchaseDelivery.create({
      data: {
        companyId,
        accountId: account.id,
        supplierName: data.supplierName || 'Marciela',
        status,
        orderedAt: new Date(),
        deliveredAt: status === 'ENTREGA' ? new Date() : null,
        lines: {
          create: await Promise.all(
            data.lines.map(async (line) => ({
              description: line.description,
              quantity: line.quantity,
              unitCost: line.unitCost ?? 0,
              productId:
                line.productId ||
                (await findProductIdByDescription(companyId, line.description)),
            })),
          ),
        },
      },
      include: { lines: true },
    });

    if (status === 'ENTREGA') {
      await applyDeliveryStockEntry(companyId, delivery.id, userId);
    }

    return { ok: true as const, id: delivery.id };
  }
}

export class ConfirmDeliveryUseCase {
  async execute(companyId: string, deliveryId: string, userId?: string) {
    const delivery = await prisma.purchaseDelivery.findFirst({
      where: { id: deliveryId, companyId },
    });
    if (!delivery) throw new AppError('Pedido não encontrado', 404);
    if (delivery.status === 'ENTREGA') throw new AppError('Já confirmado como entrega');

    await prisma.purchaseDelivery.update({
      where: { id: delivery.id },
      data: { status: 'ENTREGA', deliveredAt: new Date() },
    });

    await applyDeliveryStockEntry(companyId, delivery.id, userId);
    return { ok: true as const };
  }
}

export class ReorderSuggestionUseCase {
  async execute(
    companyId: string,
    activeCode: string | undefined,
    from?: string,
    to?: string,
  ) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();

    const products = await prisma.product.findMany({
      where: { companyId },
      include: {
        accountStocks: { where: { accountId: account.id } },
        orderItems: {
          where: { order: { accountId: account.id, orderedAt: { gte: fromDate, lte: toDate } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const allStocks = await prisma.accountStock.findMany({
      where: { productId: { in: products.map((p) => p.id) } },
      select: { productId: true, stock: true },
    });
    const totalByProduct = new Map<string, number>();
    for (const s of allStocks) {
      totalByProduct.set(s.productId, (totalByProduct.get(s.productId) || 0) + toNum(s.stock));
    }

    const rows = products
      .filter((p) => !p.sku.startsWith('KIT') && !p.sku.startsWith('PAR'))
      .map((p) => {
        const sold = p.orderItems.reduce((a, i) => a + toNum(i.quantity), 0);
        const accountStock = toNum(p.accountStocks[0]?.stock);
        const totalStock = totalByProduct.get(p.id) || 0;
        const suggestion =
          sold > 0 && accountStock <= sold ? Math.floor((sold + 3) / 2) * 2 : null;
        return {
          productId: p.id,
          description: p.name,
          sku: p.sku,
          soldInPeriod: sold,
          accountStock,
          totalStock,
          suggestion,
          suggestionLabel: suggestion == null ? 'Estoque suficiente' : String(suggestion),
        };
      })
      .filter((r) => r.soldInPeriod > 0 || r.accountStock < 0 || r.suggestion != null);

    return {
      account: account.code,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      rows,
    };
  }
}
