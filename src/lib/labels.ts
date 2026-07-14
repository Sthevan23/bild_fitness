import type { OrderStatus, Platform, Role } from '@prisma/client';
import type { BadgeProps } from '@/components/ui/badge';

export const orderStatusLabels = {
  AGUARDANDO: 'Aguardando',
  SEPARANDO: 'Separando',
  ENVIADO: 'Enviado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
} as const;

export const orderStatusVariant: Record<OrderStatus, BadgeProps['variant']> = {
  AGUARDANDO: 'warning',
  SEPARANDO: 'info',
  ENVIADO: 'violet',
  ENTREGUE: 'success',
  CANCELADO: 'destructive',
};

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  FINANCEIRO: 'Financeiro',
  EXPEDICAO: 'Expedição',
  ESTOQUE: 'Estoque',
};

export const roleVariant: Record<Role, BadgeProps['variant']> = {
  ADMIN: 'violet',
  FINANCEIRO: 'info',
  EXPEDICAO: 'warning',
  ESTOQUE: 'success',
};

export const platformLabels = {
  MERCADO_LIVRE: 'Mercado Livre',
  SHOPEE: 'Shopee',
  WHATSAPP: 'WhatsApp',
  LOJA: 'Loja própria',
} as const;

export const platformVariant: Record<Platform, BadgeProps['variant']> = {
  MERCADO_LIVRE: 'warning',
  SHOPEE: 'orange',
  WHATSAPP: 'success',
  LOJA: 'info',
};

export type PaymentKind = 'PIX' | 'CARTAO' | 'DINHEIRO' | 'TRANSFERENCIA' | 'BOLETO' | 'OUTRO';

export function normalizePayment(method?: string | null): { kind: PaymentKind; label: string } {
  if (!method?.trim()) return { kind: 'OUTRO', label: '—' };
  const raw = method.trim();
  const key = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (key.includes('PIX')) return { kind: 'PIX', label: raw };
  if (key.includes('CARTAO') || key.includes('CREDITO') || key.includes('DEBITO'))
    return { kind: 'CARTAO', label: raw };
  if (key.includes('DINHEIRO') || key.includes('CASH')) return { kind: 'DINHEIRO', label: raw };
  if (key.includes('TRANSFEREN') || key.includes('TED') || key.includes('DOC'))
    return { kind: 'TRANSFERENCIA', label: raw };
  if (key.includes('BOLETO')) return { kind: 'BOLETO', label: raw };
  return { kind: 'OUTRO', label: raw };
}

/** Módulos por papel — usado na tela de usuários */
export const roleModuleAccess: Record<Role, string[]> = {
  ADMIN: [
    'Dashboard',
    'Pedidos',
    'Expedição',
    'Estoque',
    'NF-e',
    'Compras',
    'Financeiro',
    'Clientes',
    'Fornecedores',
    'Relatórios',
    'Usuários',
    'Integrações',
    'Configurações',
  ],
  FINANCEIRO: ['Dashboard', 'Pedidos', 'Compras', 'Financeiro', 'Clientes', 'Fornecedores', 'Relatórios'],
  EXPEDICAO: ['Dashboard', 'Pedidos', 'Expedição', 'Clientes'],
  ESTOQUE: ['Dashboard', 'Estoque', 'NF-e', 'Compras', 'Fornecedores', 'Relatórios'],
};
