'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  ShoppingCart,
  PackageCheck,
  Warehouse,
  FileUp,
  ShoppingBag,
  Wallet,
  Truck,
  Users,
  BarChart3,
  Settings,
  UserCog,
  LogOut,
  Menu,
  Moon,
  Sun,
  ChevronLeft,
  Link2,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { canAccess } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import type { Role } from '@prisma/client';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingCart, module: 'pedidos' },
  { href: '/expedicao', label: 'Expedição', icon: PackageCheck, module: 'expedicao' },
  { href: '/estoque', label: 'Estoque', icon: Warehouse, module: 'estoque' },
  { href: '/importar-nfe', label: 'Importar NF-e', icon: FileUp, module: 'nfe' },
  { href: '/lista-compras', label: 'Lista de Compras', icon: ShoppingBag, module: 'compras' },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet, module: 'financeiro' },
  { href: '/fornecedores', label: 'Fornecedores', icon: Truck, module: 'fornecedores' },
  { href: '/clientes', label: 'Clientes', icon: Users, module: 'clientes' },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3, module: 'relatorios' },
  { href: '/integracoes', label: 'Integrações', icon: Link2, module: 'integracoes' },
  { href: '/usuarios', label: 'Usuários', icon: UserCog, module: 'usuarios' },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, module: 'configuracoes' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (data?.user?.role ?? 'ESTOQUE') as Role;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function Nav({ forceExpanded = false }: { forceExpanded?: boolean }) {
    const narrow = collapsed && !forceExpanded;
    return (
      <aside
        className={cn(
          'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all',
          narrow ? 'w-[72px]' : 'w-[min(18rem,85vw)] sm:w-64',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3 sm:px-4 sm:py-4">
          {!narrow && (
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight">Bild Fitness</p>
              <p className="truncate text-xs text-white/60">{data?.user?.companyName}</p>
            </div>
          )}
          {forceExpanded ? (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-sidebar-foreground hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="size-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-sidebar-foreground hover:bg-white/10"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={narrow ? 'Expandir menu' : 'Recolher menu'}
            >
              {narrow ? <Menu className="size-4" /> : <ChevronLeft className="size-4" />}
            </Button>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {links
            .filter((l) => canAccess(role, l.module))
            .map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                    active ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10',
                    narrow && 'justify-center px-2',
                  )}
                  title={label}
                >
                  <Icon className="size-4 shrink-0" />
                  {!narrow && <span>{label}</span>}
                </Link>
              );
            })}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {!narrow && (
            <div className="px-1 text-xs text-white/60">
              <p className="font-medium text-white/90">{data?.user?.name}</p>
              <p className="truncate">{data?.user?.email}</p>
            </div>
          )}
          <div className={cn('flex gap-1', narrow && 'flex-col')}>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 text-sidebar-foreground hover:bg-white/10"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size={narrow ? 'icon' : 'sm'}
              className={cn(
                'text-sidebar-foreground hover:bg-white/10',
                !narrow && 'min-h-11 flex-1',
                narrow && 'min-h-11 min-w-11',
              )}
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="size-4" />
              {!narrow && 'Sair'}
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <Nav />
      </div>

      <div className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/95 px-3 py-2.5 backdrop-blur pt-[max(0.625rem,env(safe-area-inset-top))] lg:hidden">
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">Bild Fitness</p>
          <p className="truncate text-xs text-muted-foreground">{data?.user?.name}</p>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <Nav forceExpanded />
          </div>
        </div>
      )}
    </>
  );
}
