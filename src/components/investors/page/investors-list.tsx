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
    <div className="divide-y divide-border border border-border">
      <div className="grid grid-cols-12 gap-4 bg-muted/30 px-6 py-4">
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
          className="group grid grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/20"
        >
          <div className="col-span-3 flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center text-[11px] font-bold tracking-widest text-white',
                avatarColor(investor.name),
              )}
            >
              {initials(investor.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-base tracking-tight text-foreground">
                {investor.name}
              </p>
              {investor.phone && (
                <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Phone className="h-3 w-3" /> {investor.phone}
                </span>
              )}
            </div>
          </div>

          <div className="col-span-2 flex items-center gap-2">
            <span
              className={cn(
                'inline-block border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest',
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
              <span className="bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Closed
              </span>
            )}
          </div>

          <div className="col-span-2 truncate text-base font-medium text-muted-foreground">
            {investor.siteName ?? '-'}
          </div>

          <div className="col-span-2">
            <p className="text-base font-bold tracking-tight text-foreground lg:text-lg">
              {formatINR(investor.totalInvested)}
            </p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Invested
            </p>
            {Math.max(investor.totalReturned - investor.interestPaid, 0) > 0 && (
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-red-500">
                Principal Returned: {formatINR(Math.max(investor.totalReturned - investor.interestPaid, 0))}
              </p>
            )}
            {investor.interestPaid > 0 && (
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-amber-600">
                {investor.type === 'EQUITY' ? 'Profit Paid' : 'Interest'}: {formatINR(investor.interestPaid)}
              </p>
            )}
            {investor.type === 'FIXED_RATE' && investor.outstandingPrincipal > 0 && (
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                Outstanding: {formatINR(investor.outstandingPrincipal)}
              </p>
            )}
          </div>

          <div className="col-span-3 flex justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenLedger(investor)}
              className="h-8 gap-1 border-primary/30 text-[9px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 hover:text-primary"
            >
              <Eye className="h-3 w-3" /> Ledger & Actions
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditInvestor(investor)}
              className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteInvestor(investor)}
              className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
