import { Suspense } from 'react';
import IntegracoesClient from './integracoes-client';

export default function IntegracoesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando integrações...</div>}>
      <IntegracoesClient />
    </Suspense>
  );
}
