'use client';

import { useEffect, useState, useTransition } from 'react';
import { listOrders, updateOrderStatus } from '@/actions/orders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlatformBadge, StatusBadge } from '@/components/labels';
import { formatCurrency, toNum } from '@/lib/utils';
import { platformLabels } from '@/lib/permissions';
import { toast } from 'sonner';

type OrderRow = Awaited<ReturnType<typeof listOrders>>[number];

export default function ExpedicaoPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState('');
  const [pending, start] = useTransition();

  function load() {
    start(async () => {
      const all = await listOrders({ status: 'ALL', period: '30', search });
      setOrders(all.filter((o) => o.status === 'AGUARDANDO' || o.status === 'SEPARANDO'));
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: 'SEPARANDO' | 'ENVIADO') {
    const tracking =
      status === 'ENVIADO' ? window.prompt('Código de rastreio (opcional):') || undefined : undefined;
    const res = await updateOrderStatus(id, status, tracking);
    if (res.error) toast.error(res.error);
    else {
      toast.success(status === 'SEPARANDO' ? 'Marcado como separado' : 'Pedido enviado e estoque baixado');
      load();
    }
  }

  function printList() {
    const html = `
      <html><head><title>Lista de separação</title>
      <style>body{font-family:sans-serif;padding:24px} table{width:100%;border-collapse:collapse}
      td,th{border:1px solid #ccc;padding:8px;text-align:left}</style></head><body>
      <h1>Lista de separação — Bild Fitness</h1>
      <table><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th></tr></thead>
      <tbody>
      ${orders
        .map(
          (o) => `<tr><td>#${o.number}</td><td>${o.customer?.name ?? ''}</td><td>${o.items
            .map((i) => `${i.product.name} x${toNum(i.quantity)}`)
            .join('<br/>')}</td></tr>`,
        )
        .join('')}
      </tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  }

  function printLabel(o: OrderRow) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><body style="font-family:sans-serif;padding:24px">
      <h2>Etiqueta</h2>
      <p><b>Pedido:</b> #${o.number}</p>
      <p><b>Cliente:</b> ${o.customer?.name ?? ''}</p>
      <p><b>Plataforma:</b> ${platformLabels[o.platform]}</p>
      <p><b>Rastreio:</b> ${o.trackingCode || '—'}</p>
      </body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Expedição</h1>
          <p className="text-sm text-muted-foreground">Separação e envio de pedidos</p>
        </div>
        <Button onClick={printList}>Imprimir lista</Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar nome, pedido, código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <Button variant="secondary" onClick={load} disabled={pending}>
          Buscar
        </Button>
      </div>

      <div className="grid gap-3">
        {orders.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum pedido aguardando separação.
            </CardContent>
          </Card>
        )}
        {orders.map((o) => (
          <Card key={o.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">
                #{o.number} · {o.customer?.name}
              </CardTitle>
              <StatusBadge status={o.status} />
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <PlatformBadge platform={o.platform} />
                <span>· {formatCurrency(toNum(o.total))}</span>
              </p>
              <ul className="text-sm">
                {o.items.map((i) => (
                  <li key={i.id}>
                    {i.product.sku} — {i.product.name} × {toNum(i.quantity)}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {o.status === 'AGUARDANDO' && (
                  <Button size="sm" onClick={() => setStatus(o.id, 'SEPARANDO')}>
                    Marcar separado
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setStatus(o.id, 'ENVIADO')}>
                  Marcar enviado
                </Button>
                <Button size="sm" variant="outline" onClick={() => printLabel(o)}>
                  Imprimir etiqueta
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
