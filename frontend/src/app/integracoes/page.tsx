'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type MlStatus } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function IntegracoesPage() {
  const { code } = useAppAuth();
  const [data, setData] = useState<MlStatus | null>(null);

  function load() {
    api
      .mlStatus()
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const connected = data?.connection?.status === 'CONNECTED';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrações · {code}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          API ML por conta · gerencie também em <Link href="/contas/">Contas</Link>
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Mercado Livre</CardTitle>
            <CardDescription>OAuth na API · callback em api.dominio</CardDescription>
          </div>
          <Badge variant={connected ? 'success' : 'destructive'}>
            {connected ? 'Conectado' : 'Desconectado'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!data?.configured && (
            <p className="rounded border border-amber-500/40 bg-amber-500/10 p-3">
              Configure ML_CLIENT_ID, ML_CLIENT_SECRET e ML_REDIRECT_URI na API.
            </p>
          )}
          {data?.connection && (
            <p>
              Nickname: <b>{data.connection.nickname || '—'}</b> · Sync:{' '}
              {data.connection.lastSyncAt ? formatDate(data.connection.lastSyncAt) : 'nunca'}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!connected && (
              <Button
                disabled={!data?.configured}
                onClick={async () => {
                  const res = await api.mlConnect(code);
                  window.location.href = res.url;
                }}
              >
                Conectar {code}
              </Button>
            )}
            {connected && (
              <>
                <Button
                  onClick={async () => {
                    await api.mlSync();
                    toast.success('Sync OK');
                    load();
                  }}
                >
                  Sincronizar
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await api.mlDisconnect(code);
                    toast.success('Desconectado');
                    load();
                  }}
                >
                  Desconectar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
