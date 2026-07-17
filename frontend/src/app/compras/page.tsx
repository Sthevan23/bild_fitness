'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type DeliveryRow } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate, toNum } from '@/lib/utils';
import { toast } from 'sonner';

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  stock?: number;
};

export default function ComprasPage() {
  const { code } = useAppAuth();
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplier, setSupplier] = useState('Marciela');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProductOption | null>(null);
  const [quantity, setQuantity] = useState('1');

  function load() {
    api
      .deliveries('ALL')
      .then((r) => setDeliveries(r.deliveries))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'));
  }

  function loadProducts(q?: string) {
    api
      .products(q)
      .then((r) => setProducts(r.products as ProductOption[]))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!showForm) return;
    loadProducts();
  }, [showForm]);

  useEffect(() => {
    if (!showForm) return;
    const t = setTimeout(() => loadProducts(search.trim() || undefined), 250);
    return () => clearTimeout(t);
  }, [search, showForm]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 40);
    return products
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [products, search]);

  async function confirm(id: string) {
    try {
      await api.confirmDelivery(id);
      toast.success('Entrega confirmada — estoque atualizado');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    }
  }

  function openForm() {
    setSupplier('Marciela');
    setSearch('');
    setSelected(null);
    setQuantity('1');
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error('Selecione um produto pelo SKU');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error('Informe a quantidade');
      return;
    }
    try {
      await api.createDelivery({
        supplierName: supplier || 'Marciela',
        status: 'PEDIDO',
        lines: [
          {
            description: selected.name,
            quantity: qty,
            productId: selected.id,
          },
        ],
      });
      toast.success(`Pedido criado · ${selected.sku}`);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Compras / Entregas · {code}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Pedidos ao fornecedor — confirme a entrega para dar entrada no estoque
          </p>
        </div>
        <Button onClick={openForm}>Novo pedido</Button>
      </div>

      <div className="space-y-2">
        {deliveries.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">
                  {d.supplierName || 'Fornecedor'} ·{' '}
                  <Badge variant={d.status === 'ENTREGA' ? 'success' : 'info'}>{d.status}</Badge>
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Pedido: {d.orderedAt ? formatDate(d.orderedAt) : '—'}
                  {d.deliveredAt ? ` · Entrega: ${formatDate(d.deliveredAt)}` : ''}
                </p>
                <ul className="mt-2 space-y-0.5 text-sm">
                  {d.lines.map((l) => (
                    <li key={l.id}>
                      <span className="font-mono text-xs text-[var(--muted-foreground)]">
                        {l.product?.sku || '—'}
                      </span>{' '}
                      · {l.description} — <b>{toNum(l.quantity)}</b> un
                    </li>
                  ))}
                </ul>
              </div>
              {d.status === 'PEDIDO' && (
                <Button size="sm" onClick={() => confirm(d.id)}>
                  Confirmar entrega
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {!deliveries.length && (
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum pedido nesta conta.</p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <Card className="w-full max-w-lg p-4">
            <form className="space-y-3" onSubmit={onSubmit}>
              <h2 className="font-semibold">Novo pedido ao fornecedor</h2>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Fornecedor"
              />

              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">
                  Buscar por SKU ou descrição
                </label>
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="Ex.: HBE1, PARHBP2, Anilha…"
                  autoFocus
                />
                {selected ? (
                  <div className="rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/5 px-3 py-2 text-sm">
                    Selecionado:{' '}
                    <b className="font-mono">{selected.sku}</b> — {selected.name}
                    <button
                      type="button"
                      className="ml-2 text-xs text-[var(--muted-foreground)] underline"
                      onClick={() => setSelected(null)}
                    >
                      trocar
                    </button>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    {filtered.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full items-start gap-2 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-[var(--muted)]"
                        onClick={() => {
                          setSelected(p);
                          setSearch(`${p.sku} — ${p.name}`);
                        }}
                      >
                        <span className="shrink-0 font-mono text-xs font-semibold text-[var(--primary)]">
                          {p.sku}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      </button>
                    ))}
                    {!filtered.length && (
                      <p className="p-3 text-sm text-[var(--muted-foreground)]">
                        Nenhum SKU encontrado
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantidade"
                required
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={!selected}>
                  Salvar pedido
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
