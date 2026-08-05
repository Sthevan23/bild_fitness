'use client';

import { usePathname } from 'next/navigation';
import { useAppAuth } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  Warehouse,
  Wallet,
  LogOut,
  PackageCheck,
  BarChart3,
  FileSpreadsheet,
  Receipt,
  Truck,
  ClipboardList,
  Users,
} from 'lucide-react';

const links = [
  { href: '/contas/', label: 'Contas', icon: Building2 },
  { href: '/dashboard/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendas/', label: 'Vendas', icon: Receipt },
  { href: '/pedidos/', label: 'Pedidos', icon: ShoppingCart },
  { href: '/clientes/', label: 'Clientes', icon: Users },
  { href: '/reposicao/', label: 'Reposição', icon: ClipboardList },
  { href: '/compras/', label: 'Compras', icon: Truck },
  { href: '/expedicao/', label: 'Expedição', icon: PackageCheck },
  { href: '/estoque/', label: 'Estoque', icon: Warehouse },
  { href: '/financeiro/', label: 'Financeiro', icon: Wallet },
  { href: '/relatorios/', label: 'Relatórios', icon: BarChart3 },
  { href: '/importar/', label: 'Importar', icon: FileSpreadsheet },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, code, logout, loading } = useAppAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--muted-foreground)]">
        Carregando…
      </div>
    );
  }

  if (!user && !pathname?.startsWith('/login') && !pathname?.startsWith('/register')) {
    if (typeof window !== 'undefined') window.location.href = '/login/';
    return null;
  }

  if (pathname?.startsWith('/login') || pathname?.startsWith('/register')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 flex gap-1 overflow-x-auto border-b border-white/10 bg-[var(--sidebar)]/95 p-2 text-[var(--sidebar-foreground)] backdrop-blur md:hidden">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href);
          return (
            <a
              key={href}
              href={href}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs transition',
                active ? 'bg-[var(--primary)] text-white shadow-sm' : 'hover:bg-white/10',
              )}
            >
              <Icon className="size-4" />
              {label}
            </a>
          );
        })}
      </nav>
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-white/5 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:flex lg:w-64">
          <div className="border-b border-white/10 p-5">
            <p className="text-lg font-semibold tracking-tight">Bild Fitness</p>
            <p className="mt-0.5 truncate text-xs text-white/50">{user?.companyName}</p>
            <p className="mt-3 inline-flex rounded-full bg-[var(--primary)]/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-400/20">
              Conta {code}
            </p>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname?.startsWith(href);
              return (
                <a
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                    active
                      ? 'bg-[var(--primary)] text-white shadow-md shadow-emerald-900/30'
                      : 'text-white/75 hover:bg-white/8 hover:text-white',
                  )}
                >
                  <Icon className="size-4 opacity-90" />
                  {label}
                </a>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-3">
            <p className="truncate px-2 text-xs text-white/55">{user?.name}</p>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-start rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
              onClick={logout}
            >
              <LogOut className="size-4" />
              Sair
            </Button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 animate-fade-up p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
