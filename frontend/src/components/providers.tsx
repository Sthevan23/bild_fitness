'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '@/lib/api-client';
import type { AccountCode, SessionUser } from '@pep/shared';
import { toast, Toaster } from 'sonner';

type Ctx = {
  user: SessionUser | null;
  code: AccountCode;
  loading: boolean;
  refresh: () => Promise<void>;
  setAccount: (code: AccountCode) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [code, setCode] = useState<AccountCode>('P&P');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [{ user: me }, active] = await Promise.all([api.me(), api.getActiveAccount()]);
      setUser(me);
      setCode(active.code);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const setAccount = useCallback(async (next: AccountCode) => {
    try {
      const res = await api.setActiveAccount(next);
      setCode(res.code);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao trocar conta');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    window.location.href = '/login/';
  }, []);

  const value = useMemo(
    () => ({ user, code, loading, refresh, setAccount, logout }),
    [user, code, loading, refresh, setAccount, logout],
  );

  return (
    <AuthCtx.Provider value={value}>
      {children}
      <Toaster richColors position="top-right" />
    </AuthCtx.Provider>
  );
}

export function useAppAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAppAuth outside provider');
  return ctx;
}
