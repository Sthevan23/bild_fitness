'use client';

import { useEffect, useState } from 'react';
import { createSupplier, listSuppliers } from '@/actions/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { supplierSchema, zodFieldErrors } from '@/lib/validations';
import { toast } from 'sonner';

export default function FornecedoresPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listSuppliers>>>([]);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    setItems(await listSuppliers());
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
      email: String(fd.get('email') || ''),
      city: String(fd.get('city') || ''),
      cnpj: String(fd.get('cnpj') || ''),
    };
    const parsed = supplierSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    const res = await createSupplier(parsed.data);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Fornecedor cadastrado');
      setShow(false);
      setErrors({});
      load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Cadastro e produtos vinculados</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setErrors({});
            setShow(true);
          }}
        >
          Novo fornecedor
        </Button>
      </div>
      <Card>
        <CardContent className="pt-5">
          <div className="space-y-3 md:hidden">
            {items.map((s) => (
              <div key={s.id} className="rounded-xl border p-3">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.cnpj || 'Sem CNPJ'} · {s.city || 'Sem cidade'}
                </p>
                <p className="mt-1 text-sm">{s.phone || '—'} · {s.email || '—'}</p>
                <p className="mt-2 text-xs text-muted-foreground">{s.products.length} produto(s)</p>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Nome</th>
                  <th className="py-2">CNPJ</th>
                  <th className="py-2">Telefone</th>
                  <th className="py-2">E-mail</th>
                  <th className="py-2">Cidade</th>
                  <th className="py-2">Produtos</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="py-2">{s.cnpj ?? '—'}</td>
                    <td className="py-2">{s.phone ?? '—'}</td>
                    <td className="py-2">{s.email ?? '—'}</td>
                    <td className="py-2">{s.city ?? '—'}</td>
                    <td className="py-2">{s.products.length}</td>
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
              <CardTitle>Novo fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <form className="space-y-3" onSubmit={onCreate}>
                <Field label="Nome" required error={errors.name}>
                  <Input name="name" className="h-11" />
                </Field>
                <Field label="CNPJ" error={errors.cnpj}>
                  <Input name="cnpj" className="h-11" placeholder="00.000.000/0000-00" />
                </Field>
                <Field label="Telefone" error={errors.phone}>
                  <Input name="phone" className="h-11" />
                </Field>
                <Field label="E-mail" error={errors.email}>
                  <Input name="email" type="email" className="h-11" />
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
