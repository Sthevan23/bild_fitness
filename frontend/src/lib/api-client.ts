import type { AccountCode, SessionUser } from '@pep/shared';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

type ApiOptions = RequestInit & { json?: unknown };

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  url: API_URL,
  health: () => request<{ ok: boolean }>('/health'),
  login: (email: string, password: string) =>
    request<{ ok: true; user: SessionUser; token: string }>('/auth/login', {
      method: 'POST',
      json: { email, password },
    }),
  register: (body: { companyName: string; name: string; email: string; password: string }) =>
    request<{ ok: true }>('/auth/register', { method: 'POST', json: body }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: SessionUser }>('/auth/me'),
  accountsHub: () => request<{ ok: boolean; activeCode: AccountCode; accounts: HubAccount[] }>('/accounts/hub'),
  listAccounts: () => request<{ accounts: Array<{ id: string; code: AccountCode; name: string; cnpj: string | null }> }>('/accounts'),
  setActiveAccount: (code: AccountCode) =>
    request<{ ok: true; code: AccountCode }>('/accounts/active', { method: 'POST', json: { code } }),
  getActiveAccount: () => request<{ code: AccountCode }>('/accounts/active'),
  updateAccount: (code: AccountCode, body: { name?: string; cnpj?: string | null }) =>
    request<{ ok: true }>(`/accounts/${encodeURIComponent(code)}`, { method: 'PATCH', json: body }),
  marginSettings: () =>
    request<MarginSettings>('/accounts/margin-settings'),
  updateMarginSettings: (body: {
    ratePercent: number;
    targetMarginPercent: number;
    recalculate?: boolean;
  }) =>
    request<MarginSettings & { ok: true; recalculated: number }>('/accounts/margin-settings', {
      method: 'PATCH',
      json: body,
    }),
  dashboard: () => request<DashboardData>('/dashboard'),
  orders: (q: Record<string, string> = {}) => {
    const qs = new URLSearchParams(q).toString();
    return request<{ orders: unknown[] }>(`/orders?${qs}`);
  },
  updateOrderStatus: (id: string, status: string, trackingCode?: string) =>
    request<{ ok: true }>(`/orders/${id}/status`, { method: 'PATCH', json: { status, trackingCode } }),
  products: (search?: string) =>
    request<{ products: unknown[] }>(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createProduct: (body: Record<string, unknown>) =>
    request<{ ok: true }>('/products', { method: 'POST', json: body }),
  adjustStock: (id: string, type: 'ENTRADA' | 'SAIDA', quantity: number) =>
    request<{ ok: true }>(`/products/${id}/stock`, { method: 'POST', json: { type, quantity } }),
  deleteProduct: (id: string) => request<{ ok: true }>(`/products/${id}`, { method: 'DELETE' }),
  financeSummary: () => request<FinanceSummary>('/finance/summary'),
  financeList: () => request<{ entries: unknown[] }>('/finance'),
  createFinance: (body: Record<string, unknown>) =>
    request<{ ok: true }>('/finance', { method: 'POST', json: body }),
  importControleVendas: (fileBase64: string, fileName: string) =>
    request<ImportControleVendasResult>('/imports/controle-vendas', {
      method: 'POST',
      json: { fileBase64, fileName },
    }),
  sales: (q: Record<string, string> = {}) => {
    const qs = new URLSearchParams(q).toString();
    return request<SalesResponse>(`/sales${qs ? `?${qs}` : ''}`);
  },
  deliveries: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<{ deliveries: DeliveryRow[] }>(`/purchasing/deliveries${qs}`);
  },
  createDelivery: (body: {
    supplierName?: string;
    status?: 'PEDIDO' | 'ENTREGA';
    lines: Array<{ description: string; quantity: number; unitCost?: number; productId?: string }>;
  }) => request<{ ok: true; id: string }>('/purchasing/deliveries', { method: 'POST', json: body }),
  confirmDelivery: (id: string) =>
    request<{ ok: true }>(`/purchasing/deliveries/${id}/confirm`, { method: 'POST' }),
  reorderSuggestions: (q: Record<string, string> = {}) => {
    const qs = new URLSearchParams(q).toString();
    return request<ReorderResponse>(`/purchasing/suggestions${qs ? `?${qs}` : ''}`);
  },
  financeAllocations: (month?: string) => {
    const qs = month ? `?month=${encodeURIComponent(month)}` : '';
    return request<FinanceAllocationsResponse>(`/finance/allocations${qs}`);
  },
  stockOverview: (search?: string) =>
    request<{ rows: StockOverviewRow[] }>(
      `/products/stock-overview${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),
};

export type SaleRow = {
  id: string;
  orderId: string;
  date: string;
  account: AccountCode;
  quantity: number;
  sku: string;
  description: string;
  customer: string | null;
  netRevenue: number;
  grossRevenue: number;
  productCost: number;
  taxAmount: number;
  grossProfit: number;
  marginPercent: number;
  belowTarget: boolean;
  status: string;
};

export type SalesResponse = {
  account: AccountCode;
  settings: {
    ratePercent: number;
    targetMarginPercent: number;
  };
  rows: SaleRow[];
  totals: {
    grossRevenue: number;
    netRevenue: number;
    productCost: number;
    grossProfit: number;
    units: number;
    marginPercent: number;
    count: number;
    belowTarget: number;
  };
};

export type MarginSettings = {
  account: AccountCode;
  ratePercent: number;
  targetMarginPercent: number;
};

export type ImportControleVendasResult = {
  ok: true;
  importId: string;
  productsUpserted: number;
  kitsUpserted: number;
  taxRatesUpserted: number;
  salesImported: number;
  salesSkipped: number;
  stockUpdated: number;
  deliveriesImported: number;
  financeImported: number;
};

export type DeliveryRow = {
  id: string;
  supplierName: string | null;
  status: 'PEDIDO' | 'ENTREGA';
  stockApplied: boolean;
  orderedAt: string | null;
  deliveredAt: string | null;
  lines: Array<{
    id: string;
    description: string;
    quantity: unknown;
    unitCost: unknown;
    product?: { sku: string; name: string } | null;
  }>;
};

export type ReorderRow = {
  productId: string;
  description: string;
  sku: string;
  soldInPeriod: number;
  accountStock: number;
  totalStock: number;
  suggestion: number | null;
  suggestionLabel: string;
};

export type ReorderResponse = {
  account: AccountCode;
  from: string;
  to: string;
  rows: ReorderRow[];
};

export type FinanceAllocationsResponse = {
  account: AccountCode;
  months: string[];
  rows: Array<{
    id: string;
    monthLabel: string;
    category: string;
    description: string;
    amount: number;
    ratePcp: number;
    rateRc: number;
    ratePp: number;
    accountAmount: number;
  }>;
  totals: { total: number; fixos: number; variaveis: number };
};

export type StockOverviewRow = {
  id: string;
  sku: string;
  name: string;
  pcp: number;
  rc: number;
  pp: number;
  total: number;
};

export type HubAccount = {
  id: string;
  code: AccountCode;
  name: string;
  cnpj: string | null;
  active: boolean;
  isSelected: boolean;
  ratePercent?: number;
  targetMarginPercent?: number;
  stock: { skus: number; low: number; zerado: number };
};

export type DashboardData = {
  account: { code: string; name: string; cnpj: string | null };
  cards: Record<string, number>;
  salesByDay: Array<{ date: string; total: number }>;
  topProducts: Array<{ name: string; qty: number }>;
  stockChart: Array<{ name: string; value: number }>;
  recentOrders: unknown[];
};

export type FinanceSummary = {
  accountCode: string;
  entradas: number;
  saidas: number;
  lucro: number;
  aPagar: number;
  aReceber: number;
};
