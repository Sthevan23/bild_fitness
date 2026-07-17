'use client';

import { useEffect, useState } from 'react';
import { api, type FinanceAllocationsResponse, type FinanceSummary } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function FinanceiroPage() {
  const { code } = useAppAuth();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [allocations, setAllocations] = useState<FinanceAllocationsResponse | null>(null);
  const [month, setMonth] = useState('');
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState<'fluxo' | 'rateio'>('fluxo');

  function load() {
    api
      .financeSummary()
      .then(setSummary)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'));
    api
      .financeAllocations(month || undefined)
      .then((r) => {
        setAllocations(r);
        if (!month && r.months.length) setMonth(r.months[0]);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (tab === 'rateio') {
      api
        .financeAllocations(month || undefined)
        .then(setAllocations)
        .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, tab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financeiro · {code}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Fluxo e rateio de custos por conta</p>
        </div>
        <Button onClick={() => setShow(true)}>Novo lançamento</Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === 'fluxo' ? 'default' : 'outline'} onClick={() => setTab('fluxo')}>
          Fluxo
        </Button>
        <Button size="sm" variant={tab === 'rateio' ? 'default' : 'outline'} onClick={() => setTab('rateio')}>
          Rateio (planilha)
        </Button>
      </div>

      {tab === 'fluxo' && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ['Entradas', summary?.entradas],
            ['Saídas', summary?.saidas],
            ['Lucro', summary?.lucro],
            ['A pagar', summary?.aPagar],
            ['A receber', summary?.aReceber],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardContent className="pt-5">
                <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
                <p className="text-lg font-semibold">{formatCurrency(Number(value || 0))}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'rateio' && (
        <>
          <div className="flex flex-wrap gap-2">
            {(allocations?.months || []).map((m) => (
              <Button key={m} size="sm" variant={month === m ? 'default' : 'outline'} onClick={() => setMonth(m)}>
                {m}
              </Button>
            ))}
          </div>
          {allocations && (
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-[var(--muted-foreground)]">Total {code}</p>
                  <p className="text-lg font-semibold">{formatCurrency(allocations.totals.total)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-[var(--muted-foreground)]">Fixos</p>
                  <p className="text-lg font-semibold">{formatCurrency(allocations.totals.fixos)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-[var(--muted-foreground)]">Variáveis</p>
                  <p className="text-lg font-semibold">{formatCurrency(allocations.totals.variaveis)}</p>
                </CardContent>
              </Card>
            </div>
          )}
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-[var(--muted-foreground)]">
                  <tr>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Valor total</th>
                    <th className="p-3 text-right">Rateio {code}</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations?.rows
                    .filter((r) => !month || r.monthLabel === month)
                    .map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border)]/50">
                        <td className="p-3 text-xs">{r.category}</td>
                        <td className="p-3">{r.description}</td>
                        <td className="p-3 text-right">{formatCurrency(r.amount)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(r.accountAmount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {show && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-4">
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  await api.createFinance({
                    type: fd.get('type'),
                    description: fd.get('description'),
                    amount: Number(fd.get('amount')),
                    status: fd.get('status'),
                    category: fd.get('category'),
                  });
                  toast.success('Lançamento criado');
                  setShow(false);
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erro');
                }
              }}
            >
              <select name="type" className="h-10 w-full rounded-md border px-2" defaultValue="ENTRADA">
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </select>
              <Input name="description" placeholder="Descrição" required />
              <Input name="amount" type="number" step="0.01" placeholder="Valor" required />
              <Input name="category" placeholder="Categoria" />
              <select name="status" className="h-10 w-full rounded-md border px-2" defaultValue="PENDENTE">
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
                <option value="RECEBIDO">Recebido</option>
              </select>
              <div className="flex gap-2">
                <Button type="submit">Salvar</Button>
                <Button type="button" variant="secondary" onClick={() => setShow(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
