import type { MarketplaceAdapter, MarketplaceId } from './types';
import { mercadoLivreAdapter } from './mercadolivre';

const adapters: Record<string, MarketplaceAdapter> = {
  MERCADO_LIVRE: mercadoLivreAdapter,
};

export function getMarketplaceAdapter(id: MarketplaceId): MarketplaceAdapter {
  const adapter = adapters[id];
  if (!adapter) throw new Error(`Marketplace ${id} ainda não implementado`);
  return adapter;
}

export function listMarketplaceAdapters() {
  return Object.values(adapters);
}

export * from './types';
