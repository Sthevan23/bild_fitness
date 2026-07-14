'use client';

import { usePathname } from 'next/navigation';

const labels: Record<string, string> = {
  dashboard: 'Dashboard',
  pedidos: 'Pedidos',
  expedicao: 'Expedição',
  estoque: 'Estoque',
  'importar-nfe': 'Importar NF-e',
  'lista-compras': 'Lista de Compras',
  financeiro: 'Financeiro',
  fornecedores: 'Fornecedores',
  clientes: 'Clientes',
  relatorios: 'Relatórios',
  integracoes: 'Integrações',
  usuarios: 'Usuários',
  configuracoes: 'Configurações',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'dashboard';
  return (
    <div className="text-sm text-muted-foreground">
      <span>Bild Fitness</span>
      <span className="mx-2">/</span>
      <span className="font-medium text-foreground">{labels[segment] ?? segment}</span>
    </div>
  );
}
