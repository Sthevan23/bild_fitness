'use client';

import { useState } from 'react';
import { api, type ImportControleVendasResult } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ImportarPlanilhaPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportControleVendasResult | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const fileBase64 = btoa(binary);
      const res = await api.importControleVendas(fileBase64, file.name);
      setResult(res);
      toast.success(`Importação OK · ${res.salesImported} vendas · ${res.productsUpserted} produtos`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na importação');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar planilha</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Controle de Vendas V2 · contas P&amp;P / RC / PCP · histórico incluído
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arquivo Excel</CardTitle>
          <CardDescription>
            Envie a planilha do cliente. O sistema importa Dados (cadastro/kits/alíquotas), Dados_ML
            (vendas), ESTOQUE e ENTREGAS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0] || null)}
            className="block w-full text-sm"
          />
          <Button disabled={busy} variant="secondary" onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
            {busy ? 'Importando…' : 'Selecionar arquivo'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>ID {result.importId}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>Produtos: <b>{result.productsUpserted}</b></p>
            <p>Kits: <b>{result.kitsUpserted}</b></p>
            <p>Alíquotas: <b>{result.taxRatesUpserted}</b></p>
            <p>Vendas ML: <b>{result.salesImported}</b></p>
            <p>Vendas ignoradas: <b>{result.salesSkipped}</b></p>
            <p>Estoques atualizados: <b>{result.stockUpdated}</b></p>
            <p>Entregas: <b>{result.deliveriesImported}</b></p>
            <p>Financeiro: <b>{result.financeImported}</b></p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
