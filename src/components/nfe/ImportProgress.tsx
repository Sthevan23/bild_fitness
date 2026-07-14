'use client';

import { Progress } from '@/components/ui/progress';

export function ImportProgress({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}
