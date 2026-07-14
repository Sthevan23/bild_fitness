import { prisma } from '@/lib/prisma';
import type { SyncResult } from '../../types';
import { MercadoLivreAuthService } from '../auth/MercadoLivreAuthService';
import { MercadoLivreProductService } from '../products/MercadoLivreProductService';
import { MercadoLivreOrderService } from '../orders/MercadoLivreOrderService';

export class MercadoLivreSyncService {
  static async syncCompany(companyId: string): Promise<SyncResult> {
    const conn = await prisma.marketplaceConnection.findUnique({
      where: {
        companyId_marketplace: { companyId, marketplace: 'MERCADO_LIVRE' },
      },
    });

    if (!conn || conn.status === 'DISCONNECTED') {
      throw new Error('Sua conta do Mercado Livre precisa ser reconectada.');
    }
    if (!conn.sellerId) {
      throw new Error('Conta ML sem sellerId. Reconecte a conta.');
    }

    const errors: string[] = [];
    let productsUpserted = 0;
    let ordersUpserted = 0;
    let customersUpserted = 0;
    let financeCreated = 0;
    let stockMovements = 0;

    try {
      // Garante token válido antes do sync
      await MercadoLivreAuthService.getValidAccessToken(conn.id);

      try {
        const products = await MercadoLivreProductService.syncProducts(
          companyId,
          conn.id,
          conn.sellerId,
        );
        productsUpserted = products.upserted;
      } catch (e) {
        errors.push(`Produtos: ${e instanceof Error ? e.message : String(e)}`);
      }

      try {
        const from = conn.lastOrdersSyncAt || undefined;
        const orders = await MercadoLivreOrderService.syncOrders(
          companyId,
          conn.id,
          conn.sellerId,
          from,
        );
        ordersUpserted = orders.ordersUpserted;
        customersUpserted = orders.customersUpserted;
        financeCreated = orders.financeCreated;
        stockMovements = orders.stockMovements;
        errors.push(...orders.errors);
      } catch (e) {
        errors.push(`Pedidos: ${e instanceof Error ? e.message : String(e)}`);
      }

      const syncedAt = new Date();
      await prisma.marketplaceConnection.update({
        where: { id: conn.id },
        data: {
          lastSyncAt: syncedAt,
          lastOrdersSyncAt: syncedAt,
          lastSyncError: errors.length ? errors.slice(0, 5).join(' | ') : null,
          status: errors.some((e) => e.includes('reconectada')) ? 'EXPIRED' : 'CONNECTED',
        },
      });

      return {
        marketplace: 'MERCADO_LIVRE',
        productsUpserted,
        ordersUpserted,
        customersUpserted,
        financeCreated,
        stockMovements,
        errors,
        syncedAt: syncedAt.toISOString(),
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await prisma.marketplaceConnection.update({
        where: { id: conn.id },
        data: {
          lastSyncError: message,
          status: message.includes('reconectada') ? 'EXPIRED' : 'ERROR',
        },
      });
      throw e;
    }
  }

  static async syncAllConnected() {
    const connections = await prisma.marketplaceConnection.findMany({
      where: { marketplace: 'MERCADO_LIVRE', status: { in: ['CONNECTED', 'ERROR'] } },
    });
    const results: SyncResult[] = [];
    for (const conn of connections) {
      try {
        results.push(await this.syncCompany(conn.companyId));
      } catch (e) {
        results.push({
          marketplace: 'MERCADO_LIVRE',
          productsUpserted: 0,
          ordersUpserted: 0,
          customersUpserted: 0,
          financeCreated: 0,
          stockMovements: 0,
          errors: [e instanceof Error ? e.message : String(e)],
          syncedAt: new Date().toISOString(),
        });
      }
    }
    return results;
  }
}
