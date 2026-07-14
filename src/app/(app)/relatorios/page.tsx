'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { listProducts } from '@/actions/products';
import { listOrders } from '@/actions/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlatformBadge } from '@/components/labels';
import { formatCurrency, formatNumber, toNum } from '@/lib/utils';
import { orderStatusLabels, platformLabels } from '@/lib/labels';
import type { OrderStatus, Platform } from '@prisma/client';
import * as XLSX from 'xlsx';

const PLATFORM_COLORS: Record<Platform, string> = {
  MERCADO_LIVRE: '#f59e0b',
  SHOPEE: '#f97316',
  WHATSAPP: '#10b981',
  LOJA: '#0ea5e9',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  AGUARDANDO: '#f59e0b',
  SEPARANDO: '#0ea5e9',
  ENVIADO: '#8b5cf6',
  ENTREGUE: '#10b981',
  CANCELADO: '#ef4444',
};

export default function RelatoriosPage() {
  const [products, setProducts] = useState<Awaited<ReturnType<typeof listProducts>>>([]);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listOrders>>>([]);

  useEffect(() => {
    Promise.all([listProducts(), listOrders({ period: '30' })]).then(([p, o]) => {
      setProducts(p);
      setOrders(o);
    });
  }, []);

  const lowStock = products.filter((p) => toNum(p.stock) <= toNum(p.minStock));
  const stalled = products.filter((p) => {
    const sold = orders.some((o) => o.items.some((i) => i.productId === p.id));
    return !sold && toNum(p.stock) > 0;
  });

  const byPlatform = (Object.keys(platformLabels) as Platform[]).map((k) => ({
    key: k,
    platform: platformLabels[k],
    total: orders
      .filter((o) => o.platform === k && o.status !== 'CANCELADO')
      .reduce((a, o) => a + toNum(o.total), 0),
    count: orders.filter((o) => o.platform === k).length,
  }));

  const salesMap = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
  for (const o of orders.filter((x) => x.status !== 'CANCELADO')) {
    for (const i of o.items) {
      const cur = salesMap.get(i.productId) ?? {
        name: i.product.name,
        sku: i.product.sku,
        qty: 0,
        revenue: 0,
      };
      cur.qty += toNum(i.quantity);
      cur.revenue += toNum(i.totalPrice);
      salesMap.set(i.productId, cur);
    }
  }
  const top = [...salesMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 15);

  const salesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders.filter((x) => x.status !== 'CANCELADO')) {
      const key = new Date(o.orderedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      map.set(key, (map.get(key) ?? 0) + toNum(o.total));
    }
    return [...map.entries()].map(([date, total]) => ({ date, total }));
  }, [orders]);

  const byStatus = useMemo(() => {
    const statuses: OrderStatus[] = ['AGUARDANDO', 'SEPARANDO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'];
    return statuses.map((status) => ({
      status,
      name: orderStatusLabels[status],
      value: orders.filter((o) => o.status === status).length,
    }));
  }, [orders]);

  const stockChart = [
    { name: 'OK', value: products.filter((p) => toNum(p.stock) > toNum(p.minStock)).length },
    { name: 'Baixo', value: products.filter((p) => toNum(p.stock) > 0 && toNum(p.stock) <= toNum(p.minStock)).length },
    { name: 'Zerado', value: products.filter((p) => toNum(p.stock) <= 0).length },
  ];

  const totalRevenue = byPlatform.reduce((a, p) => a + p.total, 0);
  const totalOrders = orders.length;

  function exportSheet(name: string, rows: Record<string, unknown>[]) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `${name}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Visão analítica · últimos 30 dias · export Excel/PDF
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <Button className="w-full sm:w-auto" variant="outline" onClick={() => exportSheet('mais-vendidos', top)}>
          Exportar top produtos
        </Button>
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={() =>
            exportSheet(
              'estoque-baixo',
              lowStock.map((p) => ({
                sku: p.sku,
                nome: p.name,
                estoque: toNum(p.stock),
                minimo: toNum(p.minStock),
              })),
            )
          }
        >
          Exportar estoque baixo
        </Button>
        <Button className="w-full sm:w-auto" variant="outline" onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-4 sm:pt-5">
            <p className="text-xs text-muted-foreground sm:text-sm">Pedidos (30d)</p>
            <p className="text-lg font-semibold sm:text-2xl">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-5">
            <p className="text-xs text-muted-foreground sm:text-sm">Receita (30d)</p>
            <p className="text-lg font-semibold sm:text-2xl">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-5">
            <p className="text-xs text-muted-foreground sm:text-sm">Estoque baixo</p>
            <p className="text-lg font-semibold sm:text-2xl">{lowStock.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-5">
            <p className="text-xs text-muted-foreground sm:text-sm">Produtos parados</p>
            <p className="text-lg font-semibold sm:text-2xl">{stalled.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Vendas por dia</CardTitle>
          </CardHeader>
          <CardContent className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="total" stroke="#0d7a5f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status dos pedidos</CardTitle>
          </CardHeader>
          <CardContent className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={70} label>
                  {byStatus.map((s) => (
                    <Cell key={s.status} fill={STATUS_COLORS[s.status]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por plataforma</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPlatform}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {byPlatform.map((p) => (
                    <Cell key={p.key} fill={PLATFORM_COLORS[p.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top produtos (qtd)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="sku" width={70} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number, _n, item) => [
                    `${formatNumber(v)} un · ${formatCurrency(item.payload.revenue)}`,
                    item.payload.name,
                  ]}
                />
                <Bar dataKey="qty" fill="#0d7a5f" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saúde do estoque</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockChart} dataKey="value" nameKey="name" outerRadius={75} label>
                  {stockChart.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={['#10b981', '#f59e0b', '#ef4444'][i]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo por plataforma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {byPlatform.map((p) => (
              <div key={p.key} className="flex items-center justify-between border-b pb-1">
                <span className="flex items-center gap-2">
                  <PlatformBadge platform={p.key} />
                  <Badge variant="secondary">{p.count}</Badge>
                </span>
                <span>{formatCurrency(p.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estoque baixo / zerado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lowStock.slice(0, 20).map((p) => (
              <div key={p.id} className="flex justify-between border-b pb-1">
                <span>
                  {p.sku} · {p.name}
                </span>
                <Badge variant={toNum(p.stock) <= 0 ? 'destructive' : 'warning'}>
                  {formatNumber(toNum(p.stock))} / mín {formatNumber(toNum(p.minStock))}
                </Badge>
              </div>
            ))}
            {lowStock.length === 0 && (
              <p className="text-muted-foreground">Nenhum item em alerta.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos parados (sem venda 30d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stalled.slice(0, 20).map((p) => (
              <div key={p.id} className="flex justify-between border-b pb-1">
                <span>
                  {p.sku} · {p.name}
                </span>
                <span>{formatNumber(toNum(p.stock))} un</span>
              </div>
            ))}
            {stalled.length === 0 && (
              <p className="text-muted-foreground">Nenhum produto parado no período.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
