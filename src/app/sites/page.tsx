'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  Grid3x3,
  Layers,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { CreateSiteDrawer } from '@/components/dashboard/create-site-drawer';
import { useDeleteSite, useSites, useToggleSite } from '@/hooks/api/site.hooks';
import { Site, Wing } from '@/schemas/site.schema';
import { siteService } from '@/services/site.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

type ViewMode = 'active' | 'closed';
type ProjectFilter = 'all' | 'NEW_CONSTRUCTION' | 'REDEVELOPMENT';
type InventoryFilter = 'all' | 'HAS_AVAILABLE' | 'HAS_BOOKED' | 'SOLD_OUT';
type FundFilter = 'all' | 'POSITIVE' | 'DEPLETED';

function formatINR(n: number) {
  return '\u20B9' + n.toLocaleString('en-IN');
}

function formatDate(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
}

function toDayStart(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`);
}

function toDayEnd(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setHours(23, 59, 59, 999);
  return date;
}

function SitesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48 sm:h-12 sm:w-80" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-48 shrink-0" />
          <Skeleton className="h-10 w-32 shrink-0" />
        </div>
      </div>
      <div className="border border-border p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <Skeleton className="h-10 lg:col-span-4" />
          <Skeleton className="h-10 lg:col-span-2" />
          <Skeleton className="h-10 lg:col-span-2" />
          <Skeleton className="h-10 lg:col-span-2" />
          <Skeleton className="h-10 lg:col-span-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border flex flex-col h-[420px]">
            <div className="px-6 pt-6 pb-4 border-b border-border space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="px-6 py-4 border-b border-border">
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border flex-1">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="px-6 py-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-20" />
                </div>
              ))}
            </div>
            <div className="px-6 py-3 flex justify-between items-center">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeleteSiteDialog({
  site,
  onClose,
}: {
  site: Site;
  onClose: () => void;
}) {
  const { mutate: deleteSite, isPending, error } = useDeleteSite({ onSuccess: onClose });

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-100 border-t-4 border-t-red-500 rounded-none p-0 overflow-hidden bg-background">
        <AlertDialogHeader className="p-8 pb-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl font-serif text-center">
              Delete &ldquo;{site.name}&rdquo;?
            </AlertDialogTitle>
            <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest">
              Delete is only for unused sites. Used sites should be archived.
            </p>
          </div>
        </AlertDialogHeader>

        <div className="px-8 pb-6 space-y-4">
          <div className="p-4 bg-muted border border-border">
            <p className="text-[11px] font-bold tracking-widest uppercase text-foreground">Delete only if unused</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              A site can be permanently deleted only if it has no financial or operational history. Once any real activity exists, the site should only be archived.
            </p>
          </div>
          {error && (
            <div className="border border-red-500/30 bg-red-500/10 p-4 text-[10px] font-medium text-red-600 leading-relaxed">
              {getApiErrorMessage(error, 'Unable to delete this site.')}
            </div>
          )}
        </div>

        <AlertDialogFooter className="p-8 pt-0 flex gap-4 sm:space-x-4">
          <AlertDialogCancel className="flex-1 rounded-none border-border bg-transparent text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted h-12">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              deleteSite({ id: site.id });
            }}
            disabled={isPending}
            className="flex-1 rounded-none bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest h-12 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Site'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FlatChip({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <span className={cn('px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase', color)}>
      {count} {label}
    </span>
  );
}

function SiteCard({ site, wings }: { site: Site; wings: Wing[] }) {
  const { mutate: toggleSite, isPending: toggling } = useToggleSite();
  const [showDelete, setShowDelete] = useState(false);

  const available = site.flatsSummary?.available ?? site.totalFlats ?? 0;
  const booked = site.flatsSummary?.booked ?? 0;
  const sold = site.flatsSummary?.sold ?? 0;

  return (
    <>
      <div className="bg-card border border-border shadow-sm flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-2xl font-serif tracking-tight text-foreground">{site.name}</h3>
                <span className={cn(
                  'px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase',
                  site.isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                )}>
                  {site.isActive ? 'Active' : 'Closed'}
                </span>
                {site.projectType === 'REDEVELOPMENT' && (
                  <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/25">
                    REDEVELOPMENT
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/40 mt-1.5">
                Slug: {site.slug}
              </p>
              <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 mt-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3 h-3" />
                Created {formatDate(site.createdAt)}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <div role="button" className="p-1 text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer">
                  <MoreVertical className="w-4 h-4" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-none w-44">
                <DropdownMenuItem
                  onClick={() => toggleSite(site.id)}
                  disabled={toggling}
                  className="text-[11px] font-bold uppercase tracking-widest gap-2"
                >
                  {site.isActive
                    ? <><Archive className="w-3.5 h-3.5" /> Archive Site</>
                    : <><ArchiveRestore className="w-3.5 h-3.5" /> Restore Site</>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDelete(true)}
                  className="text-[11px] font-bold uppercase tracking-widest gap-2 text-red-500 focus:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Site
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-border bg-muted/20">
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/60 shrink-0" />
            {wings.length > 0 ? (
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                  {wings.length} Wing{wings.length === 1 ? '' : 's'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {wings.slice(0, 4).map((wing) => (
                    <span key={wing.id} className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-background border border-border text-foreground/80">
                      {wing.name} · {wing.floorsCount}F
                    </span>
                  ))}
                  {wings.length > 4 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-background border border-border text-muted-foreground">
                      +{wings.length - 4} More
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                Single Block Configuration
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-border border-b border-border">
          <div className="px-6 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Building2 className="w-3 h-3" />
              <span className="text-xs font-bold tracking-widest uppercase">Wings</span>
            </div>
            <p className="text-3xl font-sans font-bold tracking-tight">{String(wings.length || 1).padStart(2, '0')}</p>
          </div>
          <div className="px-6 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Layers className="w-3 h-3" />
              <span className="text-xs font-bold tracking-widest uppercase">Total Floors</span>
            </div>
            <p className="text-3xl font-sans font-bold tracking-tight">{String(site.totalFloors || 0).padStart(2, '0')}</p>
          </div>
          <div className="px-6 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Grid3x3 className="w-3 h-3" />
              <span className="text-xs font-bold tracking-widest uppercase">Available</span>
            </div>
            <p className="text-3xl font-sans font-bold tracking-tight">{String(available || 0).padStart(2, '0')}</p>
          </div>
          <div className="px-6 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Grid3x3 className="w-3 h-3" />
              <span className="text-xs font-bold tracking-widest uppercase">Booked</span>
            </div>
            <p className="text-3xl font-sans font-bold tracking-tight">{String(booked || 0).padStart(2, '0')}</p>
          </div>
          <div className="px-6 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Grid3x3 className="w-3 h-3" />
              <span className="text-xs font-bold tracking-widest uppercase">Sold</span>
            </div>
            <p className="text-3xl font-sans font-bold tracking-tight">{String(sold || 0).padStart(2, '0')}</p>
          </div>
          <div className="px-6 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Grid3x3 className="w-3 h-3" />
              <span className="text-xs font-bold tracking-widest uppercase">Total Flats</span>
            </div>
            <p className="text-3xl font-sans font-bold tracking-tight">{String(site.totalFlats || 0).padStart(2, '0')}</p>
          </div>
          <div className="px-6 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Banknote className="w-3 h-3" />
              <span className="text-xs font-bold tracking-widest uppercase">Allocated Fund</span>
            </div>
            <p className="text-2xl font-sans font-bold tracking-tight">{formatINR(site.allocatedFund)}</p>
          </div>
          <div className="px-6 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Wallet className="w-3 h-3" />
              <span className="text-xs font-bold tracking-widest uppercase">Site Balance</span>
            </div>
            <p className="text-2xl font-sans font-bold tracking-tight text-primary">{formatINR(site.remainingFund)}</p>
          </div>
        </div>

        <div className="px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <FlatChip count={available} label="Available" color="text-foreground bg-muted" />
            <FlatChip count={booked} label="Booked" color="text-amber-600 bg-amber-500/10" />
            <FlatChip count={sold} label="Sold" color="text-emerald-600 bg-emerald-500/10" />
            <FlatChip count={site.totalFlats ?? 0} label="Total" color="text-primary bg-primary/10" />
          </div>
          <Link
            href={`/sites/${site.id}`}
            className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 transition-colors shrink-0"
          >
            View Site <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {showDelete && <DeleteSiteDialog site={site} onClose={() => setShowDelete(false)} />}
    </>
  );
}

export default function SitesPage() {
  const [view, setView] = useState<ViewMode>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');
  const [fundFilter, setFundFilter] = useState<FundFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const setViewMode = useCallback((v: ViewMode) => setView(v), []);
  const showArchived = view === 'closed' ? 'only' as const : undefined;
  const { data, isLoading } = useSites(showArchived);
  const sites = useMemo(() => data?.data?.sites ?? [], [data]);

  const wingsQueries = useQueries({
    queries: sites.map((site) => ({
      queryKey: ['wings', site.id, 'sites-overview'],
      queryFn: () => siteService.getWings(site.id),
      enabled: Boolean(site.id),
      staleTime: 60_000,
    })),
  });

  const wingsBySiteId = useMemo(() => {
    const map = new Map<string, Wing[]>();
    sites.forEach((site, index) => {
      map.set(site.id, wingsQueries[index]?.data?.data?.wings ?? []);
    });
    return map;
  }, [sites, wingsQueries]);

  const filteredSites = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sites.filter((site) => {
      const available = site.flatsSummary?.available ?? site.totalFlats ?? 0;
      const booked = site.flatsSummary?.booked ?? 0;
      const sold = site.flatsSummary?.sold ?? 0;
      const total = site.totalFlats ?? available + booked + sold;

      if (query) {
        const text = `${site.name} ${site.slug} ${site.address}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      if (projectFilter !== 'all' && site.projectType !== projectFilter) return false;
      if (inventoryFilter === 'HAS_AVAILABLE' && available <= 0) return false;
      if (inventoryFilter === 'HAS_BOOKED' && booked <= 0) return false;
      if (inventoryFilter === 'SOLD_OUT' && !(total > 0 && sold >= total)) return false;
      if (fundFilter === 'POSITIVE' && site.remainingFund <= 0) return false;
      if (fundFilter === 'DEPLETED' && site.remainingFund > 0) return false;

      const createdAt = new Date(site.createdAt);
      if (Number.isNaN(createdAt.getTime())) return false;
      if (dateFrom && createdAt < toDayStart(dateFrom)) return false;
      if (dateTo && createdAt > toDayEnd(dateTo)) return false;

      return true;
    });
  }, [sites, search, projectFilter, inventoryFilter, fundFilter, dateFrom, dateTo]);

  const hasFilters = Boolean(
    search.trim() ||
    projectFilter !== 'all' ||
    inventoryFilter !== 'all' ||
    fundFilter !== 'all' ||
    dateFrom ||
    dateTo,
  );

  const resetFilters = useCallback(() => {
    setSearch('');
    setProjectFilter('all');
    setInventoryFilter('all');
    setFundFilter('all');
    setDateFrom('');
    setDateTo('');
  }, []);

  if (isLoading) {
    return (
      <DashboardShell>
        <SitesSkeleton />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-serif text-foreground tracking-tight">Site Management</h1>
            <p className="mt-2 text-xs font-bold tracking-[0.2em] text-muted-foreground/50 uppercase">
              Active Projects &amp; Portfolio Infrastructure
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex border border-border shrink-0">
              <button
                onClick={() => setViewMode('active')}
                className={cn(
                  'flex-1 sm:flex-initial px-4 py-2.5 text-[10px] sm:text-[10px] font-bold tracking-widest uppercase transition-colors whitespace-nowrap',
                  view === 'active' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Active Sites
              </button>
              <button
                onClick={() => setViewMode('closed')}
                className={cn(
                  'flex-1 sm:flex-initial px-4 py-2.5 text-[10px] sm:text-[10px] font-bold tracking-widest uppercase transition-colors border-l border-border whitespace-nowrap',
                  view === 'closed' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Closed Sites
              </button>
            </div>

            <Button
              onClick={() => setCreateOpen(true)}
              className="h-11 sm:h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-5 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" /> New Site
            </Button>
          </div>
        </div>

        <div className="border border-border p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by site, slug, or address..."
                className="pl-10 h-10 bg-muted border-none rounded-none text-sm"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear site search"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value as ProjectFilter)}
              className="lg:col-span-2 h-10 bg-muted border-none text-[10px] px-3 outline-none focus:ring-2 focus:ring-primary font-bold tracking-widest uppercase"
            >
              <option value="all">All Projects</option>
              <option value="NEW_CONSTRUCTION">New Construction</option>
              <option value="REDEVELOPMENT">Redevelopment</option>
            </select>

            <select
              value={inventoryFilter}
              onChange={(event) => setInventoryFilter(event.target.value as InventoryFilter)}
              className="lg:col-span-2 h-10 bg-muted border-none text-[10px] px-3 outline-none focus:ring-2 focus:ring-primary font-bold tracking-widest uppercase"
            >
              <option value="all">All Inventory</option>
              <option value="HAS_AVAILABLE">Has Available</option>
              <option value="HAS_BOOKED">Has Booked</option>
              <option value="SOLD_OUT">Sold Out</option>
            </select>

            <select
              value={fundFilter}
              onChange={(event) => setFundFilter(event.target.value as FundFilter)}
              className="lg:col-span-2 h-10 bg-muted border-none text-[10px] px-3 outline-none focus:ring-2 focus:ring-primary font-bold tracking-widest uppercase"
            >
              <option value="all">All Funds</option>
              <option value="POSITIVE">Balance &gt; 0</option>
              <option value="DEPLETED">Balance 0</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              disabled={!hasFilters}
              className="lg:col-span-2 h-10 rounded-none text-[10px] font-bold tracking-widest uppercase"
            >
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">Created From</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-10 bg-muted border-none rounded-none text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">Created To</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-10 bg-muted border-none rounded-none text-sm"
              />
            </label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pb-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                Showing {filteredSites.length} of {sites.length} sites
              </span>
              {hasFilters && (
                <span className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary">
                  Filters Active
                </span>
              )}
            </div>
          </div>
        </div>

        {filteredSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 bg-muted flex items-center justify-center">
              <Layers className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground italic">
              {sites.length === 0
                ? (view === 'active' ? 'No active sites. Create one to get started.' : 'No closed sites.')
                : 'No sites matched these filters.'}
            </p>
            {sites.length > 0 && hasFilters && (
              <Button onClick={resetFilters} variant="outline" className="h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-5 rounded-none">
                Reset Filters
              </Button>
            )}
            {sites.length === 0 && view === 'active' && (
              <Button onClick={() => setCreateOpen(true)} className="h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-5">
                <Plus className="w-4 h-4" /> Create First Site
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSites.map((site) => (
              <SiteCard key={site.id} site={site} wings={wingsBySiteId.get(site.id) ?? []} />
            ))}
          </div>
        )}
      </div>

      <CreateSiteDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </DashboardShell>
  );
}
