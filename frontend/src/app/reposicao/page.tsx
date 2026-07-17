'use client';

import { useEffect, useState } from 'react';
import { api, type ReorderResponse } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ReposicaoPage() {
  const { code } = useAppAuth();
  const [data, setData] = useState<ReorderResponse | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  function load() {
    api
      .reorderSuggestions({ from, to })
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Sugestão de pedido · {code}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Mesma regra da aba PEDIDOS: se estoque da conta ≤ vendido no período, sugere reposição
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          De
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm">
          Até
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
        </label>
        <Button onClick={load}>Atualizar</Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="p-3">Descrição</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-right">Vendido</th>
                <th className="p-3 text-right">Estoque conta</th>
                <th className="p-3 text-right">Estoque total</th>
                <th className="p-3 text-right">Sugestão</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => (
                <tr key={r.productId} className="border-b border-[var(--border)]/50">
                  <td className="p-3">{r.description}</td>
                  <td className="p-3 font-mono text-xs">{r.sku}</td>
                  <td className="p-3 text-right">{r.soldInPeriod}</td>
                  <td className={`p-3 text-right ${r.accountStock < 0 ? 'text-red-600' : ''}`}>
                    {r.accountStock}
                  </td>
                  <td className="p-3 text-right">{r.totalStock}</td>
                  <td
                    className={`p-3 text-right font-medium ${
                      r.suggestion != null ? 'text-amber-600' : 'text-[var(--muted-foreground)]'
                    }`}
                  >
                    {r.suggestionLabel}
                  </td>
                </tr>
              ))}
              {!data?.rows.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--muted-foreground)]">
                    Nenhuma sugestão no período.
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
