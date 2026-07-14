export type MarketplaceId =
  | 'MERCADO_LIVRE'
  | 'SHOPEE'
  | 'AMAZON'
  | 'MAGALU'
  | 'NUVEMSHOP';

export type SyncResult = {
  marketplace: MarketplaceId;
  productsUpserted: number;
  ordersUpserted: number;
  customersUpserted: number;
  financeCreated: number;
  stockMovements: number;
  errors: string[];
  syncedAt: string;
};

export interface MarketplaceAdapter {
  id: MarketplaceId;
  label: string;
  getAuthUrl(companyId: string, state: string): string;
  exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    sellerId?: string;
    nickname?: string;
    accountName?: string;
    scope?: string;
  }>;
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>;
  syncAll(params: { companyId: string; connectionId: string }): Promise<SyncResult>;
}
