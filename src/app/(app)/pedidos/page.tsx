'use client';

import { useEffect, useState, useTransition } from 'react';
import { listOrders, updateOrderStatus } from '@/actions/orders';
import {
  confirmAdiantarList,
  exportAdiantarText,
  previewAdiantarList,
  type AdiantarPreviewItem,
} from '@/actions/adiantar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PaymentLabel, PlatformBadge, StatusBadge } from '@/components/labels';
import { formatCurrency, formatDate, toNum, cn } from '@/lib/utils';
import { orderStatusLabels, orderStatusVariant, platformLabels } from '@/lib/labels';
import { toast } from 'sonner';
import type { OrderStatus, Platform } from '@prisma/client';

type OrderRow = Awaited<ReturnType<typeof listOrders>>[number];

const SAMPLE = `13/07/2026 BILD ML 2 Halter bola emborrachado 2 Kg Patricia Nazario
13/07/2026 BILD ML 1 Kettlebell Emborrachado 16 Kg
13/07/2026 BILD ML 2 Presilha lockpress 25mm (verde) Fabio Del Nero Muller`;

export default function PedidosPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [period, setPeriod] = useState('30');
  const [platform, setPlatform] = useState<Platform | 'ALL'>('ALL');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [pending, start] = useTransition();
  const [showAdiantar, setShowAdiantar] = useState(false);
  const [adiantarText, setAdiantarText] = useState('');
  const [preview, setPreview] = useState<AdiantarPreviewItem[] | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{ total: number; matched: number; errors: number } | null>(
    null,
  );
  const [importing, setImporting] = useState(false);

  function load() {
    start(async () => {
      const data = await listOrders({ period, platform, status, search });
      setOrders(data);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, platform, status]);

  async function changeStatus(id: string, st: OrderStatus) {
    const res = await updateOrderStatus(id, st);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Status atualizado');
      load();
      setSelected(null);
    }
  }

  async function onPreview() {
    setImporting(true);
    const res = await previewAdiantarList(adiantarText);
    setImporting(false);
    if ('error' in res) {
      toast.error(res.error);
      return;
    }
    setPreview(res.items);
    setPreviewSummary(res.summary);
  }

  async function onConfirmImport() {
    if (!preview) return;
    setImporting(true);
    const res = await confirmAdiantarList(preview);
    setImporting(false);
    if ('error' in res && res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`${res.created} pedido(s) criados no formato Adiantar`);
    setShowAdiantar(false);
    setPreview(null);
    setPreviewSummary(null);
    setAdiantarText('');
    load();
  }

  async function onExportAdiantar() {
    const res = await exportAdiantarText({
      period,
      platform: platform === 'MERCADO_LIVRE' || platform === 'ALL' ? (platform === 'ALL' ? 'ALL' : 'MERCADO_LIVRE') : 'MERCADO_LIVRE',
    });
    if (!res.text) {
      toast.error('Nenhum pedido para exportar no período');
      return;
    }
    const w = window.open('', '_blank');
    if (!w) {
      await navigator.clipboard.writeText(res.text);
      toast.success('Lista copiada (popup bloqueado)');
      return;
    }
    w.document.write(`<!doctype html><html><head><title>Controle de Vendas - Adiantar</title>
      <style>
        body{font-family:Consolas,monospace;font-size:13px;padding:24px;white-space:pre-wrap;line-height:1.45}
        h1{font-family:sans-serif;font-size:16px;margin:0 0 16px}
      </style></head><body>
      <h1>Controle de Vendas - Adiantar (${res.count} linhas)</h1>
      <div>${res.text.replace(/</g, '&lt;')}</div>
      <script>window.print()</script>
      </body></html>`);
    w.document.close();
  }

  function closeAdiantar() {
    setShowAdiantar(false);
    setPreview(null);
    setPreviewSummary(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Gestão de pedidos multiplataforma</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onExportAdiantar}>
            Imprimir lista Adiantar
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => setShowAdiantar(true)}>
            Importar lista ML
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              ['hoje', 'Hoje'],
              ['ontem', 'Ontem'],
              ['7', '7 dias'],
              ['15', '15 dias'],
              ['30', '30 dias'],
            ].map(([v, l]) => (
              <Button
                key={v}
                size="sm"
                className="shrink-0"
                variant={period === v ? 'default' : 'outline'}
                onClick={() => setPeriod(v)}
              >
                {l}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              className="h-11 w-full"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform | 'ALL')}
            >
              <option value="ALL">Todas plataformas</option>
              {Object.entries(platformLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              className="h-11 w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus | 'ALL')}
            >
              <option value="ALL">Todos status</option>
              {Object.entries(orderStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Input
              className="h-11 w-full sm:col-span-2 lg:col-span-1"
              placeholder="Buscar pedido, cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
            <Button className="h-11 w-full" variant="secondary" onClick={load} disabled={pending}>
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{orders.length} pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((o) => (
              <button
                key={o.id}
                type="button"
                className="w-full rounded-xl border bg-card p-3 text-left shadow-sm active:bg-muted/40"
                onClick={() => {
                  setSelected(o);
                  setNextStatus('');
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">#{o.number}</p>
                    <p className="truncate text-sm text-muted-foreground">{o.customer?.name ?? '—'}</p>
                  </div>
                  <p className="shrink-0 font-semibold">{formatCurrency(toNum(o.total))}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <PlatformBadge platform={o.platform} />
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(o.orderedAt)}</span>
                  <PaymentLabel method={o.paymentMethod} />
                </div>
              </button>
            ))}
            {orders.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido</p>
            )}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Nº</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Plataforma</th>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Pagamento</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">#{o.number}</td>
                    <td className="py-2 pr-3">{o.customer?.name ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <PlatformBadge platform={o.platform} />
                    </td>
                    <td className="py-2 pr-3">{formatDate(o.orderedAt)}</td>
                    <td className="py-2 pr-3">{formatCurrency(toNum(o.total))}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-2 pr-3">
                      <PaymentLabel method={o.paymentMethod} />
                    </td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(o);
                          setNextStatus('');
                        }}
                      >
                        Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Modal className="sm:max-w-lg" onClose={() => setSelected(null)}>
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl">Pedido #{selected.number}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(selected.orderedAt)}</p>
              </div>
              <StatusBadge status={selected.status} />
            </CardHeader>
            <CardContent className="space-y-4 pb-6 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-sky-700 dark:text-sky-300">Cliente</dt>
                  <dd className="font-medium">{selected.customer?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-violet-700 dark:text-violet-300">Plataforma</dt>
                  <dd>
                    <PlatformBadge platform={selected.platform} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Pagamento</dt>
                  <dd>
                    <PaymentLabel method={selected.paymentMethod} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-amber-700 dark:text-amber-300">Rastreio</dt>
                  <dd className="font-mono text-xs">{selected.trackingCode || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">Total</dt>
                  <dd className="text-lg font-semibold">{formatCurrency(toNum(selected.total))}</dd>
                </div>
              </dl>

              <div className="space-y-1 border-t pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Itens</p>
                {selected.items.map((i) => (
                  <div key={i.id} className="flex justify-between gap-2">
                    <span>
                      {i.product.name} × {toNum(i.quantity)}
                    </span>
                    <span>{formatCurrency(toNum(i.totalPrice))}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">Alterar status do pedido</p>
                <p className="text-xs text-muted-foreground">
                  Fluxo sugerido: Aguardando → Separando → Enviado → Entregue
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['AGUARDANDO', 'SEPARANDO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'] as OrderStatus[]).map(
                    (st) => {
                      const current = selected.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setNextStatus(st)}
                          className={cn(
                            'rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
                            current && 'ring-2 ring-offset-2 ring-offset-background',
                            nextStatus === st && !current && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                            orderStatusVariant[st] === 'warning' && 'border-amber-200 bg-amber-100 text-amber-800',
                            orderStatusVariant[st] === 'info' && 'border-sky-200 bg-sky-100 text-sky-800',
                            orderStatusVariant[st] === 'violet' && 'border-violet-200 bg-violet-100 text-violet-800',
                            orderStatusVariant[st] === 'success' && 'border-emerald-200 bg-emerald-100 text-emerald-800',
                            orderStatusVariant[st] === 'destructive' && 'border-red-200 bg-red-100 text-red-800',
                            current && 'opacity-100',
                            !current && nextStatus !== st && 'opacity-70 hover:opacity-100',
                          )}
                        >
                          {orderStatusLabels[st]}
                          {current ? ' · atual' : ''}
                        </button>
                      );
                    },
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 pt-1 sm:flex sm:flex-wrap">
                  <Button
                    className="w-full sm:w-auto"
                    disabled={!nextStatus || nextStatus === selected.status}
                    onClick={() => nextStatus && changeStatus(selected.id, nextStatus)}
                  >
                    Aplicar status
                    {nextStatus && nextStatus !== selected.status
                      ? `: ${orderStatusLabels[nextStatus]}`
                      : ''}
                  </Button>
                  <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setSelected(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Modal>
      )}

      {showAdiantar && (
        <Modal className="sm:max-w-3xl" onClose={closeAdiantar}>
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Importar lista ML (formato Adiantar)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              <p className="text-sm text-muted-foreground">
                Cole as linhas no formato:{' '}
                <code className="rounded bg-muted px-1 text-xs">
                  DD/MM/AAAA MARCA ML QTD PRODUTO CLIENTE
                </code>
              </p>
              {!preview && (
                <>
                  <textarea
                    className="min-h-[220px] w-full rounded-md border border-input bg-card p-3 font-mono text-xs text-foreground"
                    placeholder={SAMPLE}
                    value={adiantarText}
                    onChange={(e) => setAdiantarText(e.target.value)}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                    <Button className="w-full sm:w-auto" onClick={onPreview} disabled={importing || !adiantarText.trim()}>
                      Revisar lista
                    </Button>
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      variant="outline"
                      onClick={() => setAdiantarText(SAMPLE)}
                    >
                      Colar exemplo
                    </Button>
                    <Button type="button" className="w-full sm:w-auto" variant="secondary" onClick={closeAdiantar}>
                      Cancelar
                    </Button>
                  </div>
                </>
              )}

              {preview && previewSummary && (
                <>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="success">{previewSummary.matched} ok</Badge>
                    <Badge variant={previewSummary.errors ? 'destructive' : 'secondary'}>
                      {previewSummary.errors} com erro
                    </Badge>
                    <Badge variant="outline">{previewSummary.total} linhas</Badge>
                  </div>
                  <div className="max-h-[360px] overflow-auto rounded-md border">
                    <table className="min-w-full text-xs">
                      <thead className="sticky top-0 bg-card">
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="p-2">#</th>
                          <th className="p-2">Marca</th>
                          <th className="p-2">Qtd</th>
                          <th className="p-2">Produto</th>
                          <th className="p-2">Cliente</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row) => (
                          <tr key={row.lineNumber} className="border-b last:border-0">
                            <td className="p-2">{row.lineNumber}</td>
                            <td className="p-2">{row.brand || '—'}</td>
                            <td className="p-2">{row.quantity || '—'}</td>
                            <td className="p-2">
                              {row.ok ? (
                                <span>
                                  {row.productSku} · {row.productName}
                                </span>
                              ) : (
                                row.productText || row.raw
                              )}
                            </td>
                            <td className="p-2">{row.customerName || '—'}</td>
                            <td className="p-2">
                              {row.ok ? (
                                <Badge variant="success">OK</Badge>
                              ) : (
                                <Badge variant="destructive">{row.error}</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={onConfirmImport}
                      disabled={importing || previewSummary.matched === 0}
                    >
                      Criar {previewSummary.matched} pedido(s)
                    </Button>
                    <Button type="button" className="w-full sm:w-auto" variant="outline" onClick={() => setPreview(null)}>
                      Voltar
                    </Button>
                    <Button type="button" className="w-full sm:w-auto" variant="secondary" onClick={closeAdiantar}>
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Modal>
      )}
    </div>
  );
}
