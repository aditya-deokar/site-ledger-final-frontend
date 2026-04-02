'use client';

import { useState } from 'react';
import { useCompanyExpenses } from '@/hooks/api/company.hooks';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, ChevronLeft, ChevronRight, Building2, User } from 'lucide-react';

function formatINR(n: number) { return '₹' + n.toLocaleString('en-IN'); }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function ExpensesSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-48 sm:h-12 sm:w-64" />
        <Skeleton className="h-4 w-72 sm:w-96 mt-2" />
      </div>

      {/* Stats Skeleton */}
      <div className="flex items-center gap-10">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-32 sm:h-12 sm:w-40" />
        </div>
        <div className="border-l border-border pl-10 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-48 sm:h-12 sm:w-64" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border border-border divide-y divide-border">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={cn(i === 2 ? 'col-span-3' : 'col-span-2', i === 1 ? 'col-span-1' : '')}>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="grid grid-cols-12 gap-4 px-6 py-6 items-center">
            <div className="col-span-1"><Skeleton className="h-4 w-12" /></div>
            <div className="col-span-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="col-span-2"><Skeleton className="h-4 w-24" /></div>
            <div className="col-span-2"><Skeleton className="h-8 w-16" /></div>
            <div className="col-span-2"><Skeleton className="h-4 w-32" /></div>
            <div className="col-span-2 text-right flex justify-end"><Skeleton className="h-5 w-24" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCompanyExpenses(page);

  const expenses = data?.data?.expenses ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;
  const totalAmount = expenses.reduce((s: number, e: any) => s + e.amount, 0);

  if (isLoading) {
    return (
      <DashboardShell>
        <ExpensesSkeleton />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl font-serif text-foreground tracking-tight">Expenses</h1>
            <p className="mt-2 text-base text-muted-foreground italic">
              All expenses across every site in your company.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-10">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mb-1.5">Total Expenses</p>
            <p className="text-3xl sm:text-4xl font-sans font-bold text-foreground tracking-tight">{total}</p>
          </div>
          <div className="border-l border-border pl-10">
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-1.5">Page Total</p>
            <p className="text-2xl sm:text-3xl font-sans font-bold text-red-500">{formatINR(totalAmount)}</p>
          </div>
        </div>

        {/* Table */}
        {expenses.length === 0 ? (
          <div className="border border-dashed border-border flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground italic">No expenses found.</p>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30">
              <div className="col-span-1 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Date</div>
              <div className="col-span-3 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Description</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Site</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Type</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Vendor</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Amount</div>
            </div>

            {expenses.map((e: any) => (
              <div key={e.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/20 transition-colors items-center">
                <div className="col-span-1">
                  <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{formatDate(e.createdAt)}</span>
                </div>
                <div className="col-span-3">
                  <p className="text-base text-foreground font-medium truncate">{e.description || e.reason || '—'}</p>
                  {e.reason && e.description && (
                    <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-tight truncate mt-1">{e.reason}</p>
                  )}
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  <span className="text-base text-muted-foreground truncate font-medium">{e.siteName}</span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <span className={cn(
                    'inline-block px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase border',
                    e.type === 'VENDOR'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                  )}>
                    {e.type}
                  </span>
                </div>
                <div className="col-span-2">
                  {e.vendorName ? (
                    <span className="flex items-center gap-2 text-base text-muted-foreground font-medium truncate">
                      <User className="w-4 h-4 shrink-0" /> {e.vendorName}
                    </span>
                  ) : (
                    <span className="text-base text-muted-foreground/40 font-medium">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-base lg:text-lg font-sans font-bold text-red-500">{formatINR(e.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40">
              Page {page} of {totalPages} ({total} expenses)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 rounded-none text-[9px] font-bold tracking-widest uppercase gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 rounded-none text-[9px] font-bold tracking-widest uppercase gap-1"
              >
                Next <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
