'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, toNum } from '@/lib/utils';
import { toast } from 'sonner';

type Product = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  costPrice: unknown;
};

export default function EstoquePage() {
  const { code } = useAppAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  function load(q?: string) {
    api
      .products(q)
      .then((r) => setProducts(r.products as Product[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.createProduct({
        name: String(fd.get('name')),
        sku: String(fd.get('sku')),
        stock: Number(fd.get('stock') || 0),
        minStock: Number(fd.get('minStock') || 5),
        costPrice: Number(fd.get('costPrice') || 0),
        salePrice: Number(fd.get('salePrice') || 0),
      });
      toast.success(`Produto criado · ${code}`);
      setShowCreate(false);
      load(search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estoque · {code}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Saldo separado por conta</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Novo produto</Button>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(search)}
        />
        <Button variant="secondary" onClick={() => load(search)}>
          Buscar
        </Button>
      </div>
      <div className="space-y-2">
        {products.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <p className="font-medium">
                  {p.name} <span className="text-xs text-[var(--muted-foreground)]">({p.sku})</span>
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Estoque {toNum(p.stock).toLocaleString('pt-BR')} · custo {formatCurrency(toNum(p.costPrice))}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const q = Number(prompt('Qtd entrada') || 0);
                    if (q > 0) {
                      await api.adjustStock(p.id, 'ENTRADA', q);
                      load(search);
                    }
                  }}
                >
                  + Entrada
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const q = Number(prompt('Qtd saída') || 0);
                    if (q > 0) {
                      try {
                        await api.adjustStock(p.id, 'SAIDA', q);
                        load(search);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Erro');
                      }
                    }
                  }}
                >
                  − Saída
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-4">
            <form className="space-y-2" onSubmit={onCreate}>
              <Input name="name" placeholder="Nome" required />
              <Input name="sku" placeholder="SKU" required />
              <Input name="stock" type="number" placeholder="Estoque inicial" defaultValue={0} />
              <Input name="minStock" type="number" placeholder="Mínimo" defaultValue={5} />
              <Input name="costPrice" type="number" step="0.01" placeholder="Custo" defaultValue={0} />
              <Input name="salePrice" type="number" step="0.01" placeholder="Venda" defaultValue={0} />
              <div className="flex gap-2">
                <Button type="submit">Salvar</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
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
