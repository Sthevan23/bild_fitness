'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.register(form);
      toast.success('Conta criada — faça login');
      router.push('/login/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no cadastro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            {(['companyName', 'name', 'email', 'password'] as const).map((k) => (
              <div key={k}>
                <label className="mb-1 block text-sm">{k}</label>
                <Input
                  type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}
                  value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  required
                />
              </div>
            ))}
            <Button className="w-full" disabled={loading} type="submit">
              Cadastrar
            </Button>
            <p className="text-center text-sm">
              <Link href="/login/" className="text-[var(--primary)]">
                Já tenho conta
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
