'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type DashboardData } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { code } = useAppAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro dashboard'));
  }, [code]);

  if (!data) return <p className="text-sm text-[var(--muted-foreground)]">Carregando dashboard…</p>;

  const stats = [
    ['Pedidos hoje', String(data.cards.ordersToday)],
    ['Vendas hoje', formatCurrency(data.cards.soldToday)],
    ['Lucro (mês)', formatCurrency(data.cards.lucro)],
    ['Pendentes', String(data.cards.pending)],
    ['Enviados', String(data.cards.shipped)],
    ['Estoque baixo', String(data.cards.lowStock)],
    ['Em estoque', String(Math.round(data.cards.stockUnits))],
    ['SKUs', String(data.cards.productCount)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard · {data.account.code}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Controle da conta {data.account.name}
          {data.account.cnpj ? ` · ${data.account.cnpj}` : ''} ·{' '}
          <Link href="/contas/" className="text-[var(--primary)] underline-offset-2 hover:underline">
            trocar conta
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--muted-foreground)]">ML:</span>
          {data.marketplace.mlStatus === 'CONNECTED' ? (
            <Badge variant="success">{data.marketplace.mlNickname || 'conectado'}</Badge>
          ) : (
            <Badge variant="destructive">desconectado</Badge>
          )}
          <span className="text-[var(--muted-foreground)]">
            Sync: {data.marketplace.lastSyncAt ? formatDate(data.marketplace.lastSyncAt) : 'nunca'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
              <p className="text-xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top produtos (30d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.topProducts.length === 0 && <p className="text-[var(--muted-foreground)]">Sem vendas</p>}
            {data.topProducts.map((p) => (
              <div key={p.name} className="flex justify-between border-b py-1 last:border-0">
                <span>{p.name}</span>
                <b>{Math.round(p.qty)}</b>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estoque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.stockChart.map((s) => (
              <div key={s.name} className="flex justify-between border-b py-1 last:border-0">
                <span>{s.name}</span>
                <b>{s.value}</b>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
