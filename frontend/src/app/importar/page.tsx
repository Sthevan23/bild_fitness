'use client';

import { useState } from 'react';
import { api, type ImportControleVendasResult, type ImportMlVendasResult } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function ImportarPlanilhaPage() {
  const { code } = useAppAuth();
  const [busy, setBusy] = useState(false);
  const [mlResult, setMlResult] = useState<ImportMlVendasResult | null>(null);
  const [legacyResult, setLegacyResult] = useState<ImportControleVendasResult | null>(null);

  async function onMlFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMlResult(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await api.importMlVendas(fileBase64, file.name);
      setMlResult(res);
      toast.success(
        `Import ML OK · conta ${res.accountCode} · ${res.salesImported} novas · ${res.salesUpdated} atualizadas`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na importação ML');
    } finally {
      setBusy(false);
    }
  }

  async function onLegacyFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setLegacyResult(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await api.importControleVendas(fileBase64, file.name);
      setLegacyResult(res);
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
        <h1 className="text-2xl font-semibold">Importar</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Export diário Mercado Livre · estoque na conta ativa{' '}
          <b>{code}</b> · <Link href="/contas/">trocar conta</Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export diário Mercado Livre (Vendas BR)</CardTitle>
          <CardDescription>
            Baixe o relatório de vendas no ML e envie o .xlsx. Pedidos, clientes (CPF) e baixa de
            estoque na conta <b>{code}</b>. Reimportar o mesmo arquivo não duplica vendas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            id="ml-file"
            type="file"
            accept=".xlsx,.xls"
            disabled={busy}
            onChange={(e) => onMlFile(e.target.files?.[0] || null)}
            className="block w-full text-sm"
          />
          <Button disabled={busy} onClick={() => document.getElementById('ml-file')?.click()}>
            {busy ? 'Importando…' : 'Selecionar Vendas BR'}
          </Button>
        </CardContent>
      </Card>

      {mlResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado ML</CardTitle>
            <CardDescription>
              ID {mlResult.importId} · conta {mlResult.accountCode}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              Novas: <b>{mlResult.salesImported}</b>
            </p>
            <p>
              Atualizadas: <b>{mlResult.salesUpdated}</b>
            </p>
            <p>
              Ignoradas: <b>{mlResult.salesSkipped}</b>
            </p>
            <p>
              Produtos criados: <b>{mlResult.productsCreated}</b>
            </p>
            <p>
              Clientes: <b>{mlResult.customersUpserted}</b>
            </p>
            <p>
              Baixas de estoque: <b>{mlResult.stockMovements}</b>
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Controle de Vendas (legado)</CardTitle>
          <CardDescription>
            Planilha multi-aba antiga (Dados / Dados_ML / ESTOQUE). Opcional — use só se ainda
            precisar desse formato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            id="legacy-file"
            type="file"
            accept=".xlsx,.xls"
            disabled={busy}
            onChange={(e) => onLegacyFile(e.target.files?.[0] || null)}
            className="block w-full text-sm"
          />
          <Button
            disabled={busy}
            variant="secondary"
            onClick={() => document.getElementById('legacy-file')?.click()}
          >
            Selecionar Controle de Vendas
          </Button>
        </CardContent>
      </Card>

      {legacyResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado legado</CardTitle>
            <CardDescription>ID {legacyResult.importId}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              Produtos: <b>{legacyResult.productsUpserted}</b>
            </p>
            <p>
              Alíquotas: <b>{legacyResult.taxRatesUpserted}</b>
            </p>
            <p>
              Vendas ML: <b>{legacyResult.salesImported}</b>
            </p>
            <p>
              Vendas ignoradas: <b>{legacyResult.salesSkipped}</b>
            </p>
            <p>
              Estoques atualizados: <b>{legacyResult.stockUpdated}</b>
            </p>
            <p>
              Entregas: <b>{legacyResult.deliveriesImported}</b>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
