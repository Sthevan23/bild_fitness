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
    request<{ ok: true }>(`/accounts/${code}`, { method: 'PATCH', json: body }),
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
  mlStatus: () => request<MlStatus>('/marketplace/mercadolivre/status'),
  mlConnect: (accountCode?: AccountCode) =>
    request<{ url: string }>('/marketplace/mercadolivre/connect', {
      method: 'POST',
      json: { accountCode },
    }),
  mlDisconnect: (accountCode?: AccountCode) =>
    request<{ ok: true }>('/marketplace/mercadolivre/disconnect', {
      method: 'POST',
      json: { accountCode },
    }),
  mlSync: () => request<{ ok: true; result: unknown }>('/marketplace/mercadolivre/sync', { method: 'POST' }),
};

export type HubAccount = {
  id: string;
  code: AccountCode;
  name: string;
  cnpj: string | null;
  active: boolean;
  isSelected: boolean;
  ml: {
    status: string;
    nickname: string | null;
    sellerId: string | null;
    lastSyncAt: string | null;
    lastSyncError: string | null;
  } | null;
  stock: { skus: number; low: number; zerado: number };
};

export type DashboardData = {
  account: { code: string; name: string; cnpj: string | null };
  cards: Record<string, number>;
  marketplace: {
    mlStatus: string;
    mlNickname: string | null;
    lastSyncAt: string | null;
    lastSyncError: string | null;
  };
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

export type MlStatus = {
  configured: boolean;
  account: { code: AccountCode; name: string; cnpj: string | null };
  connection: {
    status: string;
    nickname: string | null;
    sellerId: string | null;
    lastSyncAt: string | null;
    lastSyncError: string | null;
  } | null;
};
