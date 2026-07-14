import type { Role } from '@prisma/client';

export {
  orderStatusLabels,
  platformLabels,
  roleLabels,
  roleModuleAccess,
} from '@/lib/labels';

export function canAccess(role: Role, module: string): boolean {
  if (role === 'ADMIN') return true;
  const map: Record<string, Role[]> = {
    dashboard: ['ADMIN', 'FINANCEIRO', 'EXPEDICAO', 'ESTOQUE'],
    pedidos: ['ADMIN', 'EXPEDICAO', 'FINANCEIRO'],
    expedicao: ['ADMIN', 'EXPEDICAO'],
    estoque: ['ADMIN', 'ESTOQUE'],
    nfe: ['ADMIN', 'ESTOQUE'],
    compras: ['ADMIN', 'ESTOQUE', 'FINANCEIRO'],
    financeiro: ['ADMIN', 'FINANCEIRO'],
    fornecedores: ['ADMIN', 'ESTOQUE', 'FINANCEIRO'],
    clientes: ['ADMIN', 'FINANCEIRO', 'EXPEDICAO'],
    relatorios: ['ADMIN', 'FINANCEIRO', 'ESTOQUE'],
    configuracoes: ['ADMIN'],
    usuarios: ['ADMIN'],
    integracoes: ['ADMIN'],
  };
  return (map[module] ?? []).includes(role);
}
