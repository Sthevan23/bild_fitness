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
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80',
    destructive: 'bg-red-50 text-red-700 ring-1 ring-red-200/80',
    info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/80',
    outline: 'border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]',
  };
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
