'use client';

import { Fragment, useEffect, useState } from 'react';
import { api, type CustomerRow } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

function formatDoc(doc: string | null) {
  if (!doc) return '—';
  const d = doc.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc;
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function load(q?: string) {
    setLoading(true);
    api
      .customers({ ...(q ? { search: q } : {}), pageSize: '100' })
      .then((r) => {
        setCustomers(r.customers);
        setTotal(r.total);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {total} cadastro{total === 1 ? '' : 's'} · telefone, CPF e última compra
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar nome, CPF ou telefone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(search)}
        />
        <Button variant="secondary" onClick={() => load(search)} disabled={loading}>
          Buscar
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-[var(--muted-foreground)]">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">CPF/CNPJ</th>
                <th className="p-3">Última compra</th>
                <th className="p-3 text-right">Pedidos</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <Fragment key={c.id}>
                  <tr
                    className="cursor-pointer border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/40"
                    onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  >
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.phone || '—'}</td>
                    <td className="p-3 tabular-nums">{formatDoc(c.document)}</td>
                    <td className="p-3">
                      {c.lastOrderAt ? (
                        <span>
                          {formatDate(c.lastOrderAt)}
                          {c.lastOrderTotal != null ? ` · ${formatCurrency(c.lastOrderTotal)}` : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{c.ordersCount}</td>
                  </tr>
                  {openId === c.id && (
                    <tr className="border-b bg-[var(--muted)]/20">
                      <td colSpan={5} className="p-3 text-xs text-[var(--muted-foreground)]">
                        {c.recentOrders.length === 0 ? (
                          <p>Sem pedidos recentes.</p>
                        ) : (
                          <ul className="space-y-1">
                            {c.recentOrders.map((o) => (
                              <li key={o.id}>
                                #{o.number} · {formatDate(o.orderedAt)} · {formatCurrency(o.total)} ·{' '}
                                {o.status}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[var(--muted-foreground)]">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
