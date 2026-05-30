import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { type ReactNode as IconType } from 'react';
import { Building2 } from 'lucide-react';

export function DetailPair({ label, value, icon: Icon, tooltip }: { label: string; value: string | number | null | undefined; icon?: typeof Building2; tooltip?: string }) {
  return (
    <div className="space-y-1 border border-border/60 bg-muted/20 p-3 glass">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center">
        {Icon && <Icon className="h-4 w-4 mr-1" />}
        {label}
        {tooltip && (
          <span className="ml-1 text-xs italic text-muted-foreground/70" title={tooltip}>?</span>
        )}
      </p>
      <p className="text-sm font-semibold text-foreground">{value || '-'}</p>
    </div>
  );
}

export function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</p>
      <p className={cn('mt-2 text-2xl font-serif text-foreground', tone)}>{value}</p>
    </div>
  );
}

export function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 border border-border/60 bg-background/80 px-3 py-2">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center border border-border/60 bg-muted/40 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value || '-'}</p>
      </div>
    </div>
  );
}

export function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-foreground">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
