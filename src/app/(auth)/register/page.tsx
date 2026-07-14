'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { registerCompany } from '@/actions/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await registerCompany({
      companyName: String(fd.get('companyName') ?? ''),
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
    });
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Conta criada! Faça login.');
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Cadastre sua empresa no Bild Fitness</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input name="companyName" required placeholder="Minha Academia" />
            </div>
            <div className="space-y-2">
              <Label>Seu nome</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input name="password" type="password" minLength={6} required />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? 'Criando...' : 'Cadastrar'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              Já tenho conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
