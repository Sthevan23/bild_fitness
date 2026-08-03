'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type DashboardData } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Clock3,
  Truck,
  AlertTriangle,
  Boxes,
  Tags,
} from 'lucide-react';

const STAT_META = [
  { key: 'Pedidos hoje', icon: Package, tone: 'text-emerald-700 bg-emerald-50' },
  { key: 'Vendas hoje', icon: ShoppingBag, tone: 'text-sky-700 bg-sky-50' },
  { key: 'Lucro (mês)', icon: TrendingUp, tone: 'text-violet-700 bg-violet-50' },
  { key: 'Pendentes', icon: Clock3, tone: 'text-amber-700 bg-amber-50' },
  { key: 'Enviados', icon: Truck, tone: 'text-teal-700 bg-teal-50' },
  { key: 'Estoque baixo', icon: AlertTriangle, tone: 'text-rose-700 bg-rose-50' },
  { key: 'Em estoque', icon: Boxes, tone: 'text-slate-700 bg-slate-100' },
  { key: 'SKUs', icon: Tags, tone: 'text-indigo-700 bg-indigo-50' },
] as const;

export default function DashboardPage() {
  const { code } = useAppAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro dashboard'));
  }, [code]);

  if (!data) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <p className="text-sm text-[var(--muted-foreground)]">Carregando dashboard…</p>
      </div>
    );
  }

  const stats = [
    ['Pedidos hoje', String(data.cards.ordersToday)],
    ['Vendas hoje', formatCurrency(data.cards.soldToday)],
    ['Lucro (mês)', formatCurrency(data.cards.lucro)],
    ['Pendentes', String(data.cards.pending)],
    ['Enviados', String(data.cards.shipped)],
    ['Estoque baixo', String(data.cards.lowStock)],
    ['Em estoque', String(Math.round(data.cards.stockUnits))],
    ['SKUs', String(data.cards.productCount)],
  ] as const;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            Visão geral
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard · {data.account.code}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Controle da conta {data.account.name}
            {data.account.cnpj ? ` · ${data.account.cnpj}` : ''} ·{' '}
            <Link href="/contas/" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
              trocar conta
            </Link>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value], i) => {
          const meta = STAT_META[i];
          const Icon = meta.icon;
          return (
            <Card key={label} className="overflow-hidden">
              <CardContent className="relative pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
                  </div>
                  <div className={`rounded-xl p-2 ${meta.tone}`}>
                    <Icon className="size-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Top produtos (30d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.topProducts.length === 0 && (
              <p className="rounded-xl bg-[var(--muted)]/60 px-3 py-4 text-[var(--muted-foreground)]">
                Sem vendas no período
              </p>
            )}
            {data.topProducts.map((p, idx) => (
              <div
                key={p.name}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--muted)]/70"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-lg bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                    {idx + 1}
                  </span>
                  <span className="truncate">{p.name}</span>
                </div>
                <b className="tabular-nums">{Math.round(p.qty)}</b>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Estoque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.stockChart.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--muted)]/70"
              >
                <span className="truncate">{s.name}</span>
                <b className="tabular-nums">{s.value}</b>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
