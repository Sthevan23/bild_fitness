'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, toNum } from '@/lib/utils';
import { toast } from 'sonner';

type Order = {
  id: string;
  number: string;
  status: string;
  total: unknown;
  customer?: { name: string } | null;
};

export default function ExpedicaoPage() {
  const { code } = useAppAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  function load() {
    api
      .orders({ period: '90', status: 'ALL', limit: '200' })
      .then((r) =>
        setOrders(
          (r.orders as Order[]).filter((o) => o.status === 'AGUARDANDO' || o.status === 'SEPARANDO'),
        ),
      )
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Expedição · {code}</h1>
      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium">
                #{o.number} · {o.customer?.name || '—'}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">{formatCurrency(toNum(o.total))}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{o.status}</Badge>
              {o.status === 'AGUARDANDO' && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await api.updateOrderStatus(o.id, 'SEPARANDO');
                    load();
                  }}
                >
                  Separar
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await api.updateOrderStatus(o.id, 'ENVIADO');
                    toast.success('Enviado + estoque baixado');
                    load();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Erro');
                  }
                }}
              >
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {!orders.length && <p className="text-sm text-[var(--muted-foreground)]">Fila vazia.</p>}
    </div>
  );
}
