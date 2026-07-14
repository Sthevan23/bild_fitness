'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requestPasswordReset } from '@/actions/auth';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get('email') ?? '');
    const res = await requestPasswordReset(email);
    setLoading(false);
    toast.success(res.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>Enviaremos instruções para o seu e-mail</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input name="email" type="email" required />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              Voltar ao login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
