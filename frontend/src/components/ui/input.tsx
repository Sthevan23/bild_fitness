import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-sm outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/50 focus:ring-4 focus:ring-[var(--ring)]',
        className,
      )}
      {...props}
    />
  );
}
