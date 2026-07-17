'use client';

import { useEffect, useState } from 'react';
import { api, type HubAccount } from '@/lib/api-client';
import { useAppAuth } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Building2, LogIn, PlugZap, RefreshCw, Unplug } from 'lucide-react';
import type { AccountCode } from '@pep/shared';
import { toast } from 'sonner';

const FALLBACK: HubAccount[] = (['P&P', 'RC', 'PCP'] as AccountCode[]).map((code, i) => ({
  id: `f-${code}`,
  code,
  name: code.toLowerCase(),
  cnpj: null,
  active: true,
  isSelected: i === 0,
  ml: null,
  stock: { skus: 0, low: 0, zerado: 0 },
}));

export default function ContasPage() {
  const { code: activeCode, setAccount, refresh } = useAppAuth();
  const [accounts, setAccounts] = useState<HubAccount[]>(FALLBACK);
  const [editing, setEditing] = useState<AccountCode | null>(null);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [pending, setPending] = useState(false);

  async function load() {
    try {
      const hub = await api.accountsHub();
      if (hub.accounts?.length) setAccounts(hub.accounts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao carregar contas');
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setAccounts((prev) => prev.map((a) => ({ ...a, isSelected: a.code === activeCode })));
  }, [activeCode]);

  async function onEnter(code: AccountCode) {
    setPending(true);
    try {
      const ok = await setAccount(code);
      if (!ok) return;
      await refresh();
      toast.success(`Entrou na conta ${code}`);
      window.location.href = '/dashboard/';
    } finally {
      setPending(false);
    }
  }

  async function onSave() {
    if (!editing) return;
    try {
      await api.updateAccount(editing, { name, cnpj });
      toast.success('Conta atualizada');
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    }
  }

  async function onConnectMl(code: AccountCode) {
    await setAccount(code);
    try {
      const res = await api.mlConnect(code);
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ML');
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
          Empresa
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Contas da empresa</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Cada CNPJ (P&P/RC/PCP) tem controle isolado. Conta ativa:{' '}
          <Badge variant="info">{activeCode}</Badge>
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {accounts.map((account) => (
          <Card
            key={account.code}
            className={
              account.code === activeCode
                ? 'border-[var(--primary)]/50 ring-2 ring-[var(--primary)]/15'
                : undefined
            }
          >
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)]/15 to-[var(--primary)]/5 text-[var(--primary)] ring-1 ring-[var(--primary)]/10">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{account.code}</CardTitle>
                    <CardDescription>{account.name}</CardDescription>
                  </div>
                </div>
                {account.code === activeCode && <Badge variant="success">Ativa</Badge>}
              </div>
              <Badge variant={account.ml?.status === 'CONNECTED' ? 'success' : 'secondary'}>
                {account.ml?.status === 'CONNECTED' ? 'ML conectado' : 'ML não conectado'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl bg-[var(--muted)]/70 px-3.5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  CNPJ
                </p>
                <p className="mt-0.5 font-medium">{account.cnpj || 'Não informado'}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[var(--muted)]/50 px-2 py-2.5">
                  <p className="text-[11px] text-[var(--muted-foreground)]">SKUs</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums">{account.stock.skus}</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-2 py-2.5">
                  <p className="text-[11px] text-amber-700/80">Baixo</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-amber-800">
                    {account.stock.low}
                  </p>
                </div>
                <div className="rounded-xl bg-rose-50 px-2 py-2.5">
                  <p className="text-[11px] text-rose-700/80">Zerado</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-rose-800">
                    {account.stock.zerado}
                  </p>
                </div>
              </div>
              {account.ml?.nickname && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  ML: <b>{account.ml.nickname}</b>
                  {account.ml.lastSyncAt ? ` · ${formatDate(account.ml.lastSyncAt)}` : ''}
                </p>
              )}
              <Button
                className="w-full"
                disabled={pending || account.code === activeCode}
                onClick={() => onEnter(account.code)}
              >
                <LogIn className="size-4" />
                {account.code === activeCode ? 'Conta em uso' : 'Entrar nesta conta'}
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  setEditing(account.code);
                  setName(account.name);
                  setCnpj(account.cnpj || '');
                }}
              >
                Configurar CNPJ
              </Button>
              {account.ml?.status === 'CONNECTED' ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await setAccount(account.code);
                      await api.mlSync();
                      toast.success('Sync solicitado');
                      load();
                    }}
                  >
                    <RefreshCw className="size-3.5" /> Sync
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await api.mlDisconnect(account.code);
                      toast.success('Desconectado');
                      load();
                    }}
                  >
                    <Unplug className="size-3.5" /> Off
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="w-full" onClick={() => onConnectMl(account.code)}>
                  <PlugZap className="size-3.5" /> Conectar Mercado Livre
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Configurar {editing}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="CNPJ" />
              <div className="flex gap-2">
                <Button onClick={onSave}>Salvar</Button>
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
