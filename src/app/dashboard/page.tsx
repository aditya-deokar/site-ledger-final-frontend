'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMe } from '@/hooks/api/auth.hooks';
import { useCompany, useActivity } from '@/hooks/api/company.hooks';
import { useSites } from '@/hooks/api/site.hooks';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, TrendingUp, Wallet, Users, Landmark, ArrowUpRight, Building2, Receipt, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatINR(n: number) { return '₹' + Math.abs(n).toLocaleString('en-IN'); }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase();
}

const ACTIVITY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  withdrawal:  { icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-500/10' },
  site_fund:   { icon: Building2,    color: 'text-blue-500', bg: 'bg-blue-500/10' },
  investor_tx: { icon: Banknote,     color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  expense:     { icon: Receipt,      color: 'text-amber-600', bg: 'bg-amber-500/10' },
};

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-64 sm:h-12 sm:w-80" />
        <Skeleton className="h-4 w-48 sm:w-64 mt-2" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-muted/50 p-6 border-none shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-muted/50 p-6 border-none shadow-sm h-[400px]">
            <Skeleton className="h-6 w-32 mb-8" />
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: userData, isLoading: isUserLoading, isError: isUserError } = useMe();
  const { data: companyData, isLoading: isCompanyLoading, error: companyError } = useCompany();
  const { data: activityData, fetchNextPage, hasNextPage, isFetchingNextPage } = useActivity();
  const { data: sitesData } = useSites();

  const activityScrollRef = useRef<HTMLDivElement>(null);
  const handleActivityScroll = useCallback(() => {
    const el = activityScrollRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (isUserError) {
      router.push('/login');
    }
  }, [isUserError, router]);

  useEffect(() => {
    if (companyError && (companyError as any).message?.includes('No company found')) {
      router.push('/setup-company');
    }
  }, [companyError, router]);

  if (isUserLoading || isCompanyLoading) {
    return (
      <DashboardShell>
        <DashboardSkeleton />
      </DashboardShell>
    );
  }

  if (!companyData?.data?.company) return null;

  const { company, partner_fund, investor_fund, total_fund, available_fund } = companyData.data;
  const activities = activityData?.pages?.flatMap((p: any) => p?.data?.activities ?? []) ?? [];
  const sites = (sitesData?.data?.sites ?? []).filter((s: any) => s.isActive);

  const stats = [
    {
      title: "Total Funds",
      value: `₹${total_fund.toLocaleString('en-IN')}`,
      description: "Ledger-derived partner and investor capital",
      icon: Wallet,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Available Funds",
      value: `₹${available_fund.toLocaleString('en-IN')}`,
      description: "Company wallet balance available for sites",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Partner Capital",
      value: `₹${partner_fund.toLocaleString('en-IN')}`,
      description: "Ledger-backed partner capital",
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50"
    },
    {
      title: "Investor Capital",
      value: `₹${investor_fund.toLocaleString('en-IN')}`,
      description: "Ledger-backed fixed-rate capital",
      icon: Landmark,
      color: "text-amber-600",
      bg: "bg-amber-50"
    }
  ];

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif text-gray-900 dark:text-zinc-50 tracking-tight transition-all">
            Welcome back, {userData?.data?.user?.firstName || 'User'}
          </h1>
          <p className="mt-2 text-xs sm:text-base font-medium tracking-[0.2em] text-gray-400 dark:text-zinc-500 uppercase truncate">
            Overview of {company.name}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-none shadow-sm dark:bg-zinc-950/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bg} p-2 rounded-none`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl sm:text-4xl font-sans font-bold tracking-tight">{stat.value}</div>
                <p className="text-[11px] sm:text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <CardTitle className="text-lg font-serif tracking-tight">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No recent activity to show.</p>
              ) : (
                <div
                  ref={activityScrollRef}
                  onScroll={handleActivityScroll}
                  className="flex flex-col divide-y divide-border max-h-[400px] overflow-y-auto pr-1"
                >
                  {activities.map((a: any) => {
                    const config = ACTIVITY_CONFIG[a.type] ?? ACTIVITY_CONFIG.withdrawal;
                    const Icon = config.icon;
                    return (
                      <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className={cn('w-8 h-8 flex items-center justify-center shrink-0', config.bg)}>
                          <Icon className={cn('w-3.5 h-3.5', config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base text-foreground truncate">{a.description}</p>
                          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40 mt-1">
                            {formatDate(a.date)}
                          </p>
                        </div>
                        <span className={cn('text-base sm:text-lg font-sans font-bold shrink-0', a.amount >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {a.amount >= 0 ? '+' : '-'}{formatINR(a.amount)}
                        </span>
                      </div>
                    );
                  })}
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Sites */}
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <CardTitle className="text-lg font-serif tracking-tight">Active Sites</CardTitle>
            </CardHeader>
            <CardContent>
              {sites.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No active sites found.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {sites.slice(0, 6).map((site: any) => (
                    <Link key={site.id} href={`/sites/${site.slug}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 transition-colors">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-foreground font-medium truncate">{site.name}</p>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40 mt-1">
                          {site.totalFlats || 0} flats
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-sans font-bold text-primary">{formatINR(site.remainingFund)}</p>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40 mt-1">Site Balance</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
