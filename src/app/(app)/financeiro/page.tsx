'use client';

import { useEffect, useState } from 'react';
import { createFinanceEntry, getFinanceSummary, listFinance } from '@/actions/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, toNum } from '@/lib/utils';
import { financeSchema, zodFieldErrors } from '@/lib/validations';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function FinanceiroPage() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getFinanceSummary>> | null>(null);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof listFinance>>>([]);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    setSummary(await getFinanceSummary());
    setEntries(await listFinance());
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      type: fd.get('type') as 'ENTRADA' | 'SAIDA',
      description: String(fd.get('description') || ''),
      amount: Number(fd.get('amount')),
      category: String(fd.get('category') || ''),
      status: fd.get('status') as 'PENDENTE' | 'PAGO' | 'RECEBIDO',
    };
    const parsed = financeSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    const res = await createFinanceEntry(parsed.data);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Lançamento criado');
      setShow(false);
      setErrors({});
      load();
    }
  }

  const chart = [
    { name: 'Entradas', total: summary?.entradas ?? 0 },
    { name: 'Saídas', total: summary?.saidas ?? 0 },
    { name: 'Lucro', total: summary?.lucro ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Fluxo de caixa, contas a pagar e receber</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setErrors({});
            setShow(true);
          }}
        >
          Novo lançamento
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5 sm:gap-3">
        {[
          ['Entradas', summary?.entradas],
          ['Saídas', summary?.saidas],
          ['Lucro', summary?.lucro],
          ['A pagar', summary?.aPagar],
          ['A receber', summary?.aReceber],
        ].map(([l, v]) => (
          <Card key={String(l)} className={String(l) === 'A receber' ? 'col-span-2 sm:col-span-1' : undefined}>
            <CardContent className="pt-4 sm:pt-5">
              <p className="text-xs text-muted-foreground sm:text-sm">{l}</p>
              <p className="text-base font-semibold sm:text-xl">{formatCurrency(Number(v ?? 0))}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="#0d7a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="space-y-3 md:hidden">
            {entries.map((e) => (
              <div key={e.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(e.createdAt)} · {e.category ?? '—'}</p>
                  </div>
                  <p className="shrink-0 font-semibold">{formatCurrency(toNum(e.amount))}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant={e.type === 'ENTRADA' ? 'success' : 'warning'}>{e.type}</Badge>
                  <Badge variant="secondary">{e.status}</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Data</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Descrição</th>
                  <th className="py-2">Categoria</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2">{formatDate(e.createdAt)}</td>
                    <td className="py-2"><Badge variant={e.type === 'ENTRADA' ? 'success' : 'warning'}>{e.type}</Badge></td>
                    <td className="py-2">{e.description}</td>
                    <td className="py-2">{e.category ?? '—'}</td>
                    <td className="py-2">{e.status}</td>
                    <td className="py-2 font-medium">{formatCurrency(toNum(e.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {show && (
        <Modal
          onClose={() => {
            setShow(false);
            setErrors({});
          }}
        >
          <Card className="border-0 shadow-none">
            <CardHeader><CardTitle>Novo lançamento</CardTitle></CardHeader>
            <CardContent className="pb-6">
              <form className="space-y-3" onSubmit={onCreate}>
                <Field label="Tipo" required error={errors.type}>
                  <Select name="type" className="h-11">
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                  </Select>
                </Field>
                <Field label="Descrição" required error={errors.description}>
                  <Input name="description" className="h-11" />
                </Field>
                <Field label="Valor" required error={errors.amount}>
                  <Input name="amount" type="number" className="h-11" step="0.01" min={0.01} />
                </Field>
                <Field label="Categoria" error={errors.category}>
                  <Input name="category" className="h-11" />
                </Field>
                <Field label="Status" error={errors.status}>
                  <Select name="status" className="h-11">
                    <option value="PENDENTE">Pendente</option>
                    <option value="PAGO">Pago</option>
                    <option value="RECEBIDO">Recebido</option>
                  </Select>
                </Field>
                <div className="grid grid-cols-1 gap-2 sm:flex">
                  <Button type="submit" className="w-full sm:w-auto">Salvar</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setShow(false);
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
    </div>
  );
}
