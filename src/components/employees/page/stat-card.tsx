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
    <div className="min-w-0 border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
        <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
          {label}
        </p>
      </div>
      <p
        className={cn(
          'mt-1.5 truncate text-xl font-sans font-bold tracking-tight sm:text-2xl',
          color ?? 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}
