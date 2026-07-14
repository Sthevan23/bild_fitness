import type { MarketplaceAdapter } from '../types';
import { MercadoLivreAuthService } from './auth/MercadoLivreAuthService';
import { MercadoLivreSyncService } from './services/MercadoLivreSyncService';

export const mercadoLivreAdapter: MarketplaceAdapter = {
  id: 'MERCADO_LIVRE',
  label: 'Mercado Livre',
  getAuthUrl(_companyId, state) {
    return MercadoLivreAuthService.buildAuthUrl(state);
  },
  async exchangeCode(code) {
    const tokens = await MercadoLivreAuthService.exchangeCode(code);
    const user = await MercadoLivreAuthService.getUser(tokens.access_token);
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      sellerId: String(user.id),
      nickname: user.nickname,
      accountName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.nickname,
      scope: tokens.scope,
    };
  },
  async refreshToken(refreshToken) {
    const tokens = await MercadoLivreAuthService.refresh(refreshToken);
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    };
  },
  async syncAll({ companyId }) {
    return MercadoLivreSyncService.syncCompany(companyId);
  },
};

export { MercadoLivreAuthService } from './auth/MercadoLivreAuthService';
export { MercadoLivreSyncService } from './services/MercadoLivreSyncService';
export { MercadoLivreOrderService } from './orders/MercadoLivreOrderService';
export { MercadoLivreProductService } from './products/MercadoLivreProductService';
export { MercadoLivreCustomerService } from './customers/MercadoLivreCustomerService';
export { MercadoLivreInventoryService } from './inventory/MercadoLivreInventoryService';
export { MercadoLivreFinancialService } from './financial/MercadoLivreFinancialService';
