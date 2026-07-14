'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { getCompany, updateCompany } from '@/actions/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ConfiguracoesPage() {
  const [name, setName] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    getCompany().then((c) => {
      if (c) setName(c.name);
    });
  }, []);

  async function save() {
    await updateCompany({ name, theme: theme ?? 'light' });
    toast.success('Configurações salvas');
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Empresa, tema e preferências</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Empresa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Nome da empresa</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tema</Label>
            <div className="flex gap-2">
              <Button type="button" variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>Claro</Button>
              <Button type="button" variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>Escuro</Button>
            </div>
          </div>
          <Button onClick={save}>Salvar</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Backup</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Em desenvolvimento local o banco fica em <code>prisma/dev.db</code>. Faça cópia desse arquivo para backup.
          Com PostgreSQL/Docker, use dump do container.
        </CardContent>
      </Card>
    </div>
  );
}
