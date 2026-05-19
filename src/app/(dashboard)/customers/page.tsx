'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAllCustomers } from '@/hooks/api/customer.hooks';
import type { CustomerGroup, CustomerWithSite } from '@/schemas/customer.schema';
import { groupCustomerDeals } from '@/lib/customer-grouping';
import { cn } from '@/lib/utils';
import { Search, Phone, Eye, Pencil, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DashboardEmptyState,
  DashboardFilterBar,
  DashboardPage,
  DashboardPageHeader,
  DashboardStatCard,
  DashboardStatsGrid,
} from '@/components/dashboard/dashboard-primitives';

function formatINR(n: number) { return '\u20B9' + n.toLocaleString('en-IN'); }

const COLORS = ['bg-teal-600', 'bg-blue-600', 'bg-amber-500', 'bg-rose-600', 'bg-violet-600', 'bg-emerald-600'];
function ac(n: string) { return COLORS[(n.charCodeAt(0) + (n.charCodeAt(1) || 0)) % COLORS.length]; }
function ini(n: string) { const p = n.trim().split(' '); return (p[0][0] + (p[1]?.[0] || '')).toUpperCase(); }

type StatusFilter = undefined | 'BOOKED' | 'SOLD';

function CustomersListSkeleton() {
  return (
    <div className="border border-border divide-y divide-border">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 lg:p-6 flex items-center gap-4">
          <Skeleton className="h-9 w-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="hidden lg:flex flex-1 gap-12">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const { data, isLoading } = useAllCustomers(statusFilter);
  const [search, setSearch] = useState('');

  const allCustomers = useMemo(() => {
    const raw = (data as { data?: { customers?: CustomerWithSite[] } })?.data?.customers ?? [];
    return raw;
  }, [data]);

  const groupedCustomers = useMemo(() => groupCustomerDeals(allCustomers), [allCustomers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groupedCustomers;
    const q = search.toLowerCase();
    return groupedCustomers.filter((group) => {
      const dealsText = group.deals.map((deal) => [
        deal.siteName,
        deal.wingName,
        deal.floorName ?? (deal.floorNumber !== null ? `floor ${deal.floorNumber}` : ''),
        deal.customFlatId ?? (deal.flatNumber !== null ? String(deal.flatNumber) : ''),
        deal.unitType,
      ].filter(Boolean).join(' ')).join(' ').toLowerCase();

      return (
        group.displayName.toLowerCase().includes(q) ||
        (group.phone && group.phone.includes(q)) ||
        (group.email && group.email.toLowerCase().includes(q)) ||
        dealsText.includes(q)
      );
    });
  }, [groupedCustomers, search]);

  const stats = useMemo(() => {
    const totalReceivable = filtered.reduce((sum, customer) => sum + customer.totalSellingPrice, 0);
    const totalReceived = filtered.reduce((sum, customer) => sum + customer.totalPaid, 0);
    const totalRemaining = filtered.reduce((sum, customer) => sum + customer.totalRemaining, 0);
    const totalDeals = filtered.reduce((sum, customer) => sum + customer.dealCount, 0);
    return { totalReceivable, totalReceived, totalRemaining, totalDeals };
  }, [filtered]);

  const handleSelectCustomer = useCallback((customer: CustomerGroup, action?: 'view' | 'edit' | 'delete') => {
    const groupId = encodeURIComponent(customer.groupKey);
    if (!action || action === 'view') {
      router.push(`/customers/${groupId}`);
      return;
    }

    router.push(`/customers/${groupId}?action=${action}`);
  }, [router]);

  const tabs: { key: StatusFilter; label: string }[] = useMemo(() => [
    { key: undefined, label: 'All' },
    { key: 'BOOKED', label: 'Booked' },
    { key: 'SOLD', label: 'Sold' },
  ], []);

  return (
    <DashboardPage className="space-y-8">
        <DashboardPageHeader
          eyebrow="Customer Ledger"
          title="Customers"
          subtitle="Track bookings, payments, and customer records across all sites."
          action={(
            <Button onClick={() => router.push('/navigator')} size="cta">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          )}
        />

        <DashboardFilterBar>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 border-b border-border overflow-x-auto pb-px">
            {tabs.map((t) => (
              <button
                key={t.label}
                onClick={() => setStatusFilter(t.key)}
              className={cn(
                  'px-5 py-3 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap',
                  statusFilter === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers, flat, floor, site..."
              className="h-10 border-none bg-muted pl-10 text-sm"
            />
          </div>
        </div>
        </DashboardFilterBar>

        {isLoading ? (
          <div className="space-y-8">
            <DashboardStatsGrid className="lg:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border border-border p-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </DashboardStatsGrid>
            <CustomersListSkeleton />
          </div>
        ) : (
          <>
            <DashboardStatsGrid className="lg:grid-cols-5">
              <DashboardStatCard label="Customers" value={String(filtered.length)} />
              <DashboardStatCard label="Total Flats" value={String(stats.totalDeals)} />
              <DashboardStatCard label="Total Receivable" value={formatINR(stats.totalReceivable)} />
              <DashboardStatCard label="Received" value={formatINR(stats.totalReceived)} tone="success" />
              <DashboardStatCard label="Outstanding" value={formatINR(stats.totalRemaining)} tone="danger" />
            </DashboardStatsGrid>

             {filtered.length === 0 ? (
              <DashboardEmptyState
                description={search ? 'No customers match your search.' : 'No customers found.'}
              />
            ) : (
              <div className="border border-border divide-y divide-border overflow-hidden">
                <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30">
                  <div className="col-span-6 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Customer Detail</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Paid Total</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Remaining</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Actions</div>
                </div>

                {filtered.map((group) => {
                  return (
                    <div
                      key={group.groupKey}
                      className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 lg:px-6 py-4 hover:bg-muted/20 transition-all duration-150 items-center text-left"
                    >
                      <div className="lg:col-span-6 flex items-center gap-3">
                        <div className={cn('w-9 h-9 flex items-center justify-center text-white text-[10px] font-bold tracking-widest shrink-0', ac(group.displayName))}>
                          {ini(group.displayName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-serif text-base tracking-tight text-foreground truncate">{group.displayName}</p>
                          {group.phone && (
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                              <Phone className="w-3 h-3" /> {group.phone}
                            </span>
                          )}
                          {group.email ? (
                            <p className="text-[11px] text-muted-foreground truncate mt-1">{group.email}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="lg:col-span-2">
                        <p className="text-base lg:text-lg font-sans font-bold text-emerald-600">{formatINR(group.totalPaid)}</p>
                      </div>

                      <div className="lg:col-span-2">
                        <span className={cn('text-base lg:text-lg font-sans font-bold', group.totalRemaining > 0 ? 'text-red-500' : 'text-emerald-600')}>
                          {formatINR(group.totalRemaining)}
                        </span>
                      </div>

                      <div className="lg:col-span-2 flex items-center justify-start lg:justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectCustomer(group, 'view')}
                          className="h-10 w-10 border border-border flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors"
                          aria-label={`View ${group.displayName}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectCustomer(group, 'edit')}
                          className="h-10 w-10 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          aria-label={`Edit ${group.displayName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectCustomer(group, 'delete')}
                          className="h-10 w-10 border border-border flex items-center justify-center text-muted-foreground hover:border-red-500/40 hover:text-red-500 transition-colors"
                          aria-label={`Delete ${group.displayName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </DashboardPage>
  );
}
