import type { ComponentType } from 'react';

import { cn } from '@/lib/utils';

export function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="min-w-0 border border-border p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground/50" />
        <p className="truncate text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
          {label}
        </p>
      </div>
      <p
        className={cn(
          'mt-2 truncate text-2xl font-sans font-bold tracking-tight sm:text-3xl',
          color ?? 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}
