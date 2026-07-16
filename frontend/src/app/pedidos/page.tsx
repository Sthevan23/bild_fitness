'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, toNum } from '@/lib/utils';
import { toast } from 'sonner';

type Order = {
  id: string;
  number: string;
  status: string;
  platform: string;
  total: unknown;
  orderedAt: string;
  customer?: { name: string } | null;
};

export default function PedidosPage() {
  const { code } = useAppAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState('30');

  function load() {
    api
      .orders({ period, status: 'ALL', platform: 'ALL' })
      .then((r) => setOrders(r.orders as Order[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, period]);

  async function setStatus(id: string, status: string) {
    try {
      await api.updateOrderStatus(id, status);
      toast.success('Status atualizado');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pedidos · {code}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Somente desta conta · <Link href="/contas/">trocar</Link>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {['hoje', '7', '15', '30'].map((p) => (
          <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)}>
            {p === 'hoje' ? 'Hoje' : `${p}d`}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {orders.map((o) => (
          <Card key={o.id}>
            <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  #{o.number} · {o.customer?.name || 'Cliente'}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {o.platform} · {formatDate(o.orderedAt)} · {formatCurrency(toNum(o.total))}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{o.status}</Badge>
                {o.status === 'AGUARDANDO' && (
                  <Button size="sm" onClick={() => setStatus(o.id, 'SEPARANDO')}>
                    Separar
                  </Button>
                )}
                {(o.status === 'AGUARDANDO' || o.status === 'SEPARANDO') && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus(o.id, 'ENVIADO')}>
                    Enviar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!orders.length && <p className="text-sm text-[var(--muted-foreground)]">Nenhum pedido nesta conta.</p>}
      </div>
    </div>
  );
}
