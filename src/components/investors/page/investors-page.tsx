'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Filter,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  DashboardFilterBar,
  DashboardPage,
  DashboardPageHeader,
  DashboardStatusBadge,
  DashboardStatsGrid,
} from '@/components/dashboard/dashboard-primitives';
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('');
  const [typeModalFilter, setTypeModalFilter] = useState<'ALL' | 'EQUITY' | 'FIXED_RATE'>('ALL');
  const [minInvested, setMinInvested] = useState('');
  const [maxInvested, setMaxInvested] = useState('');
  const [minOutstanding, setMinOutstanding] = useState('');
  const [maxOutstanding, setMaxOutstanding] = useState('');
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

  const siteOptions = useMemo(
    () => Array.from(new Set(allInvestors.map((i) => i.siteName).filter(Boolean))) as string[],
    [allInvestors],
  );

  const investors = useMemo(() => {
    const minInv = minInvested ? Number(minInvested) : undefined;
    const maxInv = maxInvested ? Number(maxInvested) : undefined;
    const minOut = minOutstanding ? Number(minOutstanding) : undefined;
    const maxOut = maxOutstanding ? Number(maxOutstanding) : undefined;

    return allInvestors.filter((investor) => {
      if (typeFilter && investor.type !== typeFilter) return false;
      if (typeModalFilter !== 'ALL' && investor.type !== typeModalFilter) return false;
      if (statusFilter === 'OPEN' && investor.isClosed) return false;
      if (statusFilter === 'CLOSED' && !investor.isClosed) return false;
      if (siteFilter && (investor.siteName || '') !== siteFilter) return false;
      if (minInv !== undefined && investor.totalInvested < minInv) return false;
      if (maxInv !== undefined && investor.totalInvested > maxInv) return false;
      if (minOut !== undefined && investor.outstandingPrincipal < minOut) return false;
      if (maxOut !== undefined && investor.outstandingPrincipal > maxOut) return false;
      return true;
    });
  }, [allInvestors, typeFilter, typeModalFilter, statusFilter, siteFilter, minInvested, maxInvested, minOutstanding, maxOutstanding]);

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
      <DashboardPage className="space-y-8 duration-700">
        <DashboardPageHeader
          eyebrow="Capital Partners"
          title="Investors"
          subtitle="Manage equity and fixed-rate investors across your company."
          action={(
            <Button onClick={() => setAddOpen(true)} size="cta">
              <Plus className="h-4 w-4" /> Add Investor
            </Button>
          )}
        />

        <DashboardFilterBar>
        <div className="flex w-full gap-2 lg:w-auto">
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by investor, phone, or site"
              className="h-10 rounded-none border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50"
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
          <Button variant="outline" size="control" onClick={() => setFilterOpen(true)}>
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>
        </DashboardFilterBar>

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

        {(statusFilter !== 'ALL' || siteFilter || typeModalFilter !== 'ALL' || minInvested || maxInvested || minOutstanding || maxOutstanding) && (
          <div className="flex flex-wrap items-center gap-2">
            <DashboardStatusBadge tone="primary">Advanced Filters Active</DashboardStatusBadge>
          </div>
        )}

        <DashboardStatsGrid>
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
        </DashboardStatsGrid>

        <InvestorsList
          investors={investors}
          onOpenLedger={(investor) => router.push(`/investors/${investor.id}`)}
          onEditInvestor={setEditInvestor}
          onDeleteInvestor={setDeleteInvestor}
        />
      </DashboardPage>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle>Filter Investors</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-none border border-border bg-muted/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Status</p>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'OPEN' | 'CLOSED')} className="mt-2 h-10 w-full border border-border bg-background px-2 text-sm">
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="rounded-none border border-border bg-muted/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Investor Type</p>
              <select value={typeModalFilter} onChange={(e) => setTypeModalFilter(e.target.value as 'ALL' | 'EQUITY' | 'FIXED_RATE')} className="mt-2 h-10 w-full border border-border bg-background px-2 text-sm">
                <option value="ALL">All</option>
                <option value="EQUITY">Equity</option>
                <option value="FIXED_RATE">Fixed Rate</option>
              </select>
            </div>

            <div className="rounded-none border border-border bg-muted/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Site</p>
              <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="mt-2 h-10 w-full border border-border bg-background px-2 text-sm">
                <option value="">All</option>
                {siteOptions.map((site) => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>

            <div className="rounded-none border border-border bg-muted/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Invested Amount Range</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input type="number" value={minInvested} onChange={(e) => setMinInvested(e.target.value)} placeholder="Min invested" />
                <Input type="number" value={maxInvested} onChange={(e) => setMaxInvested(e.target.value)} placeholder="Max invested" />
              </div>
            </div>

            <div className="rounded-none border border-border bg-muted/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Outstanding Principal Range</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input type="number" value={minOutstanding} onChange={(e) => setMinOutstanding(e.target.value)} placeholder="Min outstanding" />
                <Input type="number" value={maxOutstanding} onChange={(e) => setMaxOutstanding(e.target.value)} placeholder="Max outstanding" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('ALL');
                setSiteFilter('');
                setTypeModalFilter('ALL');
                setMinInvested('');
                setMaxInvested('');
                setMinOutstanding('');
                setMaxOutstanding('');
              }}
            >
              Reset
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

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
