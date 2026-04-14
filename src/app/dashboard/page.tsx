'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Banknote,
  Building2,
  Landmark,
  Loader2,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/api/auth.hooks';
import { useActivity, useCompany } from '@/hooks/api/company.hooks';
import { useSites } from '@/hooks/api/site.hooks';
import { cn } from '@/lib/utils';

const INR_SYMBOL = '\u20B9';

function normalizeAmount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatINR(value: number) {
  return `${INR_SYMBOL}${Math.abs(normalizeAmount(value)).toLocaleString('en-IN')}`;
}

function formatSignedINR(value: number) {
  const amount = normalizeAmount(value);
  return `${amount < 0 ? '-' : '+'}${formatINR(amount)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  }).toUpperCase();
}

const ACTIVITY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  withdrawal: { icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-500/10' },
  site_fund: { icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  investor_tx: { icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  expense: { icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-500/10' },
};

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-3">
        <Skeleton className="mt-2 h-10 w-64 sm:h-12 sm:w-80" />
        <Skeleton className="h-4 w-48 sm:w-64" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-4 border-none bg-muted/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-[400px] border-none bg-muted/50 p-6 shadow-sm">
            <Skeleton className="mb-8 h-6 w-32" />
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
  const {
    data: activityData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivity({
    enabled: !!companyData?.data?.company,
  });
  const { data: sitesData } = useSites({
    enabled: !!companyData?.data?.company,
  });

  const activityScrollRef = useRef<HTMLDivElement>(null);

  const handleActivityScroll = useCallback(() => {
    const element = activityScrollRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) return;

    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 40) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    if (isUserError) {
      router.push('/login');
    }
  }, [isUserError, router]);

  useEffect(() => {
    const err = companyError as any;
    if (err && (err.error?.includes('No company found') || err.status === 404)) {
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
  const activities = activityData?.pages?.flatMap((page: any) => page?.data?.activities ?? []) ?? [];
  const sites = (sitesData?.data?.sites ?? []).filter((site: any) => site.isActive);

  const stats = [
    {
      title: 'Total Funds',
      value: formatINR(total_fund),
      description: 'Ledger-derived partner and investor capital',
      icon: Wallet,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Available Funds',
      value: formatINR(available_fund),
      description: 'Company wallet balance available for sites',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Partner Capital',
      value: formatINR(partner_fund),
      description: 'Ledger-backed partner capital',
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      title: 'Investor Capital',
      value: formatINR(investor_fund),
      description: 'Ledger-backed fixed-rate capital',
      icon: Landmark,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <DashboardShell>
      <div className="animate-in space-y-8 fade-in duration-700">
        <div>
          <h1 className="text-3xl font-serif tracking-tight text-gray-900 transition-all dark:text-zinc-50 sm:text-4xl">
            Welcome back, {userData?.data?.user?.firstName || 'User'}
          </h1>
          <p className="mt-2 truncate text-xs font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 sm:text-base">
            Overview of {company.name}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-none shadow-sm dark:bg-zinc-950/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bg} rounded-none p-2`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-sans font-bold tracking-tight sm:text-4xl">{stat.value}</div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <CardTitle className="text-lg font-serif tracking-tight">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">No recent activity to show.</p>
              ) : (
                <div
                  ref={activityScrollRef}
                  onScroll={handleActivityScroll}
                  className="flex max-h-[400px] flex-col divide-y divide-border overflow-y-auto pr-1"
                >
                  {activities.map((activity: any) => {
                    const config = ACTIVITY_CONFIG[activity.type] ?? ACTIVITY_CONFIG.withdrawal;
                    const Icon = config.icon;

                    return (
                      <div key={activity.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center', config.bg)}>
                          <Icon className={cn('h-3.5 w-3.5', config.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base text-foreground">{activity.description}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 text-base font-sans font-bold sm:text-lg',
                            activity.amount >= 0 ? 'text-emerald-600' : 'text-red-500',
                          )}
                        >
                          {activity.amount >= 0 ? '+' : '-'}
                          {formatINR(activity.amount)}
                        </span>
                      </div>
                    );
                  })}

                  {isFetchingNextPage && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm dark:bg-zinc-950/50">
            <CardHeader>
              <CardTitle className="text-lg font-serif tracking-tight">Active Sites</CardTitle>
            </CardHeader>
            <CardContent>
              {sites.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">No active sites found.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {sites.slice(0, 6).map((site: any) => {
                    const totalProfit = normalizeAmount(site.totalProfit);

                    return (
                      <Link
                        key={site.id}
                        href={`/sites/${site.id}`}
                        className="-mx-2 flex items-center gap-3 px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/30"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary/10">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-medium text-foreground">{site.name}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                            {site.totalFlats || 0} flats
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-sans font-bold text-primary">{formatINR(site.remainingFund)}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                            Site Balance
                          </p>
                          <p
                            className={cn(
                              'mt-2 text-sm font-sans font-bold',
                              totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500',
                            )}
                          >
                            {formatSignedINR(totalProfit)}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                            Total Profit
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
