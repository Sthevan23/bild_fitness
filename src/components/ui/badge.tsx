import { cn } from '@/lib/utils';

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?:
    | 'default'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'destructive'
    | 'outline'
    | 'info'
    | 'violet'
    | 'orange';
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    success: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    destructive: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    outline: 'text-foreground',
    info: 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    violet: 'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    orange: 'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  };
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
