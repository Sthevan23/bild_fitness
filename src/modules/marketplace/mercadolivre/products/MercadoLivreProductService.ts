import { prisma } from '@/lib/prisma';
import { toNum } from '@/lib/utils';
import { mlFetch } from '../client';
import { MercadoLivreAuthService } from '../auth/MercadoLivreAuthService';

type MlItem = {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  status: string;
  category_id?: string;
  seller_custom_field?: string | null;
  seller_sku?: string | null;
  pictures?: { url: string; secure_url?: string }[];
  attributes?: { id: string; value_name?: string | null }[];
};

export class MercadoLivreProductService {
  static async listItemIds(connectionId: string, sellerId: string) {
    const token = await MercadoLivreAuthService.getValidAccessToken(connectionId);
    const ids: string[] = [];
    let offset = 0;
    const limit = 50;

    for (;;) {
      const page = await mlFetch<{ results: string[]; paging: { total: number } }>(
        `/users/${sellerId}/items/search?status=active&offset=${offset}&limit=${limit}`,
        { accessToken: token },
      );
      ids.push(...(page.results || []));
      offset += limit;
      if (!page.results?.length || ids.length >= (page.paging?.total ?? 0) || offset > 2000) break;
    }
    return ids;
  }

  static async fetchItems(connectionId: string, itemIds: string[]) {
    const token = await MercadoLivreAuthService.getValidAccessToken(connectionId);
    const items: MlItem[] = [];
    for (let i = 0; i < itemIds.length; i += 20) {
      const chunk = itemIds.slice(i, i + 20);
      const multi = await mlFetch<Array<{ code: number; body: MlItem }>>(
        `/items?ids=${chunk.join(',')}`,
        { accessToken: token },
      );
      for (const row of multi) {
        if (row.code === 200 && row.body) items.push(row.body);
      }
    }
    return items;
  }

  static resolveSku(item: MlItem) {
    const attrSku = item.attributes?.find((a) => a.id === 'SELLER_SKU')?.value_name;
    return (item.seller_sku || attrSku || item.seller_custom_field || item.id).trim();
  }

  static async upsertFromMl(companyId: string, item: MlItem) {
    const sku = this.resolveSku(item);
    const imageUrl = item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url || null;

    const byMl = await prisma.product.findFirst({
      where: { companyId, mlItemId: item.id },
    });
    if (byMl) {
      return prisma.product.update({
        where: { id: byMl.id },
        data: {
          name: item.title,
          salePrice: item.price,
          stock: item.available_quantity,
          category: item.category_id || byMl.category,
          imageUrl,
          mlStatus: item.status,
          sku: byMl.sku || sku,
        },
      });
    }

    const bySku = await prisma.product.findUnique({
      where: { companyId_sku: { companyId, sku } },
    });
    if (bySku) {
      return prisma.product.update({
        where: { id: bySku.id },
        data: {
          name: item.title,
          salePrice: item.price,
          stock: item.available_quantity,
          category: item.category_id || bySku.category,
          imageUrl,
          mlItemId: item.id,
          mlStatus: item.status,
        },
      });
    }

    return prisma.product.create({
      data: {
        companyId,
        sku,
        name: item.title,
        salePrice: item.price,
        stock: item.available_quantity,
        category: item.category_id || 'Mercado Livre',
        imageUrl,
        mlItemId: item.id,
        mlStatus: item.status,
        unit: 'UN',
      },
    });
  }

  static async syncProducts(companyId: string, connectionId: string, sellerId: string) {
    const ids = await this.listItemIds(connectionId, sellerId);
    const items = await this.fetchItems(connectionId, ids);
    let upserted = 0;
    for (const item of items) {
      await this.upsertFromMl(companyId, item);
      upserted += 1;
    }
    return { upserted, total: items.length };
  }

  static async findOrCreateFromOrderLine(
    companyId: string,
    line: { itemId?: string; title: string; sku?: string | null; unitPrice: number; quantity: number },
  ) {
    if (line.itemId) {
      const byMl = await prisma.product.findFirst({ where: { companyId, mlItemId: line.itemId } });
      if (byMl) return byMl;
    }
    const sku = (line.sku || line.itemId || `ML-${line.title.slice(0, 20)}`).replace(/\s+/g, '-');
    const bySku = await prisma.product.findUnique({ where: { companyId_sku: { companyId, sku } } });
    if (bySku) {
      if (line.itemId && !bySku.mlItemId) {
        return prisma.product.update({
          where: { id: bySku.id },
          data: { mlItemId: line.itemId, salePrice: line.unitPrice || toNum(bySku.salePrice) },
        });
      }
      return bySku;
    }
    return prisma.product.create({
      data: {
        companyId,
        sku,
        name: line.title,
        salePrice: line.unitPrice,
        stock: 0,
        mlItemId: line.itemId,
        category: 'Mercado Livre',
        unit: 'UN',
      },
    });
  }
}
