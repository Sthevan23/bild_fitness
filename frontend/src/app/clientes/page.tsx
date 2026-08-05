'use client';

import { Fragment, useEffect, useState } from 'react';
import { api, type CustomerRow } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function load(q?: string, pageNum = page) {
    setLoading(true);
    api
      .customers({
        ...(q ? { search: q } : {}),
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
      })
      .then((r) => {
        setCustomers(r.customers);
        setTotal(r.total);
        setPage(r.page);
        setPageSize(r.pageSize);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {total} cadastro{total === 1 ? '' : 's'} · mostrando {from}–{to} · telefone, CPF e última compra
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar nome, CPF ou telefone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setPage(1);
              load(search, 1);
            }
          }}
        />
        <Button
          variant="secondary"
          onClick={() => {
            setPage(1);
            load(search, 1);
          }}
          disabled={loading}
        >
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <p className="text-sm text-[var(--muted-foreground)]">
            Página {page} de {totalPages}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
