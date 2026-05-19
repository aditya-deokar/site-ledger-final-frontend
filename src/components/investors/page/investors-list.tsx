import {
  Eye,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardEmptyState, DashboardStatusBadge } from '@/components/dashboard/dashboard-primitives';
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
      <DashboardEmptyState description="No investors found." />
    );
  }

  return (
    <div className="overflow-hidden border border-border bg-card">
      <Table className="text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px] tracking-[0.18em]">Investor</TableHead>
            <TableHead className="text-[11px] tracking-[0.18em]">Type / Rate</TableHead>
            <TableHead className="text-[11px] tracking-[0.18em]">Site</TableHead>
            <TableHead className="text-[11px] tracking-[0.18em]">Invested</TableHead>
            <TableHead className="text-[11px] tracking-[0.18em]">Returned / Paid</TableHead>
            <TableHead className="text-[11px] tracking-[0.18em]">Outstanding</TableHead>
            <TableHead className="text-right text-[11px] tracking-[0.18em]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investors.map((investor) => (
            <TableRow key={investor.id} className="h-16">
              <TableCell className="text-sm">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center text-[10px] font-bold tracking-widest text-white',
                      avatarColor(investor.name),
                    )}
                  >
                    {initials(investor.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-foreground">
                      {investor.name}
                    </p>
                    {investor.phone && (
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {investor.phone}
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <DashboardStatusBadge
                    className={cn(
                      'text-[9px] tracking-widest',
                      investor.type === 'EQUITY'
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-600',
                    )}
                  >
                    {investor.type === 'EQUITY'
                      ? `${investor.equityPercentage ?? 0}% Equity`
                      : formatFixedRateTerms(investor.fixedRate, investor.fixedRateCadence)}
                  </DashboardStatusBadge>
                  {investor.isClosed ? (
                    <DashboardStatusBadge className="text-[9px] tracking-widest" tone="default">
                      Closed
                    </DashboardStatusBadge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{investor.siteName ?? '-'}</TableCell>
              <TableCell className="text-sm font-semibold text-foreground">{formatINR(investor.totalInvested)}</TableCell>
              <TableCell className="text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-red-500">
                    {formatINR(Math.max(investor.totalReturned - investor.interestPaid, 0))}
                  </p>
                  <p className="text-xs text-amber-600">
                    {investor.type === 'EQUITY' ? 'Profit Paid' : 'Interest'}: {formatINR(investor.interestPaid)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-sm font-semibold text-primary">
                {investor.type === 'FIXED_RATE' ? formatINR(investor.outstandingPrincipal) : '-'}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="control"
                    onClick={() => onOpenLedger(investor)}
                    title="Open Ledger"
                    aria-label={`Open ledger for ${investor.name}`}
                  >
                    <Eye className="h-4 w-4" />
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="control"
                    onClick={() => onEditInvestor(investor)}
                    title="Edit Investor"
                    aria-label={`Edit ${investor.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button type="button" size="icon-control" variant="outline" aria-label={`More actions for ${investor.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-none">
                      <DropdownMenuItem onClick={() => onOpenLedger(investor)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Open Ledger
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditInvestor(investor)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Investor
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDeleteInvestor(investor)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Investor
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
