import {
  Eye,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Investor } from '@/schemas/investor.schema';

import {
  avatarColor,
  formatINR,
  initials,
} from './utils';
import { formatFixedRateTerms } from '@/lib/investors';

export function InvestorsList({
  investors,
  onOpenLedger,
  onEditInvestor,
  onDeleteInvestor,
}: {
  investors: Investor[];
  onOpenLedger: (investor: Investor) => void;
  onEditInvestor: (investor: Investor) => void;
  onDeleteInvestor: (investor: Investor) => void;
}) {
  if (investors.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-border py-20">
        <p className="text-sm italic text-muted-foreground">No investors found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden divide-y divide-border border border-border">
      <div className="hidden grid-cols-12 gap-4 bg-muted/40 px-6 py-4 lg:grid">
        <div className="col-span-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Investor Detail
        </div>
        <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Type / Rate
        </div>
        <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Site
        </div>
        <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Totals
        </div>
        <div className="col-span-3 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Actions
        </div>
      </div>

      {investors.map((investor) => (
        <div
          key={investor.id}
          className="group grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-muted/20 sm:px-6 lg:grid-cols-12 lg:items-center"
        >
          <div className="flex items-center gap-3 lg:col-span-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center text-[10px] font-bold tracking-widest text-white',
                avatarColor(investor.name),
              )}
            >
              {initials(investor.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-[22px] leading-none tracking-tight text-foreground sm:text-base">
                {investor.name}
              </p>
              {investor.phone && (
                <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Phone className="h-3 w-3" /> {investor.phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 lg:col-span-2">
            <span
              className={cn(
                'inline-block border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                investor.type === 'EQUITY'
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-600',
              )}
              >
                {investor.type === 'EQUITY'
                  ? `${investor.equityPercentage ?? 0}%`
                  : formatFixedRateTerms(investor.fixedRate, investor.fixedRateCadence)}
              </span>
            {investor.isClosed && (
              <span className="bg-muted px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Closed
              </span>
            )}
          </div>

          <div className="truncate text-sm font-medium text-muted-foreground lg:col-span-2">
            {investor.siteName ?? '-'}
          </div>

          <div className="lg:col-span-2">
            <p className="text-base font-bold tracking-tight text-foreground">
              {formatINR(investor.totalInvested)}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Invested
            </p>
            {Math.max(investor.totalReturned - investor.interestPaid, 0) > 0 && (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-500">
                Principal Returned: {formatINR(Math.max(investor.totalReturned - investor.interestPaid, 0))}
              </p>
            )}
            {investor.interestPaid > 0 && (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                {investor.type === 'EQUITY' ? 'Profit Paid' : 'Interest'}: {formatINR(investor.interestPaid)}
              </p>
            )}
            {investor.type === 'FIXED_RATE' && investor.outstandingPrincipal > 0 && (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                Outstanding: {formatINR(investor.outstandingPrincipal)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:col-span-3 lg:justify-end">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onOpenLedger(investor)}
              className="h-9 w-9 rounded-none border-border bg-background text-foreground hover:bg-muted hover:text-foreground"
              title="Open Ledger"
              aria-label={`Open ledger for ${investor.name}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditInvestor(investor)}
              className="h-9 w-9 rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              title="Edit Investor"
              aria-label={`Edit ${investor.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteInvestor(investor)}
              className="h-9 w-9 rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              title="Delete Investor"
              aria-label={`Delete ${investor.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
