'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { adjustStock, createProduct, deleteProduct, listProducts } from '@/actions/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatNumber, toNum } from '@/lib/utils';
import { productSchema, zodFieldErrors } from '@/lib/validations';
import { toast } from 'sonner';

type Product = Awaited<ReturnType<typeof listProducts>>[number];

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'ok' | 'baixo' | 'zerado'>('todos');
  const [pending, start] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adjust, setAdjust] = useState<Product | null>(null);
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [qty, setQty] = useState('1');

  function load(q?: string) {
    start(async () => setProducts(await listProducts(q)));
  }

  useEffect(() => {
    load();
  }, []);

  const enriched = useMemo(
    () =>
      products.map((p) => {
        const stock = toNum(p.stock);
        const min = toNum(p.minStock);
        const status = stock <= 0 ? 'zerado' : stock <= min ? 'baixo' : 'ok';
        return { ...p, stock, min, status };
      }),
    [products],
  );

  const filtered = enriched.filter((p) => {
    if (filter !== 'todos' && p.status !== filter) return false;
    return true;
  });

  const summary = {
    total: enriched.length,
    baixo: enriched.filter((p) => p.status === 'baixo').length,
    zerado: enriched.filter((p) => p.status === 'zerado').length,
    valor: enriched.reduce((a, p) => a + p.stock * toNum(p.costPrice), 0),
  };

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || ''),
      sku: String(fd.get('sku') || ''),
      barcode: String(fd.get('barcode') || ''),
      category: String(fd.get('category') || ''),
      unit: String(fd.get('unit') || 'UN'),
      stock: Number(fd.get('stock') || 0),
      minStock: Number(fd.get('minStock') || 5),
      costPrice: Number(fd.get('costPrice') || 0),
      salePrice: Number(fd.get('salePrice') || 0),
      brand: String(fd.get('brand') || ''),
    };
    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    const res = await createProduct(parsed.data);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Produto criado');
      setShowCreate(false);
      setErrors({});
      load(search);
    }
  }

  async function onAdjust() {
    if (!adjust) return;
    const res = await adjustStock(adjust.id, tipo, Number(qty.replace(',', '.')));
    if (res.error) toast.error(res.error);
    else {
      toast.success('Estoque ajustado');
      setAdjust(null);
      load(search);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Estoque</h1>
          <p className="text-sm text-muted-foreground">Produtos de academia · anilhas, halteres, kettlebells</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setErrors({});
            setShowCreate(true);
          }}
        >
          Novo produto
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Card><CardContent className="pt-4 sm:pt-5"><p className="text-xs text-muted-foreground sm:text-sm">SKUs</p><p className="text-lg font-semibold sm:text-2xl">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-5"><p className="text-xs text-muted-foreground sm:text-sm">Baixo</p><p className="text-lg font-semibold sm:text-2xl">{summary.baixo}</p></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-5"><p className="text-xs text-muted-foreground sm:text-sm">Zerados</p><p className="text-lg font-semibold sm:text-2xl">{summary.zerado}</p></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-5"><p className="text-xs text-muted-foreground sm:text-sm">Valor estoque</p><p className="text-lg font-semibold sm:text-2xl">{formatCurrency(summary.valor)}</p></CardContent></Card>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="h-11 w-full sm:max-w-sm"
            placeholder="Buscar nome, SKU, EAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(search)}
          />
          <Button className="h-11 w-full sm:w-auto" variant="secondary" onClick={() => load(search)} disabled={pending}>
            Buscar
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['todos', 'ok', 'baixo', 'zerado'] as const).map((f) => (
            <Button key={f} size="sm" className="shrink-0" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                  </div>
                  <Badge variant={p.status === 'ok' ? 'success' : p.status === 'baixo' ? 'warning' : 'destructive'}>
                    {p.status}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                  <span>Estoque: <b>{formatNumber(p.stock)} {p.unit}</b></span>
                  <span>Mín: {formatNumber(p.min)}</span>
                  <span>Custo: {formatCurrency(toNum(p.costPrice))}</span>
                  <span>Venda: {formatCurrency(toNum(p.salePrice))}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const original = products.find((x) => x.id === p.id);
                    if (original) setAdjust(original);
                    setQty('1');
                    setTipo('ENTRADA');
                  }}>Ajustar</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirm('Excluir produto?')) return;
                    const res = await deleteProduct(p.id);
                    if (res.error) toast.error(res.error); else { toast.success('Excluído'); load(search); }
                  }}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Produto</th>
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3">Estoque</th>
                  <th className="py-2 pr-3">Mín.</th>
                  <th className="py-2 pr-3">Custo</th>
                  <th className="py-2 pr-3">Venda</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{p.sku}</td>
                    <td className="py-2 pr-3">
                      <p className="font-medium">{p.name}</p>
                      {p.linkedSkus && <p className="text-xs text-muted-foreground">{p.linkedSkus}</p>}
                    </td>
                    <td className="py-2 pr-3">{p.category}</td>
                    <td className="py-2 pr-3 font-semibold">{formatNumber(p.stock)} {p.unit}</td>
                    <td className="py-2 pr-3">{formatNumber(p.min)}</td>
                    <td className="py-2 pr-3">{formatCurrency(toNum(p.costPrice))}</td>
                    <td className="py-2 pr-3">{formatCurrency(toNum(p.salePrice))}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={p.status === 'ok' ? 'success' : p.status === 'baixo' ? 'warning' : 'destructive'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => {
                          const original = products.find((x) => x.id === p.id);
                          if (original) setAdjust(original);
                          setQty('1');
                          setTipo('ENTRADA');
                        }}>Ajustar</Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!confirm('Excluir produto?')) return;
                          const res = await deleteProduct(p.id);
                          if (res.error) toast.error(res.error); else { toast.success('Excluído'); load(search); }
                        }}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showCreate && (
        <Modal
          className="sm:max-w-lg"
          onClose={() => {
            setShowCreate(false);
            setErrors({});
          }}
        >
          <Card className="border-0 shadow-none">
            <CardHeader><CardTitle>Novo produto</CardTitle></CardHeader>
            <CardContent className="pb-6">
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
                <Field className="sm:col-span-2" label="Nome" required error={errors.name}>
                  <Input name="name" className="h-11" />
                </Field>
                <Field label="SKU" required error={errors.sku}>
                  <Input name="sku" className="h-11" />
                </Field>
                <Field label="Código barras" error={errors.barcode}>
                  <Input name="barcode" className="h-11" />
                </Field>
                <Field label="Categoria" error={errors.category}>
                  <Input name="category" className="h-11" placeholder="Halteres" />
                </Field>
                <Field label="Unidade" error={errors.unit}>
                  <Input name="unit" className="h-11" defaultValue="UN" />
                </Field>
                <Field label="Estoque" error={errors.stock}>
                  <Input name="stock" type="number" className="h-11" defaultValue={0} min={0} />
                </Field>
                <Field label="Mínimo" error={errors.minStock}>
                  <Input name="minStock" type="number" className="h-11" defaultValue={5} min={0} />
                </Field>
                <Field label="Custo" error={errors.costPrice}>
                  <Input name="costPrice" type="number" className="h-11" step="0.01" min={0} />
                </Field>
                <Field label="Venda" error={errors.salePrice}>
                  <Input name="salePrice" type="number" className="h-11" step="0.01" min={0} />
                </Field>
                <Field className="sm:col-span-2" label="Marca" error={errors.brand}>
                  <Input name="brand" className="h-11" />
                </Field>
                <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:flex">
                  <Button type="submit" className="w-full sm:w-auto">Salvar</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setShowCreate(false);
                      setErrors({});
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Modal>
      )}

      {adjust && (
        <Modal onClose={() => setAdjust(null)}>
          <Card className="border-0 shadow-none">
            <CardHeader><CardTitle className="text-base sm:text-lg">Ajustar · {adjust.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3 pb-6">
              <p className="text-sm">Saldo: <b>{formatNumber(toNum(adjust.stock))}</b></p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={tipo === 'ENTRADA' ? 'default' : 'outline'} onClick={() => setTipo('ENTRADA')}>Entrada</Button>
                <Button variant={tipo === 'SAIDA' ? 'default' : 'outline'} onClick={() => setTipo('SAIDA')}>Saída</Button>
              </div>
              <Input className="h-11" value={qty} onChange={(e) => setQty(e.target.value)} />
              <div className="grid grid-cols-1 gap-2 sm:flex">
                <Button className="w-full sm:w-auto" onClick={onAdjust}>Confirmar</Button>
                <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setAdjust(null)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </Modal>
      )}
    </div>
  );
}
