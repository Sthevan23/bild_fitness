'use server';

import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/session';
import { toNum } from '@/lib/utils';
import {
  formatAdiantarLine,
  matchProductName,
  parseAdiantarText,
  platformFromCode,
} from '@/services/orders/adiantar.parser';
import { revalidatePath } from 'next/cache';

export type AdiantarPreviewItem = {
  lineNumber: number;
  raw: string;
  date: string;
  brand: string;
  platformCode: string;
  quantity: number;
  productText: string;
  customerName?: string;
  productId?: string;
  productSku?: string;
  productName?: string;
  unitPrice: number;
  ok: boolean;
  error?: string;
};

export async function previewAdiantarList(text: string): Promise<
  | { ok: true; items: AdiantarPreviewItem[]; summary: { total: number; matched: number; errors: number } }
  | { error: string }
> {
  try {
    const session = await requireModule('pedidos');
    if (!text.trim()) return { error: 'Cole a lista de vendas' };

    const products = await prisma.product.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true, sku: true, salePrice: true },
    });
    const catalogNames = products.map((p) => p.name);
    const parsed = parseAdiantarText(text, catalogNames);

    const items: AdiantarPreviewItem[] = parsed.map((row) => {
      if (!row.ok) {
        return {
          lineNumber: row.lineNumber,
          raw: row.raw,
          date: row.date.toISOString(),
          brand: row.brand,
          platformCode: row.platformCode,
          quantity: row.quantity,
          productText: row.productText,
          customerName: row.customerName,
          unitPrice: 0,
          ok: false,
          error: row.error,
        };
      }

      const product = matchProductName(row.productText, products);
      if (!product) {
        return {
          lineNumber: row.lineNumber,
          raw: row.raw,
          date: row.date.toISOString(),
          brand: row.brand,
          platformCode: row.platformCode,
          quantity: row.quantity,
          productText: row.productText,
          customerName: row.customerName,
          unitPrice: 0,
          ok: false,
          error: `Produto não encontrado: ${row.productText}`,
        };
      }

      return {
        lineNumber: row.lineNumber,
        raw: row.raw,
        date: row.date.toISOString(),
        brand: row.brand,
        platformCode: row.platformCode,
        quantity: row.quantity,
        productText: row.productText,
        customerName: row.customerName,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        unitPrice: toNum(product.salePrice),
        ok: true,
      };
    });

    return {
      ok: true,
      items,
      summary: {
        total: items.length,
        matched: items.filter((i) => i.ok).length,
        errors: items.filter((i) => !i.ok).length,
      },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Falha ao processar lista' };
  }
}

export async function confirmAdiantarList(items: AdiantarPreviewItem[]) {
  try {
    const session = await requireModule('pedidos');
    const valid = items.filter((i) => i.ok && i.productId);
    if (valid.length === 0) return { error: 'Nenhuma linha válida para importar' };

    let created = 0;
    const last = await prisma.order.findFirst({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    });
    let seq = Number(String(last?.number ?? '0').replace(/\D/g, '')) || 0;

    for (const item of valid) {
      seq += 1;
      const number = `PED-${String(seq).padStart(4, '0')}`;

      let customerId: string | undefined;
      if (item.customerName) {
        const existing = await prisma.customer.findFirst({
          where: {
            companyId: session.user.companyId,
            name: { equals: item.customerName },
          },
        });
        if (existing) customerId = existing.id;
        else {
          const createdCustomer = await prisma.customer.create({
            data: {
              companyId: session.user.companyId,
              name: item.customerName,
            },
          });
          customerId = createdCustomer.id;
        }
      }

      const unitPrice = item.unitPrice;
      const total = unitPrice * item.quantity;

      await prisma.order.create({
        data: {
          companyId: session.user.companyId,
          number,
          customerId,
          platform: platformFromCode(item.platformCode),
          status: 'AGUARDANDO',
          paymentMethod: 'Mercado Livre',
          total,
          notes: `Adiantar ${item.brand} · ${item.raw}`,
          orderedAt: new Date(item.date),
          items: {
            create: [
              {
                productId: item.productId!,
                quantity: item.quantity,
                unitPrice,
                totalPrice: total,
              },
            ],
          },
          finance: {
            create: {
              companyId: session.user.companyId,
              type: 'ENTRADA',
              status: 'PENDENTE',
              description: `Pedido #${number} · ML ${item.brand}`,
              amount: total,
              category: 'Vendas ML',
              dueDate: new Date(item.date),
            },
          },
        },
      });
      created += 1;
    }

    revalidatePath('/pedidos');
    revalidatePath('/expedicao');
    revalidatePath('/dashboard');
    revalidatePath('/financeiro');
    revalidatePath('/clientes');
    return { ok: true as const, created };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Falha ao criar pedidos' };
  }
}

/** Gera texto no formato Adiantar a partir dos pedidos filtrados */
export async function exportAdiantarText(filters: {
  period?: string;
  platform?: 'MERCADO_LIVRE' | 'ALL';
}) {
  const session = await requireModule('pedidos');
  const { listOrders } = await import('@/actions/orders');
  const orders = await listOrders({
    period: filters.period ?? 'hoje',
    platform: filters.platform === 'ALL' ? 'ALL' : 'MERCADO_LIVRE',
    status: 'ALL',
  });

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  });
  const defaultBrand = (company?.name ?? 'Bild Fitness').split(/\s+/)[0]?.toUpperCase() || 'BILD';

  const lines = orders.flatMap((order) => {
    if (order.status === 'CANCELADO') return [];
    const brandFromNotes = order.notes?.match(/Adiantar\s+(\S+)/i)?.[1];
    return order.items.map((item) =>
      formatAdiantarLine({
        date: new Date(order.orderedAt),
        brand: brandFromNotes || defaultBrand,
        platformCode:
          order.platform === 'MERCADO_LIVRE'
            ? 'ML'
            : order.platform === 'SHOPEE'
              ? 'SHOPEE'
              : order.platform === 'WHATSAPP'
                ? 'WHATSAPP'
                : 'LOJA',
        quantity: toNum(item.quantity),
        productName: item.product.name,
        customerName: order.customer?.name,
      }),
    );
  });

  return { text: lines.join('\n'), count: lines.length };
}
