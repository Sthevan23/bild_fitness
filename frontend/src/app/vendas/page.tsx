'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type SalesResponse } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const PERIODS = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7', label: '7d' },
  { id: '30', label: '30d' },
  { id: '90', label: '90d' },
  { id: 'all', label: 'Tudo' },
];

function marginTone(m: number) {
  if (m <= 0) return 'text-red-600';
  if (m < 10) return 'text-amber-600';
  return 'text-emerald-600';
}

export default function VendasPage() {
  const { code } = useAppAuth();
  const [data, setData] = useState<SalesResponse | null>(null);
  const [period, setPeriod] = useState('30');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    api
      .sales({ period, ...(search ? { search } : {}) })
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, period]);

  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Vendas · {code}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Lista de vendas com lucro e margem · <Link href="/importar/">importar planilha</Link>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={period === p.id ? 'default' : 'outline'}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </Button>
        ))}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SKU, cliente…"
            className="h-9 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm"
          />
          <Button size="sm" variant="secondary" type="submit">
            Buscar
          </Button>
        </form>
      </div>

      {totals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Vendas" value={String(totals.count)} />
          <SummaryCard label="Unidades" value={String(totals.units)} />
          <SummaryCard label="Receita bruta" value={formatCurrency(totals.grossRevenue)} />
          <SummaryCard label="Lucro bruto" value={formatCurrency(totals.grossProfit)} />
          <SummaryCard label="Margem" value={`${totals.marginPercent.toFixed(1)}%`} />
        </div>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Cliente</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3 text-right">Líquido</th>
                <th className="p-3 text-right">Venda</th>
                <th className="p-3 text-right">Custo</th>
                <th className="p-3 text-right">Lucro</th>
                <th className="p-3 text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)]/50">
                  <td className="p-3 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="p-3 font-mono text-xs">{r.sku}</td>
                  <td className="p-3 max-w-[280px] truncate" title={r.description}>
                    {r.description}
                  </td>
                  <td className="p-3">{r.customer || '—'}</td>
                  <td className="p-3 text-right">{r.quantity}</td>
                  <td className="p-3 text-right">{formatCurrency(r.netRevenue)}</td>
                  <td className="p-3 text-right">{formatCurrency(r.grossRevenue)}</td>
                  <td className="p-3 text-right">{formatCurrency(r.productCost)}</td>
                  <td className="p-3 text-right">{formatCurrency(r.grossProfit)}</td>
                  <td className={`p-3 text-right font-medium ${marginTone(r.marginPercent)}`}>
                    {r.marginPercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
              {!loading && !data?.rows.length && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-[var(--muted-foreground)]">
                    Nenhuma venda no período. Importe a planilha ou sincronize o Mercado Livre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
