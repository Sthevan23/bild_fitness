'use server';

import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/session';
import { toNum } from '@/lib/utils';
import { productSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function listProducts(search?: string) {
  const session = await requireModule('estoque');
  return prisma.product.findMany({
    where: {
      companyId: session.user.companyId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { sku: { contains: search } },
              { barcode: { contains: search } },
              { category: { contains: search } },
            ],
          }
        : {}),
    },
    include: { supplier: true },
    orderBy: { name: 'asc' },
  });
}

export async function createProduct(data: {
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
  supplierId?: string;
}) {
  const session = await requireModule('estoque');
  const parsed = productSchema.safeParse({
    ...data,
    unit: data.unit || 'UN',
    stock: data.stock ?? 0,
    minStock: data.minStock ?? 5,
    costPrice: data.costPrice ?? 0,
    salePrice: data.salePrice ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  try {
    await prisma.product.create({
      data: {
        companyId: session.user.companyId,
        name: parsed.data.name,
        sku: parsed.data.sku,
        barcode: parsed.data.barcode || null,
        category: parsed.data.category || null,
        unit: parsed.data.unit || 'UN',
        stock: parsed.data.stock,
        minStock: parsed.data.minStock,
        costPrice: parsed.data.costPrice,
        avgCost: parsed.data.costPrice,
        salePrice: parsed.data.salePrice,
        brand: parsed.data.brand || null,
        supplierId: data.supplierId || null,
      },
    });
    revalidatePath('/estoque');
    return { ok: true };
  } catch {
    return { error: 'Não foi possível criar (SKU duplicado?)' };
  }
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    barcode: string;
    category: string;
    unit: string;
    minStock: number;
    costPrice: number;
    salePrice: number;
    brand: string;
  }>,
) {
  const session = await requireModule('estoque');
  await prisma.product.updateMany({
    where: { id, companyId: session.user.companyId },
    data,
  });
  revalidatePath('/estoque');
  return { ok: true };
}

export async function adjustStock(productId: string, type: 'ENTRADA' | 'SAIDA', quantity: number) {
  const session = await requireModule('estoque');
  if (quantity <= 0) return { error: 'Quantidade inválida' };

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId: session.user.companyId },
  });
  if (!product) return { error: 'Produto não encontrado' };
  if (type === 'SAIDA' && toNum(product.stock) < quantity) {
    return { error: 'Estoque insuficiente' };
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: product.id },
      data: {
        stock: type === 'ENTRADA' ? { increment: quantity } : { decrement: quantity },
        ...(type === 'ENTRADA'
          ? {
              avgCost:
                (toNum(product.avgCost) * toNum(product.stock) + toNum(product.costPrice) * quantity) /
                (toNum(product.stock) + quantity || 1),
            }
          : {}),
      },
    });
    await tx.stockMovement.create({
      data: {
        companyId: session.user.companyId,
        productId: product.id,
        type,
        quantity,
        unitCost: product.costPrice,
        totalCost: quantity * toNum(product.costPrice),
        userId: session.user.id,
        note: `Ajuste manual ${type}`,
      },
    });
    return updated;
  });

  revalidatePath('/estoque');
  return { ok: true };
}

export async function deleteProduct(id: string) {
  const session = await requireModule('estoque');
  try {
    await prisma.orderItem.deleteMany({ where: { product: { id, companyId: session.user.companyId } } });
    await prisma.stockMovement.deleteMany({ where: { productId: id, companyId: session.user.companyId } });
    await prisma.product.deleteMany({ where: { id, companyId: session.user.companyId } });
    revalidatePath('/estoque');
    return { ok: true };
  } catch {
    return { error: 'Não foi possível excluir o produto' };
  }
}
