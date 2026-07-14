'use client';

import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  FileText,
  QrCode,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  normalizePayment,
  orderStatusLabels,
  orderStatusVariant,
  platformLabels,
  platformVariant,
  roleLabels,
  roleVariant,
  type PaymentKind,
} from '@/lib/labels';
import type { OrderStatus, Platform, Role } from '@prisma/client';

const paymentIcons: Record<PaymentKind, React.ComponentType<{ className?: string }>> = {
  PIX: QrCode,
  CARTAO: CreditCard,
  DINHEIRO: Banknote,
  TRANSFERENCIA: ArrowLeftRight,
  BOLETO: FileText,
  OUTRO: Wallet,
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={orderStatusVariant[status]}>{orderStatusLabels[status]}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={roleVariant[role]}>{roleLabels[role]}</Badge>;
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return <Badge variant={platformVariant[platform]}>{platformLabels[platform]}</Badge>;
}

export function PaymentLabel({ method }: { method?: string | null }) {
  const { kind, label } = normalizePayment(method);
  const Icon = paymentIcons[kind];
  if (label === '—') return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span>{label}</span>
    </span>
  );
}
