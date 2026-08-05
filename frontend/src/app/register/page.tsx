'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cadastro desativado</CardTitle>
          <CardDescription>
            Por segurança, o cadastro público está fechado. Use o login do administrador da Bild Fitness.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login/"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white"
          >
            Ir para o login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
