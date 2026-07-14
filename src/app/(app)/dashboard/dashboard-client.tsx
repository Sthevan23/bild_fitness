'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlatformBadge, StatusBadge } from '@/components/labels';
import { formatCurrency, formatDate, toNum } from '@/lib/utils';

const COLORS = ['#0d7a5f', '#f59e0b', '#ef4444', '#3b82f6'];

export function DashboardClient({
  data,
}: {
  data: Awaited<ReturnType<typeof import('@/actions/dashboard').getDashboardData>>;
}) {
  const { cards, salesByDay, topProducts, stockChart, recentOrders, marketplace } = data;

  const stats = [
    { label: 'Pedidos hoje', value: String(cards.ordersToday) },
    { label: 'Vendas hoje', value: formatCurrency(cards.soldToday) },
    { label: 'Lucro (mês)', value: formatCurrency(cards.lucro) },
    { label: 'Pedidos pendentes', value: String(cards.pending) },
    { label: 'Pedidos enviados', value: String(cards.shipped) },
    { label: 'Produtos vendidos', value: String(Math.round(cards.unitsSold)) },
    { label: 'Estoque baixo', value: String(cards.lowStock) },
    { label: 'Em estoque', value: String(Math.round(cards.stockUnits)) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do ERP Bild Fitness</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">ML:</span>
            {marketplace.mlStatus === 'CONNECTED' ? (
              <Badge variant="success">{marketplace.mlNickname || 'conectado'}</Badge>
            ) : (
              <Badge variant="destructive">desconectado</Badge>
            )}
            <span className="text-muted-foreground">
              Sync: {marketplace.lastSyncAt ? formatDate(marketplace.lastSyncAt) : 'nunca'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold sm:text-2xl">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Vendas por dia (30d)</CardTitle>
          </CardHeader>
          <CardContent className="h-56 sm:h-64">
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
            <CardTitle className="text-base">Estoque</CardTitle>
          </CardHeader>
          <CardContent className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockChart} dataKey="value" nameKey="name" outerRadius={80} label>
                  {stockChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" fill="#0d7a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedidos recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex flex-col gap-2 border-b pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">#{o.number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.customer?.name ?? 'Cliente'} · {formatDate(o.orderedAt)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-medium">{formatCurrency(toNum(o.total))}</p>
                    <div className="mt-1 flex flex-wrap gap-1 sm:justify-end">
                      <PlatformBadge platform={o.platform} />
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
