'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type SalesResponse } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Settings2 } from 'lucide-react';

const PERIODS = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7', label: '7d' },
  { id: '30', label: '30d' },
  { id: '90', label: '90d' },
  { id: 'all', label: 'Tudo' },
];

function marginTone(m: number, target: number) {
  if (m <= 0) return 'text-red-600';
  if (m < target) return 'text-amber-600';
  return 'text-emerald-600';
}

export default function VendasPage() {
  const { code } = useAppAuth();
  const [data, setData] = useState<SalesResponse | null>(null);
  const [period, setPeriod] = useState('30');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ratePercent, setRatePercent] = useState('0');
  const [targetMargin, setTargetMargin] = useState('15');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .sales({ period, ...(search ? { search } : {}) })
      .then((res) => {
        setData(res);
        setRatePercent(String(res.settings?.ratePercent ?? 0));
        setTargetMargin(String(res.settings?.targetMarginPercent ?? 15));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, period]);

  async function saveSettings() {
    const rate = Number(ratePercent.replace(',', '.'));
    const target = Number(targetMargin.replace(',', '.'));
    if (Number.isNaN(rate) || Number.isNaN(target)) {
      toast.error('Informe valores numéricos válidos');
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateMarginSettings({
        ratePercent: rate,
        targetMarginPercent: target,
        recalculate: true,
      });
      toast.success(
        `Margem salva · ${res.recalculated} vendas recalculadas (alíquota ${rate}% · meta ${target}%)`,
      );
      setShowSettings(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const totals = data?.totals;
  const target = data?.settings?.targetMarginPercent ?? 15;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            Comercial
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Vendas · {code}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Lucro e margem por venda ·{' '}
            <Link href="/importar/" className="font-medium text-[var(--primary)] hover:underline">
              importar planilha
            </Link>
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowSettings((v) => !v)}>
          <Settings2 className="size-4" />
          Configurar margem
        </Button>
      </div>

      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Margem de lucro · {code}</CardTitle>
            <CardDescription>
              Alíquota entra no cálculo do lucro (como na planilha). Meta de margem destaca vendas abaixo do
              esperado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Alíquota da conta (%)</span>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
                placeholder="Ex.: 11.21"
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                Lucro = líquido − custo − (venda × alíquota)
              </span>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Meta de margem (%)</span>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={targetMargin}
                onChange={(e) => setTargetMargin(e.target.value)}
                placeholder="Ex.: 15"
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                Vendas abaixo disso aparecem em amarelo/vermelho
              </span>
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar e recalcular vendas'}
              </Button>
              <Button variant="secondary" onClick={() => setShowSettings(false)}>
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SKU, cliente…"
            className="h-8 w-48"
          />
          <Button size="sm" variant="secondary" type="submit">
            Buscar
          </Button>
        </form>
        {data?.settings && (
          <div className="ml-auto flex flex-wrap gap-2 text-xs">
            <Badge variant="info">Alíquota {data.settings.ratePercent}%</Badge>
            <Badge variant="secondary">Meta margem {data.settings.targetMarginPercent}%</Badge>
          </div>
        )}
      </div>

      {totals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <SummaryCard label="Vendas" value={String(totals.count)} />
          <SummaryCard label="Unidades" value={String(totals.units)} />
          <SummaryCard label="Receita bruta" value={formatCurrency(totals.grossRevenue)} />
          <SummaryCard label="Lucro bruto" value={formatCurrency(totals.grossProfit)} />
          <SummaryCard label="Margem média" value={`${totals.marginPercent.toFixed(1)}%`} />
          <SummaryCard
            label="Abaixo da meta"
            value={String(totals.belowTarget ?? 0)}
            warn={(totals.belowTarget ?? 0) > 0}
          />
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/60 text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="p-3.5 font-medium">Data</th>
                <th className="p-3.5 font-medium">SKU</th>
                <th className="p-3.5 font-medium">Descrição</th>
                <th className="p-3.5 font-medium">Cliente</th>
                <th className="p-3.5 text-right font-medium">Qtd</th>
                <th className="p-3.5 text-right font-medium">Líquido</th>
                <th className="p-3.5 text-right font-medium">Venda</th>
                <th className="p-3.5 text-right font-medium">Custo</th>
                <th className="p-3.5 text-right font-medium">Lucro</th>
                <th className="p-3.5 text-right font-medium">Margem</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-[var(--border)]/60 transition hover:bg-[var(--muted)]/40 ${
                    r.belowTarget ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <td className="whitespace-nowrap p-3.5">{formatDate(r.date)}</td>
                  <td className="p-3.5 font-mono text-xs font-medium text-[var(--primary)]">{r.sku}</td>
                  <td className="max-w-[280px] truncate p-3.5" title={r.description}>
                    {r.description}
                  </td>
                  <td className="p-3.5">{r.customer || '—'}</td>
                  <td className="p-3.5 text-right tabular-nums">{r.quantity}</td>
                  <td className="p-3.5 text-right tabular-nums">{formatCurrency(r.netRevenue)}</td>
                  <td className="p-3.5 text-right tabular-nums">{formatCurrency(r.grossRevenue)}</td>
                  <td className="p-3.5 text-right tabular-nums">{formatCurrency(r.productCost)}</td>
                  <td className="p-3.5 text-right tabular-nums font-medium">
                    {formatCurrency(r.grossProfit)}
                  </td>
                  <td className="p-3.5 text-right">
                    <span
                      className={`inline-flex min-w-[4.5rem] items-center justify-end rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                        r.marginPercent <= 0
                          ? 'bg-red-100 text-red-700'
                          : r.belowTarget
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      } ${marginTone(r.marginPercent, target)}`}
                    >
                      {r.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && !data?.rows.length && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[var(--muted-foreground)]">
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

function SummaryCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          {label}
        </p>
        <p
          className={`mt-1.5 text-xl font-semibold tracking-tight tabular-nums ${
            warn ? 'text-amber-600' : ''
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
