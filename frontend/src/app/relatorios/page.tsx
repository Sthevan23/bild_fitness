'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, toNum } from '@/lib/utils';
import { toast } from 'sonner';

export default function RelatoriosPage() {
  const { code } = useAppAuth();
  const [products, setProducts] = useState<Array<{ id: string; name: string; stock: number; minStock: number }>>([]);
  const [orders, setOrders] = useState<
    Array<{ status: string; total: unknown; items: Array<{ productId: string; quantity: unknown; product: { name: string } }> }>
  >([]);

  useEffect(() => {
    Promise.all([api.products(), api.orders({ period: '30' })])
      .then(([p, o]) => {
        setProducts(p.products as typeof products);
        setOrders(o.orders as typeof orders);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'));
  }, [code]);

  const lowStock = products.filter((p) => toNum(p.stock) <= toNum(p.minStock));
  const revenue = orders
    .filter((o) => o.status !== 'CANCELADO')
    .reduce((a, o) => a + toNum(o.total), 0);

  const top = useMemo(() => {
    const map = new Map<string, { name: string; qty: number }>();
    for (const o of orders.filter((x) => x.status !== 'CANCELADO')) {
      for (const i of o.items || []) {
        const cur = map.get(i.productId) ?? { name: i.product?.name || i.productId, qty: 0 };
        cur.qty += toNum(i.quantity);
        map.set(i.productId, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [orders]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Relatórios · {code}</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--muted-foreground)]">Receita 30d</p>
            <p className="text-xl font-semibold">{formatCurrency(revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--muted-foreground)]">Pedidos</p>
            <p className="text-xl font-semibold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-[var(--muted-foreground)]">Estoque baixo</p>
            <p className="text-xl font-semibold">{lowStock.length}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top produtos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {top.map((t) => (
            <div key={t.name} className="flex justify-between border-b py-1 last:border-0">
              <span>{t.name}</span>
              <b>{Math.round(t.qty)}</b>
            </div>
          ))}
          {!top.length && <p className="text-[var(--muted-foreground)]">Sem dados</p>}
        </CardContent>
      </Card>
    </div>
  );
}
