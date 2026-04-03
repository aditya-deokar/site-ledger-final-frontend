'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { FloorsFlatsTab } from '@/components/dashboard/floors-flats-tab';
import { ExpensesTab } from '@/components/dashboard/expenses-tab';
import { InvestorsTab } from '@/components/dashboard/investors-tab';
import { useSite, useAddFund, useWithdrawFund, useFundHistory } from '@/hooks/api/site.hooks';
import { useSiteCustomers } from '@/hooks/api/customer.hooks';
import { useCompany } from '@/hooks/api/company.hooks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Loader2, Plus, ArrowUpRight, ChevronRight, History, ArrowDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// ── Add Fund Dialog ───────────────────────────────────
function AddFundDialog({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const { mutate: addFund, isPending, error } = useAddFund(siteId, { onSuccess: onClose });
  const { data: companyData } = useCompany();
  const { data: siteData } = useSite(siteId);

  // Company fund information
  const companyFunds = companyData?.data;
  const siteFunds = siteData?.data?.site;

  const maxAvailableAmount = companyFunds?.available_fund || 0;
  const canAddFullAmount = Number(amount || 0) <= maxAvailableAmount;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-none border-border p-0 gap-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-serif tracking-tight">Add Fund to Site</DialogTitle>
        </DialogHeader>
        <div className="px-8 py-6 flex flex-col gap-4">
          {/* Company wallet information */}
          <div className="bg-muted/30 border border-border p-4 rounded-lg">
            <h4 className="text-sm font-bold text-foreground mb-3">Company Wallet Overview</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Fund</span>
                <span className="text-sm font-bold">{formatINR(companyFunds?.total_fund || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Partner Fund</span>
                <span className="text-sm font-bold">{formatINR(companyFunds?.partner_fund || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Investor Fund</span>
                <span className="text-sm font-bold">{formatINR(companyFunds?.investor_fund || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Available Fund</span>
                <span className="text-sm font-bold text-primary">{formatINR(maxAvailableAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Current Site Balance</span>
                <span className="text-sm font-bold">{formatINR(siteFunds?.remainingFund || 0)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
              {typeof error === 'string' ? error : 'You have Less Funds'}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
              Amount (₹) <span className="text-muted-foreground/50">Max: {formatINR(maxAvailableAmount)}</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input
                type="number"
                min={1}
                max={maxAvailableAmount}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(
                  "h-12 pl-8 bg-muted border-none rounded-none text-sm focus-visible:bg-card",
                  !canAddFullAmount && amount && "border border-destructive/50 text-destructive"
                )}
              />
            </div>
            {amount && !canAddFullAmount && (
              <p className="text-[10px] text-destructive font-medium">
                Amount exceeds available funds by {formatINR(Number(amount) - maxAvailableAmount)}
              </p>
            )}
            {amount && Number(amount) > 0 && canAddFullAmount && (
              <p className="text-[10px] text-emerald-600 font-medium">
                ✓ This will transfer money from company to site
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">Note (Optional)</Label>
            <Input
              placeholder="e.g. Initial allocation"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
            />
          </div>
        </div>
        <div className="px-8 pb-8 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest">
            Cancel
          </Button>
          <Button
            onClick={() => addFund({ amount: Number(amount), note })}
            disabled={isPending || !amount || Number(amount) <= 0 || !canAddFullAmount}
            className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transfer Fund'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Pull Fund Dialog ─────────────────────────────────
function PullFundDialog({ siteId, remainingFund, onClose }: { siteId: string; remainingFund: number; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const { mutate: withdraw, isPending, error } = useWithdrawFund(siteId, { onSuccess: onClose });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-none border-border p-0 gap-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-serif tracking-tight">Pull Fund from Site</DialogTitle>
        </DialogHeader>
        <div className="px-8 py-6 flex flex-col gap-4">
          <p className="text-[10px] text-muted-foreground">
            Move unspent money from this site back into the company wallet.
          </p>
          <div className="flex justify-between text-[10px]">
            <span className="font-bold tracking-widest uppercase text-muted-foreground/50">Site Balance</span>
            <span className="font-bold text-primary">{formatINR(remainingFund)}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Amount to Pull</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input
                type="number"
                min={0}
                max={remainingFund}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 pl-8 bg-muted border-none rounded-none text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount(String(remainingFund))}
              className="text-[9px] font-bold text-primary hover:underline self-end mt-1"
            >
              Pull all ({formatINR(remainingFund)})
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">Note (Optional)</Label>
            <Input
              placeholder="e.g. Reclaiming excess budget"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
            />
          </div>
          {error && (
            <p className="text-[10px] text-destructive font-bold">
              {typeof error === 'object' && error !== null && 'error' in error ? (error as any).error : 'Withdrawal failed'}
            </p>
          )}
        </div>
        <div className="px-8 pb-8 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest">
            Cancel
          </Button>
          <Button
            onClick={() => withdraw({ amount: Number(amount), note })}
            disabled={isPending || !amount || Number(amount) <= 0 || Number(amount) > remainingFund}
            variant="destructive"
            className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pull Fund'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Fund History Dialog ──────────────────────────────
function FundHistoryDialog({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const { data, isLoading } = useFundHistory(siteId);
  const history = data?.data?.history || [];

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl rounded-none border-border p-0 gap-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-serif tracking-tight flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            Site Fund Ledger
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground/20" /></div>
          ) : history.length === 0 ? (
            <div className="p-20 text-center text-xs font-bold tracking-widest uppercase text-muted-foreground/30">No history found</div>
          ) : (
            <div className="flex flex-col">
              {history.map((record: any, i: number) => {
                const isAllocation = record.type === 'ALLOCATION';
                return (
                  <div key={record.id} className={cn(
                    "px-8 py-5 flex items-start justify-between border-b border-border/50 hover:bg-muted/30 transition-colors",
                    i === history.length - 1 && "border-b-0"
                  )}>
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-10 h-10 shrink-0 flex items-center justify-center rounded-none",
                        isAllocation ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                      )}>
                        {isAllocation ? <Plus className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                          {new Date(record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-sm font-medium text-foreground">{record.note || (isAllocation ? 'Company to site transfer' : 'Site to company transfer')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "text-lg font-sans font-bold",
                        isAllocation ? "text-emerald-600" : "text-red-500"
                      )}>
                        {isAllocation ? '+' : '-'}{formatINR(record.amount)}
                      </span>
                      {typeof record.runningBalance === 'number' && (
                        <span className="text-[10px] text-muted-foreground/50">
                          Balance {formatINR(record.runningBalance)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-8 py-6 border-t border-border flex justify-end bg-muted/20">
          <Button variant="outline" onClick={onClose} className="rounded-none h-10 text-[10px] font-bold uppercase tracking-widest">
            Close History
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function FundDeploymentChart({ allocated, expenses }: { allocated: number; expenses: number }) {
  const pct = allocated > 0 ? Math.min(100, (expenses / allocated) * 100) : 0;
  const data = [
    { value: pct, color: 'var(--primary)' },
    { value: 100 - pct, color: 'var(--muted)' },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270} dataKey="value" paddingAngle={2}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-sans font-bold text-foreground">{pct.toFixed(0)}%</span>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50 mt-1">Deployed</span>
        </div>
      </div>
      <p className="text-[10px] text-center text-muted-foreground/50 font-medium max-w-32">
        {allocated === 0
          ? 'No funds allocated yet.'
          : `${(100 - pct).toFixed(1)}% of budget remaining.`}
      </p>
    </div>
  );
}

// ── Inventory Bar ────────────────────────────────────
function InventoryBar({ available, booked, sold, total }: { available: number; booked: number; sold: number; total: number }) {
  const pctOf = (n: number) => total > 0 ? `${(n / total) * 100}%` : '0%';
  return (
    <div className="flex h-2.5 w-full overflow-hidden gap-0.5">
      <div className="bg-muted-foreground/20 rounded-sm" style={{ width: pctOf(available) }} />
      <div className="bg-amber-500 rounded-sm" style={{ width: pctOf(booked) }} />
      <div className="bg-primary rounded-sm" style={{ width: pctOf(sold) }} />
    </div>
  );
}

function ExistingOwnersTab({ siteId }: { siteId: string }) {
  const { data, isLoading } = useSiteCustomers(siteId)
  const customers = (data?.data?.customers ?? []) as any[]
  const owners = customers.filter((c) => c.customerType === 'EXISTING_OWNER')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">
          {owners.length} Existing Owners
        </p>
      </div>

      {owners.length === 0 ? (
        <div className="border border-dashed border-border flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground italic">
            No existing owners added yet. Go to Floors &amp; Flats tab, mark flats as Existing Owner type, then use Book This Flat to add owner details.
          </p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border overflow-hidden">
          {owners.map((c) => (
            <div
              key={c.id}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 lg:px-6 py-4 hover:bg-muted/20 transition-colors items-center text-left"
            >
              <div className="lg:col-span-4 flex flex-col gap-2">
                <span className="w-fit px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-violet-500/15 text-violet-700 border border-violet-500/25 rounded-full">
                  OWNER
                </span>
                <div>
                  <p className="font-serif text-base font-bold text-foreground truncate">{c.name}</p>
                  <p className="text-[12px] text-muted-foreground/60 mt-1">{c.phone ?? '—'}</p>
                </div>
              </div>

              <div className="lg:col-span-2">
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Flat ID</p>
                <p className="text-sm font-serif text-foreground">{c.customFlatId ?? c.flatId ?? '—'}</p>
                <p className="text-[12px] text-muted-foreground/70 mt-1 truncate">{c.floorName ?? `Floor ${c.floorNumber}`}</p>
              </div>

              <div className="lg:col-span-2">
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Selling Price</p>
                <p className="text-sm font-serif text-foreground">{c.sellingPrice > 0 ? formatINR(c.sellingPrice) : '—'}</p>
              </div>

              <div className="lg:col-span-2">
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Amount Paid</p>
                <p className="text-sm font-serif text-foreground">{formatINR(c.amountPaid)}</p>
              </div>

              <div className="lg:col-span-2 lg:text-right">
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Remaining</p>
                <p className="text-sm font-serif font-bold text-foreground">{formatINR(c.remaining)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────
export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useSite(id);
  const [addFundOpen, setAddFundOpen] = useState(false);
  const [pullFundOpen, setPullFundOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  type TabKey = 'overview' | 'expenses' | 'floors' | 'investors' | 'existingOwners';
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.data?.site) return null;
  const site = data.data.site;
  const isRedevelopment = site.projectType === 'REDEVELOPMENT';

  const { flatsSummary } = site;
  const createdDate = new Date(site.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  const fundStats = [
    { label: 'Partner Fund', value: site.partnerAllocatedFund },
    { label: 'Investor Fund', value: site.investorAllocatedFund },
    { label: 'Total Allocated', value: site.allocatedFund },
    { label: 'Total Expenses', value: site.totalExpenses, red: true },
    { label: 'Remaining Fund', value: site.remainingFund, highlight: true },
    { label: 'Total Profit', value: site.totalProfit ?? 0, green: true },
  ];

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'floors', label: 'Floors & Flats' },
    { key: 'investors', label: 'Investors' },
    ...(isRedevelopment ? [{ key: 'existingOwners' as const, label: 'Existing Owners' }] : []),
  ] as Array<{ key: TabKey; label: string }>;

  return (
    <DashboardShell>
      <div className="flex flex-col gap-0 animate-in fade-in duration-700">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground/40 mb-5">
          <Link href="/sites" className="hover:text-muted-foreground transition-colors">Site Management</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-muted-foreground/60">{site.name}</span>
        </div>

        {/* Page title + actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-foreground tracking-tight capitalize">{site.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setPullFundOpen(true)}
              className="flex-1 sm:flex-initial h-10 px-4 sm:px-5 text-[10px] font-bold tracking-widest uppercase gap-2 text-red-500 border-red-500/30 hover:bg-red-500/5 hover:text-red-500"
            >
              <ArrowUpRight className="w-4 h-4" /> Pull Fund
            </Button>
            <Button
              onClick={() => setAddFundOpen(true)}
              className="flex-1 sm:flex-initial h-10 px-5 sm:px-6 text-[10px] font-bold tracking-widest uppercase gap-2"
            >
              <Plus className="w-4 h-4" /> Add Fund
            </Button>
          </div>
        </div>

        {/* Fund stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-border border border-border bg-muted/20 mb-8 overflow-hidden">
          {fundStats.map(({ label, value, red, highlight, green }: any) => (
            <div key={label} className="px-4 sm:px-5 py-5 flex flex-col gap-1.5 border-t md:border-t-0 first:border-t-0">
              <span className={cn(
                'text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase',
                red ? 'text-red-500' : highlight ? 'text-primary' : green ? 'text-emerald-600' : 'text-muted-foreground/50'
              )}>
                {label}
              </span>
              <span className={cn(
                'text-xl sm:text-2xl font-sans font-bold tracking-tight truncate',
                red ? 'text-red-500' : highlight ? 'text-primary' : green ? 'text-emerald-600' : 'text-foreground'
              )}>
                {formatINR(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-10 gap-0 overflow-x-auto pb-px scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-6 py-4 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground/50 hover:text-muted-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Structural Data */}
            <div className="border-l-4 border-primary pl-8 flex flex-col gap-8">
              <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Structural Data</p>
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-1.5">Site Name</p>
                  <p className="text-2xl font-serif text-foreground capitalize">{site.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-1.5">Project Address</p>
                  <p className="text-base text-muted-foreground leading-relaxed">{site.address}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-5 flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40">Total Floors</p>
                    <p className="text-3xl font-sans font-bold text-foreground">
                      {/* G + {site.totalFloors - 1 > 0 ? site.totalFloors - 1 : site.totalFloors} */}
                      {site.totalFloors || 0}
                    </p>
                  </div>
                  <div className="bg-muted p-5 flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40">Total Flats</p>
                    <p className="text-3xl font-sans font-bold text-foreground">{site.totalFlats || 0} <span className="text-sm font-sans text-muted-foreground">Units</span></p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-1.5">Commencement Date</p>
                  <p className="text-base font-medium text-foreground">{createdDate}</p>
                </div>
              </div>
            </div>

            {/* Inventory Status */}
            <div className="border border-border p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Inventory Status</p>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold tracking-widest uppercase">
                  Real-Time
                </span>
              </div>

              <InventoryBar
                available={flatsSummary.available}
                booked={flatsSummary.booked}
                sold={flatsSummary.sold}
                total={site.totalFlats || 0}
              />

              <div className="flex flex-col gap-4 mt-2">
                {[
                  { label: 'Available Units', count: flatsSummary.available, color: 'bg-muted-foreground/20' },
                  { label: 'Booked (Pending)', count: flatsSummary.booked, color: 'bg-amber-500' },
                  { label: 'Sold & Registered', count: flatsSummary.sold, color: 'bg-primary' },
                  ...(isRedevelopment
                    ? [
                        { label: 'Customer Flats', count: flatsSummary.customerFlats ?? 0, color: 'bg-primary' },
                        { label: 'Owner Flats', count: flatsSummary.ownerFlats ?? 0, color: 'bg-violet-500' },
                      ]
                    : []),
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-3 h-3 shrink-0', color)} />
                      <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground whitespace-nowrap">{label}</span>
                    </div>
                    <span className="text-3xl font-sans font-bold text-foreground">{String(count).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fund Deployment */}
            <div className="border border-border p-6 flex flex-col gap-4 items-center justify-center relative">
              <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 self-start">Fund Deployment</p>
              <FundDeploymentChart allocated={site.allocatedFund} expenses={site.totalExpenses} />
              <button 
                onClick={() => setHistoryOpen(true)}
                className="mt-4 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-primary hover:underline group"
              >
                <History className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" /> View History
              </button>
            </div>

          </div>
        )}

        {activeTab === 'floors' && (
          <FloorsFlatsTab siteId={site.id} siteName={site.name} projectType={site.projectType} />
        )}

        {activeTab === 'expenses' && <ExpensesTab siteId={site.id} remainingFund={site.remainingFund} />}

        {activeTab === 'investors' && <InvestorsTab siteId={site.id} siteName={site.name} />}

        {activeTab === 'existingOwners' && isRedevelopment && <ExistingOwnersTab siteId={site.id} />}

      </div>

      {addFundOpen && <AddFundDialog siteId={site.id} onClose={() => setAddFundOpen(false)} />}
      {pullFundOpen && <PullFundDialog siteId={site.id} remainingFund={site.remainingFund} onClose={() => setPullFundOpen(false)} />}
      {historyOpen && <FundHistoryDialog siteId={site.id} onClose={() => setHistoryOpen(false)} />}
    </DashboardShell>
  );
}
