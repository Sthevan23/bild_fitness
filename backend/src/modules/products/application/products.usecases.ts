import { normalizeAccountCode } from '@pep/shared';
import { prisma } from '../../../shared/prisma.js';
import { AppError } from '../../../shared/errors.js';
import {
  ensureSalesAccounts,
  resolveActiveAccount,
  syncProductTotalStock,
} from '../../accounts/infrastructure/accounts.repo.js';

function toNum(v: unknown) {
  return Number(v) || 0;
}

export class ListProductsUseCase {
  async execute(companyId: string, activeCode?: string, search?: string) {
    await ensureSalesAccounts(companyId);
    const account = await resolveActiveAccount(companyId, activeCode);
    const products = await prisma.product.findMany({
      where: {
        companyId,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { sku: { contains: search } },
                { barcode: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        supplier: true,
        accountStocks: { include: { account: { select: { code: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => {
      const row = p.accountStocks.find((s) => s.account.code === account.code);
      return {
        ...p,
        stock: row ? toNum(row.stock) : 0,
        minStock: row ? toNum(row.minStock) : toNum(p.minStock),
        accountCode: account.code,
      };
    });
  }
}

/** Visão ESTOQUE da planilha: saldo por produto em PCP / RC / P&P / total */
export class StockOverviewUseCase {
  async execute(companyId: string, search?: string) {
    await ensureSalesAccounts(companyId);
    const products = await prisma.product.findMany({
      where: {
        companyId,
        ...(search
          ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] }
          : {}),
        NOT: { sku: { startsWith: 'KIT' } },
      },
      include: { accountStocks: { include: { account: { select: { code: true } } } } },
      orderBy: { name: 'asc' },
    });

    return products
      .filter((p) => !p.sku.startsWith('PAR'))
      .map((p) => {
        const byCode = (code: string) =>
          toNum(p.accountStocks.find((s) => s.account.code === code)?.stock);
        const pcp = byCode('PCP');
        const rc = byCode('RC');
        const pp = byCode('P&P');
        const total = pcp + rc + pp;
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          pcp,
          rc,
          pp,
          total,
        };
      });
  }
}

export class CreateProductUseCase {
  async execute(
    companyId: string,
    data: {
      name: string;
      sku: string;
      barcode?: string;
      category?: string;
      unit?: string;
      stock?: number;
      minStock?: number;
      costPrice?: number;
      salePrice?: number;
      brand?: string;
    },
    activeCode?: string,
  ) {
    const accounts = await ensureSalesAccounts(companyId);
    const target = normalizeAccountCode(activeCode);    try {
      const product = await prisma.product.create({
        data: {
          companyId,
          name: data.name,
          sku: data.sku,
          barcode: data.barcode || null,
          category: data.category || null,
          unit: data.unit || 'UN',
          stock: data.stock ?? 0,
          minStock: data.minStock ?? 5,
          costPrice: data.costPrice ?? 0,
          avgCost: data.costPrice ?? 0,
          salePrice: data.salePrice ?? 0,
          brand: data.brand || null,
          accountStocks: {
            create: accounts.map((a) => ({
              accountId: a.id,
              stock: a.code === target ? data.stock ?? 0 : 0,
              minStock: data.minStock ?? 5,
            })),
          },
        },
      });
      await syncProductTotalStock(product.id);
      return { ok: true as const };
    } catch {
      throw new AppError('Não foi possível criar (SKU duplicado?)');
    }
  }
}

export class AdjustStockUseCase {
  async execute(
    companyId: string,
    userId: string,
    productId: string,
    type: 'ENTRADA' | 'SAIDA',
    quantity: number,
    activeCode?: string,
  ) {
    if (quantity <= 0) throw new AppError('Quantidade inválida');
    const account = await resolveActiveAccount(companyId, activeCode);
    const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
    if (!product) throw new AppError('Produto não encontrado', 404);
    const stockRow = await prisma.accountStock.upsert({
      where: { accountId_productId: { accountId: account.id, productId } },
      create: { accountId: account.id, productId, stock: 0, minStock: product.minStock },
      update: {},
    });
    if (type === 'SAIDA' && toNum(stockRow.stock) < quantity) {
      throw new AppError(`Estoque insuficiente na conta ${account.code}`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.accountStock.update({
        where: { id: stockRow.id },
        data: {
          stock: type === 'ENTRADA' ? { increment: quantity } : { decrement: quantity },
        },
      });
      await tx.stockMovement.create({
        data: {
          companyId,
          accountId: account.id,
          productId,
          type,
          quantity,
          unitCost: product.costPrice,
          totalCost: quantity * toNum(product.costPrice),
          userId,
          note: `Ajuste ${account.code} ${type}`,
        },
      });
    });
    await syncProductTotalStock(productId);
    return { ok: true as const };
  }
}

export class DeleteProductUseCase {
  async execute(companyId: string, id: string) {
    try {
      await prisma.orderItem.deleteMany({ where: { product: { id, companyId } } });
      await prisma.stockMovement.deleteMany({ where: { productId: id, companyId } });
      await prisma.accountStock.deleteMany({ where: { productId: id } });
      await prisma.product.deleteMany({ where: { id, companyId } });
      return { ok: true as const };
    } catch {
      throw new AppError('Não foi possível excluir o produto');
    }
  }
}
