'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  disconnectMercadoLivre,
  getMercadoLivreConnection,
  syncMercadoLivreNow,
} from '@/actions/marketplace';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Link2, RefreshCw, Unplug, PlugZap } from 'lucide-react';

type ConnData = Awaited<ReturnType<typeof getMercadoLivreConnection>>;

function statusLabel(status?: string | null) {
  switch (status) {
    case 'CONNECTED':
      return { text: 'Conta conectada', tone: 'success' as const, dot: '🟢' };
    case 'EXPIRED':
    case 'ERROR':
      return { text: 'Precisa reconectar', tone: 'destructive' as const, dot: '🔴' };
    default:
      return { text: 'Conta desconectada', tone: 'destructive' as const, dot: '🔴' };
  }
}

export default function IntegracoesClient() {
  const search = useSearchParams();
  const [data, setData] = useState<ConnData | null>(null);
  const [pending, start] = useTransition();
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setData(await getMercadoLivreConnection());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const err = search.get('error');
    const connected = search.get('connected');
    if (err) toast.error(err);
    if (connected) toast.success('Mercado Livre conectado com sucesso');
  }, [search]);

  useEffect(() => {
    if (data?.connection?.status !== 'CONNECTED') return;
    const id = setInterval(() => {
      void syncMercadoLivreNow().then(() => load());
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [data?.connection?.status]);

  const conn = data?.connection;
  const connected = conn?.status === 'CONNECTED';
  const st = statusLabel(conn?.status);

  async function onSync() {
    setSyncing(true);
    const res = await syncMercadoLivreNow();
    setSyncing(false);
    if ('error' in res && res.error) {
      toast.error(res.error);
      load();
      return;
    }
    toast.success(
      `Sync OK · ${res.result!.ordersUpserted} pedidos · ${res.result!.productsUpserted} produtos`,
    );
    if (res.result!.errors.length) toast.warning(res.result!.errors[0]);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Conecte marketplaces para sincronizar pedidos, produtos, estoque e financeiro
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-[#FFE600] text-lg font-black text-[#2D3277]">
                ML
              </div>
              <div>
                <CardTitle className="text-lg">Mercado Livre</CardTitle>
                <CardDescription>OAuth oficial · sync automático</CardDescription>
              </div>
            </div>
            <Badge variant={st.tone}>
              {st.dot} {st.text}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {!data?.configured && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                Configure no <code>.env</code>: <code>ML_CLIENT_ID</code>, <code>ML_CLIENT_SECRET</code>,{' '}
                <code>ML_REDIRECT_URI</code> e <code>TOKEN_ENCRYPTION_KEY</code>.
              </div>
            )}

            {conn && conn.status !== 'DISCONNECTED' && (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Conta:</span>{' '}
                  <b>{conn.accountName || conn.nickname || '—'}</b>
                </p>
                <p>
                  <span className="text-muted-foreground">Nickname:</span> <b>{conn.nickname || '—'}</b>
                </p>
                <p>
                  <span className="text-muted-foreground">ID da conta:</span>{' '}
                  <b className="font-mono">{conn.sellerId || '—'}</b>
                </p>
                <p>
                  <span className="text-muted-foreground">Última sync:</span>{' '}
                  <b>{conn.lastSyncAt ? formatDate(conn.lastSyncAt) : 'Nunca'}</b>
                </p>
              </div>
            )}

            {conn?.lastSyncError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                {conn.lastSyncError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {!connected && (
                <Button
                  disabled={!data?.configured || pending}
                  onClick={() => {
                    start(() => {
                      window.location.href = '/api/marketplace/mercadolivre/connect';
                    });
                  }}
                >
                  <PlugZap className="mr-2 size-4" />
                  Conectar conta
                </Button>
              )}
              {(conn?.status === 'EXPIRED' || conn?.status === 'ERROR') && (
                <Button
                  variant="outline"
                  disabled={!data?.configured}
                  onClick={() => {
                    window.location.href = '/api/marketplace/mercadolivre/connect';
                  }}
                >
                  <Link2 className="mr-2 size-4" />
                  Reconectar
                </Button>
              )}
              {connected && (
                <>
                  <Button onClick={onSync} disabled={syncing}>
                    <RefreshCw className={`mr-2 size-4 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar agora
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = '/api/marketplace/mercadolivre/connect';
                    }}
                  >
                    Reconectar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm('Desconectar Mercado Livre?')) return;
                      await disconnectMercadoLivre();
                      toast.success('Conta desconectada');
                      load();
                    }}
                  >
                    <Unplug className="mr-2 size-4" />
                    Desconectar
                  </Button>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Tokens ficam criptografados no banco e nunca são enviados ao navegador. Sync automática a
              cada 5 min (cron + esta tela).
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-80">
          <CardHeader>
            <CardTitle className="text-lg">Shopee · Amazon · Magalu · Nuvemshop</CardTitle>
            <CardDescription>Arquitetura pronta — adapters futuros</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            A pasta <code>src/modules/marketplace/</code> isola cada canal. Novas lojas entram como
            adapters sem alterar o core do ERP.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
