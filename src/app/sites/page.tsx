'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { CreateSiteDrawer } from '@/components/dashboard/create-site-drawer';
import { useSites, useToggleSite, useDeleteSite } from '@/hooks/api/site.hooks';
import { Site } from '@/schemas/site.schema';
import { Button } from '@/components/ui/button';
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
import { Loader2, MoreVertical, ArrowRight, Layers, Grid3x3, Banknote, Wallet, Plus, Archive, ArchiveRestore, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border flex flex-col h-[280px]">
            <div className="px-6 pt-6 pb-4 border-b border-border space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border flex-1">
              {[1, 2, 3, 4].map((j) => (
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

type ViewMode = 'active' | 'closed';

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// ── Delete confirm dialog ──────────────────────────────
function DeleteSiteDialog({
  site,
  onClose,
}: {
  site: Site;
  onClose: () => void;
}) {
  const { mutate: deleteSite, isPending, error } = useDeleteSite({ onSuccess: onClose });

  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onClose(); }}>
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
            onClick={(e) => { e.preventDefault(); deleteSite({ id: site.id }); }}
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

// ── Site card ─────────────────────────────────────────
function SiteCard({ site }: { site: Site }) {
  const { mutate: toggleSite, isPending: toggling } = useToggleSite();
  const [showDelete, setShowDelete] = useState(false);

  return (
    <>
      <div className="bg-card border border-border shadow-sm flex flex-col">
        {/* Card header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-2xl font-serif tracking-tight text-foreground">{site.name}</h3>
                <span className={cn(
                  'px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase',
                  site.isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
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
                    : <><ArchiveRestore className="w-3.5 h-3.5" /> Restore Site</>
                  }
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

        {/* Stats grid */}
        <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border">
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

        {/* Footer */}
        <div className="px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <FlatChip count={(site.flatsSummary?.available ?? site.totalFlats) ?? 0} label="Available" color="text-foreground bg-muted" />
            <FlatChip count={site.flatsSummary?.booked ?? 0} label="Booked" color="text-amber-600 bg-amber-500/10" />
            <FlatChip count={site.flatsSummary?.sold ?? 0} label="Sold" color="text-emerald-600 bg-emerald-500/10" />
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

function FlatChip({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <span className={cn('px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase', color)}>
      {count} {label}
    </span>
  );
}

import { useCallback, useMemo } from 'react';

export default function SitesPage() {
  const [view, setView] = useState<ViewMode>('active');
  const [createOpen, setCreateOpen] = useState(false);

  const setViewMode = useCallback((v: ViewMode) => setView(v), []);

  const showArchived = view === 'closed' ? 'only' as const : undefined;
  const { data, isLoading } = useSites(showArchived);
  const sites = useMemo(() => data?.data?.sites ?? [], [data]);

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
        {/* Page header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-serif text-foreground tracking-tight">Site Management</h1>
            <p className="mt-2 text-xs font-bold tracking-[0.2em] text-muted-foreground/50 uppercase">
              Active Projects &amp; Portfolio Infrastructure
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Toggle */}
            <div className="flex border border-border shrink-0">
              <button
                onClick={() => setViewMode('active')}
                className={cn(
                  'flex-1 sm:flex-initial px-4 py-2.5 text-[10px] sm:text-[10px] font-bold tracking-widest uppercase transition-colors whitespace-nowrap',
                  view === 'active' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Active Sites
              </button>
              <button
                onClick={() => setViewMode('closed')}
                className={cn(
                  'flex-1 sm:flex-initial px-4 py-2.5 text-[10px] sm:text-[10px] font-bold tracking-widest uppercase transition-colors border-l border-border whitespace-nowrap',
                  view === 'closed' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground'
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

        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 bg-muted flex items-center justify-center">
              <Layers className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground italic">
              {view === 'active' ? 'No active sites. Create one to get started.' : 'No closed sites.'}
            </p>
            {view === 'active' && (
              <Button onClick={() => setCreateOpen(true)} className="h-10 text-[10px] font-bold tracking-widest uppercase gap-2 px-5">
                <Plus className="w-4 h-4" /> Create First Site
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </div>
        )}
      </div>

      <CreateSiteDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </DashboardShell>
  );
}
