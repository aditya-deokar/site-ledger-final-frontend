'use client';

import { useMemo, useState } from 'react';
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
import { InvestorLedgerModal } from './investor-ledger-modal';
import { InvestorSheetFrame } from './investor-sheet-frame';
import { InvestorStatCard } from './investor-stat-card';
import { InvestorsList } from './investors-list';
import { InvestorsLoadingState } from './investors-loading-state';
import { UpdateInvestorForm } from './update-investor-form';
import type { InvestorTypeFilter } from './types';
import {
  formatINR,
  investorTypeTabs,
} from './utils';

export function InvestorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<InvestorTypeFilter>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const [deleteInvestor, setDeleteInvestor] = useState<Investor | null>(null);
  const [ledgerInvestor, setLedgerInvestor] = useState<Investor | null>(null);

  const activeSearchQuery = searchQuery.trim() || undefined;
  const { data, isLoading } = useInvestors(typeFilter, activeSearchQuery);

  const investors = data?.data?.investors ?? [];

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
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by investor, phone, or site"
                className="h-11 rounded-none border-slate-200 bg-background pl-10 pr-10 text-sm text-slate-700 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-slate-700"
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

        <div className="flex gap-1 border-b border-border">
          {investorTypeTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setTypeFilter(tab.key)}
              className={[
                'whitespace-nowrap border-b-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors -mb-px',
                typeFilter === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
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
          onOpenLedger={setLedgerInvestor}
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

      {ledgerInvestor && (
        <InvestorLedgerModal
          investor={ledgerInvestor}
          onClose={() => setLedgerInvestor(null)}
        />
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
