import { cn } from '@/lib/utils';

export function InvestorStatCard({
  label,
  value,
  valueClassName = 'text-foreground',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 border border-border bg-background p-5">
      <p className="truncate text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
        {label}
      </p>
      <p className={cn('mt-2 truncate text-2xl font-sans font-bold tracking-tight sm:text-3xl', valueClassName)}>
        {value}
      </p>
    </div>
  );
}
