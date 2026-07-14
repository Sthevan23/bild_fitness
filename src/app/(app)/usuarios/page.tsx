'use client';

import { useEffect, useState } from 'react';
import { createUser, listUsers, setUserActive, updateUser } from '@/actions/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { RoleBadge } from '@/components/labels';
import { roleLabels, roleModuleAccess } from '@/lib/labels';
import { userCreateSchema, userUpdateSchema, zodFieldErrors } from '@/lib/validations';
import { toast } from 'sonner';
import type { Role } from '@prisma/client';

type UserRow = Awaited<ReturnType<typeof listUsers>>[number];

const ROLES: Role[] = ['ADMIN', 'FINANCEIRO', 'EXPEDICAO', 'ESTOQUE'];

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    setUsers(await listUsers());
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setErrors({});
    setMode('create');
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setErrors({});
    setMode('edit');
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || ''),
      email: String(fd.get('email') || ''),
      password: String(fd.get('password') || ''),
      role: fd.get('role') as Role,
    };

    if (mode === 'create') {
      const parsed = userCreateSchema.safeParse(payload);
      if (!parsed.success) {
        setErrors(zodFieldErrors(parsed.error));
        return;
      }
      const res = await createUser(parsed.data);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Usuário criado');
        setMode(null);
        load();
      }
      return;
    }

    if (mode === 'edit' && editing) {
      const parsed = userUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setErrors(zodFieldErrors(parsed.error));
        return;
      }
      const res = await updateUser(editing.id, parsed.data);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Usuário atualizado');
        setMode(null);
        setEditing(null);
        load();
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Usuários</h1>
          <p className="text-sm text-muted-foreground">Editar, desativar e permissões por papel</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openCreate}>
          Novo usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissões por papel</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((role) => (
            <div key={role} className="rounded-lg border p-3">
              <RoleBadge role={role} />
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {roleModuleAccess[role].map((m) => (
                  <li key={m}>• {m}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <div key={u.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge variant={u.active ? 'success' : 'destructive'}>
                    {u.active ? 'Ativo' : 'Off'}
                  </Badge>
                </div>
                <div className="mt-2">
                  <RoleBadge role={u.role} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={u.active ? 'ghost' : 'secondary'}
                    onClick={async () => {
                      const res = await setUserActive(u.id, !u.active);
                      if (res.error) toast.error(res.error);
                      else {
                        toast.success(u.active ? 'Usuário desativado' : 'Usuário reativado');
                        load();
                      }
                    }}
                  >
                    {u.active ? 'Desativar' : 'Reativar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Nome</th>
                  <th className="py-2">E-mail</th>
                  <th className="py-2">Papel</th>
                  <th className="py-2">Situação</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{u.name}</td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-2">
                      <Badge variant={u.active ? 'success' : 'destructive'}>
                        {u.active ? 'Ativo' : 'Desativado'}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant={u.active ? 'ghost' : 'secondary'}
                          onClick={async () => {
                            const res = await setUserActive(u.id, !u.active);
                            if (res.error) toast.error(res.error);
                            else {
                              toast.success(u.active ? 'Usuário desativado' : 'Usuário reativado');
                              load();
                            }
                          }}
                        >
                          {u.active ? 'Desativar' : 'Reativar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {mode && (
        <Modal
          onClose={() => {
            setMode(null);
            setEditing(null);
            setErrors({});
          }}
        >
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>{mode === 'create' ? 'Novo usuário' : `Editar · ${editing?.name}`}</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <form className="space-y-3" onSubmit={onSubmit}>
                <Field label="Nome" required error={errors.name}>
                  <Input name="name" className="h-11" defaultValue={editing?.name ?? ''} />
                </Field>
                <Field label="E-mail" required error={errors.email}>
                  <Input name="email" type="email" className="h-11" defaultValue={editing?.email ?? ''} />
                </Field>
                <Field
                  label={mode === 'edit' ? 'Nova senha (opcional)' : 'Senha'}
                  required={mode === 'create'}
                  error={errors.password}
                >
                  <Input
                    name="password"
                    type="password"
                    className="h-11"
                    minLength={mode === 'create' ? 6 : undefined}
                    placeholder={mode === 'edit' ? 'Deixe em branco para manter' : ''}
                  />
                </Field>
                <Field label="Papel" required error={errors.role}>
                  <Select name="role" className="h-11" defaultValue={editing?.role ?? 'ESTOQUE'}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabels[r]}
                      </option>
                    ))}
                  </Select>
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
                      setMode(null);
                      setEditing(null);
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
