import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'secondary' | 'success' | 'destructive' | 'info' | 'outline';
}) {
  const variants = {
    default: 'bg-[var(--primary)] text-white',
    secondary: 'bg-[var(--muted)] text-[var(--foreground)]',
    success: 'bg-emerald-100 text-emerald-800',
    destructive: 'bg-red-100 text-red-800',
    info: 'bg-sky-100 text-sky-800',
    outline: 'border',
  };
  return (
    <div
      className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', variants[variant], className)}
      {...props}
    />
  );
}
