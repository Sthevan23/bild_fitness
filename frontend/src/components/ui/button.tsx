import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'icon';
};

export function Button({ className, variant = 'default', size = 'default', ...props }: Props) {
  const variants = {
    default:
      'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:brightness-110 active:brightness-95',
    secondary: 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]',
    outline: 'border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)]/30',
    ghost: 'hover:bg-[var(--muted)]',
    destructive: 'bg-[var(--destructive)] text-white hover:brightness-110',
  };
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    icon: 'h-10 w-10',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition duration-150 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
