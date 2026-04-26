'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { useAllCustomers } from '@/hooks/api/customer.hooks';
import type { CustomerGroup, CustomerWithSite } from '@/schemas/customer.schema';
import { groupCustomerDeals } from '@/lib/customer-grouping';
import { cn } from '@/lib/utils';
import { Search, Phone, Building2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

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

  const handleSelectCustomer = useCallback((customer: CustomerGroup) => {
    const targetDeal = customer.deals[0];
    if (!targetDeal) return;
    router.push(`/customers/${targetDeal.id}`);
  }, [router]);

  const tabs: { key: StatusFilter; label: string }[] = useMemo(() => [
    { key: undefined, label: 'All' },
    { key: 'BOOKED', label: 'Booked' },
    { key: 'SOLD', label: 'Sold' },
  ], []);

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground tracking-tight">Customers</h1>
          <p className="mt-2 text-base text-muted-foreground italic">
            Track bookings, payments, and customer records across all sites.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
              className="pl-10 h-10 bg-muted border-none rounded-none text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border border-border p-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
            <CustomersListSkeleton />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard label="Customers" value={String(filtered.length)} />
              <StatCard label="Total Flats" value={String(stats.totalDeals)} />
              <StatCard label="Total Receivable" value={formatINR(stats.totalReceivable)} />
              <StatCard label="Received" value={formatINR(stats.totalReceived)} color="text-emerald-600" />
              <StatCard label="Outstanding" value={formatINR(stats.totalRemaining)} color="text-red-500" />
            </div>

            {filtered.length === 0 ? (
              <div className="border border-dashed border-border flex items-center justify-center py-20">
                <p className="text-sm text-muted-foreground italic">
                  {search ? 'No customers match your search.' : 'No customers found.'}
                </p>
              </div>
            ) : (
              <div className="border border-border divide-y divide-border overflow-hidden">
                <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30">
                  <div className="col-span-3 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Customer</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Flats / Sites</div>
                  <div className="col-span-1 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Status</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Selling Price</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Paid</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Remaining</div>
                </div>

                {filtered.map((group) => {
                  const latestDeal = group.deals[0];
                  const siteCount = new Set(group.deals.map((deal) => deal.siteId).filter(Boolean)).size;
                  const isAllCancelled = group.deals.every((deal) => deal.dealStatus === 'CANCELLED');
                  const hasAnySold = group.deals.some((deal) => deal.flatStatus === 'SOLD' && deal.dealStatus !== 'CANCELLED');
                  const statusLabel = isAllCancelled ? 'CANCELLED' : hasAnySold ? 'SOLD' : 'BOOKED';

                  return (
                    <button
                      key={group.groupKey}
                      onClick={() => handleSelectCustomer(group)}
                      aria-label={`View details for ${group.displayName}`}
                      className="group w-full grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 lg:px-6 py-4 hover:bg-muted/30 hover:border-l-4 hover:border-l-primary transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer items-center text-left"
                    >
                      <div className="lg:col-span-3 flex items-center gap-3">
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
                        </div>
                      </div>

                      <div className="lg:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{siteCount} site{siteCount === 1 ? '' : 's'}</span>
                        <span className="text-muted-foreground/30">\u00b7</span>
                        <span className="shrink-0 flex items-center gap-1 font-bold">
                          {group.dealCount} flat{group.dealCount === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="lg:col-span-1 flex items-center lg:block">
                        <span className={cn(
                          'px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase inline-block',
                          statusLabel === 'CANCELLED'
                            ? 'bg-red-500/10 text-red-500'
                            : statusLabel === 'SOLD'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-amber-500/10 text-amber-600',
                        )}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 lg:contents gap-4 pt-2 lg:pt-0 border-t border-border/50 lg:border-none">
                        <div className="lg:col-span-2">
                          <p className="lg:hidden text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Selling</p>
                          <span className="text-base lg:text-lg font-sans font-bold text-foreground">{formatINR(group.totalSellingPrice)}</span>
                        </div>
                        <div className="lg:col-span-2">
                          <p className="lg:hidden text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Paid</p>
                          <span className="text-base lg:text-lg font-sans font-bold text-emerald-600">{formatINR(group.totalPaid)}</span>
                          <div className="mt-1 h-1 bg-muted overflow-hidden w-full lg:w-20">
                            <div className="h-full bg-primary" style={{ width: `${group.totalSellingPrice > 0 ? Math.min(100, (group.totalPaid / group.totalSellingPrice) * 100) : 0}%` }} />
                          </div>
                        </div>
                        <div className="lg:col-span-2 lg:text-right flex items-center justify-between lg:justify-end gap-2">
                          <div>
                            <p className="lg:hidden text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1 text-left">Remaining</p>
                            <span className={cn('text-base lg:text-lg font-sans font-bold', group.totalRemaining > 0 ? 'text-red-500' : 'text-emerald-600')}>
                              {formatINR(group.totalRemaining)}
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
                        </div>
                      </div>

                      {latestDeal && (
                        <div className="lg:col-span-12 text-[10px] text-muted-foreground/60">
                          Latest: {latestDeal.siteName || 'Unknown site'} / {latestDeal.wingName ? `${latestDeal.wingName} / ` : ''}{latestDeal.floorName || (latestDeal.floorNumber !== null ? `Floor ${latestDeal.floorNumber}` : 'Floor -')} / {latestDeal.customFlatId || (latestDeal.flatNumber !== null ? `Flat ${latestDeal.flatNumber}` : 'Flat -')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-border p-5 min-w-0">
      <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/40 truncate">{label}</p>
      <p className={cn('text-2xl sm:text-3xl font-sans font-bold tracking-tight mt-1.5 truncate', color ?? 'text-foreground')}>{value}</p>
    </div>
  );
}
