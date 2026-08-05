'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const { refresh } = useAppAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.login(email, password);
      await refresh();
      toast.success('Login OK');
      window.location.href = '/contas/';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no login');
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,_#d8f3ea,_transparent_50%)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Bild Fitness</CardTitle>
          <CardDescription>Acesso ao sistema de vendas e estoque</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm">E-mail</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Senha</label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
