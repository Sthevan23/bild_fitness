import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({
  label,
  htmlFor,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className={error ? 'text-destructive' : undefined}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
