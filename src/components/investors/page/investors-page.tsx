'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInvestors } from '@/hooks/api/investor.hooks';
import type { Investor } from '@/schemas/investor.schema';

import { AddInvestorForm } from './add-investor-form';
import { DeleteInvestorConfirm } from './delete-investor-confirm';
import { InvestorSheetFrame } from './investor-sheet-frame';
import { InvestorStatCard } from './investor-stat-card';
import { InvestorsList } from './investors-list';
import { InvestorsLoadingState } from './investors-loading-state';
import { UpdateInvestorForm } from './update-investor-form';
import type { InvestorTypeFilter } from './types';
import {
  formatINR,
} from './utils';

export function InvestorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<InvestorTypeFilter>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const [deleteInvestor, setDeleteInvestor] = useState<Investor | null>(null);

  const activeSearchQuery = searchQuery.trim() || undefined;
  const { data, isLoading } = useInvestors(undefined, activeSearchQuery);

  const allInvestors = data?.data?.investors ?? [];

  const tabs = useMemo(() => {
    const uniqueTypes = Array.from(new Set(allInvestors.map((investor) => investor.type)));

    return [
      { key: undefined, label: 'ALL' },
      ...uniqueTypes.map((type) => ({
        key: type as InvestorTypeFilter,
        label: type.replaceAll('_', ' '),
      })),
    ];
  }, [allInvestors]);

  const investors = useMemo(
    () => allInvestors.filter((investor) => !typeFilter || investor.type === typeFilter),
    [allInvestors, typeFilter],
  );

  const stats = useMemo(() => ({
    totalInvested: investors.reduce((sum, investor) => sum + investor.totalInvested, 0),
    totalPrincipalReturned: investors.reduce(
      (sum, investor) => sum + Math.max(investor.totalReturned - investor.interestPaid, 0),
      0,
    ),
    totalInterestPaid: investors.reduce((sum, investor) => sum + investor.interestPaid, 0),
    totalOutstanding: investors
      .filter((investor) => investor.type === 'FIXED_RATE')
      .reduce((sum, investor) => sum + investor.outstandingPrincipal, 0),
  }), [investors]);

  if (isLoading) {
    return <InvestorsLoadingState />;
  }

  return (
    <>
      <div className="animate-in fade-in space-y-8 duration-700">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-serif tracking-tight text-foreground sm:text-5xl">
              Investors
            </h1>
            <p className="mt-2 text-base italic text-muted-foreground">
              Manage equity and fixed-rate investors across your company.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by investor, phone, or site"
                className="h-11 rounded-none border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                  aria-label="Clear investor search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={() => setAddOpen(true)}
              className="h-11 gap-2 px-8 text-xs font-bold uppercase tracking-widest"
            >
              <Plus className="h-4 w-4" /> Add Investor
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setTypeFilter(tab.key)}
              className={[
                'border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap rounded-none',
                typeFilter === tab.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <InvestorStatCard
            label="Total Capital Committed"
            value={formatINR(stats.totalInvested)}
          />
          <InvestorStatCard
            label="Principal Returned"
            value={formatINR(stats.totalPrincipalReturned)}
            valueClassName="text-red-500"
          />
          <InvestorStatCard
            label="Yield / Profit Paid"
            value={formatINR(stats.totalInterestPaid)}
            valueClassName="text-amber-600"
          />
          <InvestorStatCard
            label="Outstanding Principal"
            value={formatINR(stats.totalOutstanding)}
            valueClassName="text-primary"
          />
        </div>

        <InvestorsList
          investors={investors}
          onOpenLedger={(investor) => router.push(`/investors/${investor.id}`)}
          onEditInvestor={setEditInvestor}
          onDeleteInvestor={setDeleteInvestor}
        />
      </div>

      {addOpen && (
        <InvestorSheetFrame
          open={addOpen}
          onOpenChange={setAddOpen}
          title="Add Investor"
        >
          <AddInvestorForm onClose={() => setAddOpen(false)} />
        </InvestorSheetFrame>
      )}

      {editInvestor && (
        <InvestorSheetFrame
          open={Boolean(editInvestor)}
          onOpenChange={(open) => {
            if (!open) setEditInvestor(null);
          }}
          title="Update Investor"
        >
          <UpdateInvestorForm investor={editInvestor} onClose={() => setEditInvestor(null)} />
        </InvestorSheetFrame>
      )}

      {deleteInvestor && (
        <DeleteInvestorConfirm
          investor={deleteInvestor}
          onClose={() => setDeleteInvestor(null)}
        />
      )}
    </>
  );
}
