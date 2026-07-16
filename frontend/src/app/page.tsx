'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppAuth } from '@/components/providers';

export default function HomePage() {
  const { user, loading } = useAppAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/contas/' : '/login/');
  }, [user, loading, router]);

  return <p className="p-6 text-sm text-[var(--muted-foreground)]">Redirecionando…</p>;
}
