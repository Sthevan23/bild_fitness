'use client';

import { useEffect, useState } from 'react';
import { createCustomer, deleteCustomer, listCustomers } from '@/actions/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, toNum } from '@/lib/utils';
import { customerSchema, zodFieldErrors } from '@/lib/validations';
import { toast } from 'sonner';

export default function ClientesPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listCustomers>>>([]);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    setItems(await listCustomers());
  }
  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || ''),
      phone: String(fd.get('phone') || ''),
      document: String(fd.get('document') || ''),
      email: String(fd.get('email') || ''),
      address: String(fd.get('address') || ''),
      city: String(fd.get('city') || ''),
    };
    const parsed = customerSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    const res = await createCustomer(parsed.data);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Cliente cadastrado');
      setShow(false);
      setErrors({});
      load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro e histórico de compras</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setErrors({});
            setShow(true);
          }}
        >
          Novo cliente
        </Button>
      </div>
      <Card>
        <CardContent className="pt-5">
          <div className="space-y-3 md:hidden">
            {items.map((c) => (
              <div key={c.id} className="rounded-xl border p-3">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone || 'Sem telefone'} · {c.email || 'Sem e-mail'}</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>{c.orders.length} pedido(s)</span>
                  <span className="font-semibold">
                    {formatCurrency(c.orders.reduce((a, o) => a + toNum(o.total), 0))}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={async () => {
                    const msg =
                      c.orders.length > 0
                        ? `Excluir "${c.name}"? Os ${c.orders.length} pedido(s) permanecerão sem cliente vinculado.`
                        : `Excluir cliente "${c.name}"?`;
                    if (!confirm(msg)) return;
                    const res = await deleteCustomer(c.id);
                    if (res.error) toast.error(res.error);
                    else {
                      toast.success('Cliente excluído');
                      load();
                    }
                  }}
                >
                  Excluir
                </Button>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Nome</th>
                  <th className="py-2">Telefone</th>
                  <th className="py-2">Documento</th>
                  <th className="py-2">E-mail</th>
                  <th className="py-2">Pedidos</th>
                  <th className="py-2">Total comprado</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{c.name}</td>
                    <td className="py-2">{c.phone ?? '—'}</td>
                    <td className="py-2">{c.document ?? '—'}</td>
                    <td className="py-2">{c.email ?? '—'}</td>
                    <td className="py-2">{c.orders.length}</td>
                    <td className="py-2">
                      {formatCurrency(c.orders.reduce((a, o) => a + toNum(o.total), 0))}
                    </td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const msg =
                            c.orders.length > 0
                              ? `Excluir "${c.name}"? Os ${c.orders.length} pedido(s) permanecerão sem cliente vinculado.`
                              : `Excluir cliente "${c.name}"?`;
                          if (!confirm(msg)) return;
                          const res = await deleteCustomer(c.id);
                          if (res.error) toast.error(res.error);
                          else {
                            toast.success('Cliente excluído');
                            load();
                          }
                        }}
                      >
                        Excluir
                      </Button>
                    </td>
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
            <CardHeader>
              <CardTitle>Novo cliente</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <form className="space-y-3" onSubmit={onCreate}>
                <Field label="Nome" required error={errors.name}>
                  <Input name="name" className="h-11" />
                </Field>
                <Field label="Telefone" error={errors.phone}>
                  <Input name="phone" className="h-11" placeholder="(11) 99999-9999" />
                </Field>
                <Field label="CPF/CNPJ" error={errors.document}>
                  <Input name="document" className="h-11" />
                </Field>
                <Field label="E-mail" error={errors.email}>
                  <Input name="email" type="email" className="h-11" />
                </Field>
                <Field label="Endereço" error={errors.address}>
                  <Input name="address" className="h-11" />
                </Field>
                <Field label="Cidade" error={errors.city}>
                  <Input name="city" className="h-11" />
                </Field>
                <div className="grid grid-cols-1 gap-2 sm:flex">
                  <Button type="submit" className="w-full sm:w-auto">
                    Salvar
                  </Button>
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
