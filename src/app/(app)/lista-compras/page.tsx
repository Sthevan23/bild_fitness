'use client';

import { useState } from 'react';
import { getPurchaseList } from '@/actions/purchases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import * as XLSX from 'xlsx';

type Row = Awaited<ReturnType<typeof getPurchaseList>>[number];

export default function ListaComprasPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function calc() {
    setLoading(true);
    setRows(await getPurchaseList(from, to));
    setLoading(false);
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        SKU: r.sku,
        Produto: r.name,
        Categoria: r.category,
        Vendido: r.vendido,
        Estoque: r.estoque,
        Comprar: r.necessario,
        Unidade: r.unit,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, `lista-compras-${from}_${to}.xlsx`);
  }

  function exportCsv() {
    const header = 'SKU;Produto;Vendido;Estoque;Comprar\n';
    const body = rows
      .map((r) => `${r.sku};${r.name};${r.vendido};${r.estoque};${r.necessario}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lista-compras-${from}_${to}.csv`;
    a.click();
  }

  function printList() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Lista de Compras</h1>
        <p className="text-sm text-muted-foreground">
          Calcula o que comprar com base nas vendas do período vs estoque atual
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">De</p>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Até</p>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={calc} disabled={loading}>{loading ? 'Calculando...' : 'Calcular'}</Button>
          <Button variant="outline" onClick={exportExcel} disabled={!rows.length}>Excel</Button>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>CSV</Button>
          <Button variant="outline" onClick={printList} disabled={!rows.length}>Imprimir / PDF</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.filter((r) => r.necessario > 0).length} itens para comprar
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2">SKU</th>
                <th className="py-2">Produto</th>
                <th className="py-2">Vendido</th>
                <th className="py-2">Estoque</th>
                <th className="py-2">Necessário comprar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 font-mono text-xs">{r.sku}</td>
                  <td className="py-2">{r.name}</td>
                  <td className="py-2">{formatNumber(r.vendido)}</td>
                  <td className="py-2">{formatNumber(r.estoque)}</td>
                  <td className="py-2 font-semibold text-primary">
                    {formatNumber(r.necessario)} {r.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
