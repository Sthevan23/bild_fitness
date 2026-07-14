import Fuse from 'fuse.js';
import { prisma } from '@/lib/prisma';
import type { MatchedProduct, MatchKind, NfeItem } from './nfe.types';

function toMatched(product: {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  stock: { toNumber(): number } | number;
  avgCost: { toNumber(): number } | number;
  costPrice: { toNumber(): number } | number;
}): MatchedProduct {
  const stock = typeof product.stock === 'number' ? product.stock : product.stock.toNumber();
  const avgCost =
    typeof product.avgCost === 'number' ? product.avgCost : product.avgCost.toNumber();
  const costPrice =
    typeof product.costPrice === 'number' ? product.costPrice : product.costPrice.toNumber();
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    stock,
    avgCost: avgCost || costPrice,
  };
}

export async function matchProduct(
  item: NfeItem,
  companyId: string,
): Promise<{
  matchKind: MatchKind;
  matchScore?: number;
  product?: MatchedProduct;
}> {
  if (item.codigo) {
    const bySku = await prisma.product.findUnique({
      where: { companyId_sku: { companyId, sku: item.codigo } },
    });
    if (bySku) {
      return { matchKind: 'codigo', matchScore: 1, product: toMatched(bySku) };
    }
  }

  if (item.codigoBarras) {
    const byEan = await prisma.product.findFirst({
      where: { companyId, barcode: item.codigoBarras },
    });
    if (byEan) {
      return { matchKind: 'ean', matchScore: 1, product: toMatched(byEan) };
    }
  }

  const candidates = await prisma.product.findMany({
    where: { companyId },
    take: 300,
    orderBy: { updatedAt: 'desc' },
  });

  if (candidates.length > 0) {
    const fuse = new Fuse(candidates, {
      keys: ['name', 'sku'],
      threshold: 0.35,
      includeScore: true,
    });
    const results = fuse.search(item.descricao);
    if (results[0] && (results[0].score ?? 1) <= 0.35) {
      const score = 1 - (results[0].score ?? 0);
      return {
        matchKind: 'fuzzy',
        matchScore: Number(score.toFixed(3)),
        product: toMatched(results[0].item),
      };
    }
  }

  return { matchKind: 'novo' };
}
