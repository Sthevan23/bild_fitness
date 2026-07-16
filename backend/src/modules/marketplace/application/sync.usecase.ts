import { prisma } from '../../../shared/prisma.js';
import { AppError } from '../../../shared/errors.js';
import { MercadoLivreAuthService } from '../infrastructure/MercadoLivreAuthService.js';
import { resolveActiveAccount } from '../../accounts/infrastructure/accounts.repo.js';

export class SyncMercadoLivreUseCase {
  async execute(companyId: string, activeCode?: string) {
    const account = await resolveActiveAccount(companyId, activeCode);
    const conn = await prisma.marketplaceConnection.findFirst({
      where: { companyId, marketplace: 'MERCADO_LIVRE', accountId: account.id },
    });
    if (!conn || conn.status === 'DISCONNECTED') {
      throw new AppError('Mercado Livre não conectado nesta conta');
    }
    await MercadoLivreAuthService.getValidAccessToken(conn.id);
    // Full order/product sync can be expanded from legacy MercadoLivreSyncService
    const syncedAt = new Date();
    await prisma.marketplaceConnection.update({
      where: { id: conn.id },
      data: {
        lastSyncAt: syncedAt,
        lastOrdersSyncAt: syncedAt,
        lastSyncError: null,
        status: 'CONNECTED',
      },
    });
    return {
      marketplace: 'MERCADO_LIVRE' as const,
      productsUpserted: 0,
      ordersUpserted: 0,
      customersUpserted: 0,
      financeCreated: 0,
      stockMovements: 0,
      errors: [] as string[],
      syncedAt: syncedAt.toISOString(),
      note: 'Token validado. Portar sync completo de pedidos/produtos do legado quando necessário.',
    };
  }
}
