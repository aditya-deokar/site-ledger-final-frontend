'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { useAllCustomers } from '@/hooks/api/customer.hooks';
import { Customer } from '@/schemas/customer.schema';
import { cn } from '@/lib/utils';
import { Loader2, Search, Phone, Building2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

function formatINR(n: number) { return '₹' + n.toLocaleString('en-IN'); }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

const COLORS = ['bg-teal-600','bg-blue-600','bg-amber-500','bg-rose-600','bg-violet-600','bg-emerald-600'];
function ac(n: string) { return COLORS[(n.charCodeAt(0) + (n.charCodeAt(1) || 0)) % COLORS.length]; }
function ini(n: string) { const p = n.trim().split(' '); return (p[0][0] + (p[1]?.[0] || '')).toUpperCase(); }

type StatusFilter = undefined | 'BOOKED' | 'SOLD';

import { Skeleton } from '@/components/ui/skeleton';

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

function CustomersSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-10 w-48 sm:h-12 sm:w-64" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex gap-1 border-b border-border pb-px">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-20" />)}
        </div>
        <Skeleton className="h-10 w-full lg:w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-border p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <CustomersListSkeleton />
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const { data, isLoading } = useAllCustomers(statusFilter);
  const [search, setSearch] = useState('');

  const allCustomers = useMemo(() => {
    const raw = (data as any)?.data?.customers ?? [];
    return raw as (Customer & { siteId: string | null; siteName: string | null })[];
  }, [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allCustomers;
    const q = search.toLowerCase();
    return allCustomers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }, [allCustomers, search]);

  const stats = useMemo(() => {
    const totalReceivable = filtered.reduce((s, c) => s + c.sellingPrice, 0);
    const totalReceived = filtered.reduce((s, c) => s + c.amountPaid, 0);
    const totalRemaining = filtered.reduce((s, c) => s + c.remaining, 0);
    return { totalReceivable, totalReceived, totalRemaining };
  }, [filtered]);

  const handleSelectCustomer = useCallback(
    (customer: Customer & { siteId: string | null; siteName: string | null }) => {
      router.push(`/customers/${customer.id}`);
    },
    [router],
  );

  const tabs: { key: StatusFilter; label: string }[] = useMemo(() => [
    { key: undefined, label: 'All' },
    { key: 'BOOKED', label: 'Booked' },
    { key: 'SOLD', label: 'Sold' },
  ], []);


  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700">

        {/* Header */}
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif text-foreground tracking-tight">Customers</h1>
          <p className="mt-2 text-base text-muted-foreground italic">
            Track bookings, payments, and customer records across all sites.
          </p>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex gap-1 border-b border-border overflow-x-auto pb-px">
            {tabs.map((t) => (
              <button key={t.label} onClick={() => setStatusFilter(t.key)}
                className={cn(
                  'px-5 py-3 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap',
                  statusFilter === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >{t.label}</button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="pl-10 h-10 bg-muted border-none rounded-none text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
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
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Customers" value={String(filtered.length)} />
              <StatCard label="Total Receivable" value={formatINR(stats.totalReceivable)} />
              <StatCard label="Received" value={formatINR(stats.totalReceived)} color="text-emerald-600" />
              <StatCard label="Outstanding" value={formatINR(stats.totalRemaining)} color="text-red-500" />
            </div>

            {/* Customer Table / Empty State */}
            {filtered.length === 0 ? (
              <div className="border border-dashed border-border flex items-center justify-center py-20">
                <p className="text-sm text-muted-foreground italic">
                  {search ? 'No customers match your search.' : 'No customers found.'}
                </p>
              </div>
            ) : (
              <div className="border border-border divide-y divide-border overflow-hidden">
                {/* Header */}
                <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30">
                  <div className="col-span-3 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Customer</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Site / Flat</div>
                  <div className="col-span-1 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Status</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Selling Price</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Paid</div>
                  <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Remaining</div>
                </div>

                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 lg:px-6 py-4 hover:bg-muted/20 transition-colors items-center text-left"
                  >
                    {/* Customer Info */}
                    <div className="lg:col-span-3 flex items-center gap-3">
                      <div className={cn('w-9 h-9 flex items-center justify-center text-white text-[10px] font-bold tracking-widest shrink-0', ac(c.name))}>
                        {ini(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-serif text-base tracking-tight text-foreground truncate">{c.name}</p>
                        {c.phone && (
                          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                            <Phone className="w-3 h-3" /> {c.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Site / Flat Info */}
                    <div className="lg:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{(c as any).siteName ?? '—'}</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="shrink-0 flex items-center gap-1 font-bold">
                        F{c.floorNumber ?? '—'} <ChevronRight className="w-2 h-2" /> {c.customFlatId ?? c.flatNumber ?? '—'}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="lg:col-span-1 flex items-center lg:block">
                      <span className={cn(
                        'px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase inline-block',
                        c.dealStatus === 'CANCELLED'
                          ? 'bg-red-500/10 text-red-500'
                          : c.flatStatus === 'SOLD'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-amber-500/10 text-amber-600'
                      )}>
                        {c.dealStatus === 'CANCELLED' ? 'CANCELLED' : c.flatStatus}
                      </span>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 lg:contents gap-4 pt-2 lg:pt-0 border-t border-border/50 lg:border-none">
                      <div className="lg:col-span-2">
                        <p className="lg:hidden text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Selling</p>
                        <span className="text-base lg:text-lg font-sans font-bold text-foreground">{formatINR(c.sellingPrice)}</span>
                      </div>
                      <div className="lg:col-span-2">
                        <p className="lg:hidden text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Paid</p>
                        <span className="text-base lg:text-lg font-sans font-bold text-emerald-600">{formatINR(c.amountPaid)}</span>
                        <div className="mt-1 h-1 bg-muted overflow-hidden w-full lg:w-20">
                          <div className="h-full bg-primary" style={{ width: `${c.sellingPrice > 0 ? Math.min(100, (c.amountPaid / c.sellingPrice) * 100) : 0}%` }} />
                        </div>
                      </div>
                      <div className="lg:col-span-2 lg:text-right">
                        <p className="lg:hidden text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1 text-left">Remaining</p>
                        <span className={cn('text-base lg:text-lg font-sans font-bold', c.remaining > 0 ? 'text-red-500' : 'text-emerald-600')}>
                          {formatINR(c.remaining)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
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
