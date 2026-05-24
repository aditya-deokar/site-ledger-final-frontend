'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useSite, useAddFund, useWithdrawFund, useFundHistory } from '@/hooks/api/site.hooks';
import { useSiteCustomers } from '@/hooks/api/customer.hooks';
import { useCompany } from '@/hooks/api/company.hooks';
import { TransactionHistoryView } from '@/components/dashboard/navigator/command-center/transaction-history-view';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, ArrowUpRight, History, ArrowDownLeft, Phone, Building2, ChevronRight, ChevronLeft } from 'lucide-react';
import { DocumentManager } from '@/components/documents/DocumentManager';
import { cn } from '@/lib/utils';

// Lazy load tab components
const FloorsFlatsTab = lazy(() => import('@/components/dashboard/floors-flats-tab').then(mod => ({ default: mod.FloorsFlatsTab })));
const ExpensesTab = lazy(() => import('@/components/dashboard/expenses-tab').then(mod => ({ default: mod.ExpensesTab })));
const InvestorsTab = lazy(() => import('@/components/dashboard/investors-tab').then(mod => ({ default: mod.InvestorsTab })));

function TabContentLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

const SITE_TAB_KEYS = ['overview', 'ledger', 'expenses', 'floors', 'investors', 'existingOwners', 'documents'] as const;
type TabKey = (typeof SITE_TAB_KEYS)[number];

function isSiteTabKey(value: string | null): value is TabKey {
  return Boolean(value && SITE_TAB_KEYS.includes(value as TabKey));
}

function formatINR(n: number) {
  return n.toLocaleString('en-IN');
}

function AddFundDialog({ siteId, onClose, defaultAmount }: { siteId: string; onClose: () => void; defaultAmount?: number }) {
  const [amount, setAmount] = useState(defaultAmount && defaultAmount > 0 ? String(defaultAmount) : '');
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
              Amount <span className="text-muted-foreground/50">Max: {formatINR(maxAvailableAmount)}</span>
            </Label>
            <Input
              type="number"
              min={1}
              max={maxAvailableAmount}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(
                "h-12 bg-muted border-none rounded-none text-sm focus-visible:bg-card",
                !canAddFullAmount && amount && "border border-destructive/50 text-destructive"
              )}
            />
            {amount && !canAddFullAmount && (
              <p className="text-[10px] text-destructive font-medium">
                Amount exceeds available funds by {formatINR(Number(amount) - maxAvailableAmount)}
              </p>
            )}
            {amount && Number(amount) > 0 && canAddFullAmount && (
              <p className="text-[10px] text-emerald-600 font-medium">
                This will transfer money from company to site
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

// Ã¢â€â‚¬Ã¢â€â‚¬ Pull Fund Dialog Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
            <Input
              type="number"
              min={0}
              max={remainingFund}
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 bg-muted border-none rounded-none text-sm"
            />
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

// Ã¢â€â‚¬Ã¢â€â‚¬ Fund History Dialog Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function FundHistoryPanel({ siteId }: { siteId: string }) {
  const { data, isLoading } = useFundHistory(siteId);
  const history = data?.data?.history || [];

  return (
    <div className="border border-border bg-background">
      <div className="border-b border-border px-6 py-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-serif tracking-tight text-foreground">
              <History className="w-6 h-6 text-primary" />
              Site Fund Ledger
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Long-running allocation and withdrawal history lives here as a full page section instead of a cramped modal.
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
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
                  "px-6 py-5 sm:px-8 flex flex-col gap-4 border-b border-border/50 hover:bg-muted/30 transition-colors md:flex-row md:items-start md:justify-between",
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
                  <div className="flex flex-col gap-1 md:items-end">
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
    </div>
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

// Ã¢â€â‚¬Ã¢â€â‚¬ Inventory Bar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
function ExistingOwnersTab({ siteId, siteName }: { siteId: string; siteName?: string }) {
  const router = useRouter()
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
          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30">
            <div className="col-span-3 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Customer</div>
            <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Site / Flat</div>
            <div className="col-span-1 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Status</div>
            <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Selling Price</div>
            <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Paid</div>
            <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Remaining</div>
          </div>

          {owners.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/customers/${c.id}`)}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 lg:px-6 py-4 hover:bg-muted/20 transition-colors items-center text-left"
            >
              <div className="lg:col-span-3 min-w-0">
                <p className="font-serif text-base tracking-tight text-foreground truncate">{c.name}</p>
                {c.phone && (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                    <Phone className="w-3 h-3" /> {c.phone}
                  </span>
                )}
              </div>

              <div className="lg:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{siteName ?? '-'}</span>
                <span className="text-muted-foreground/30">|</span>
                <span className="shrink-0 flex items-center gap-1 font-bold">
                  F{c.floorNumber ?? '-'} <ChevronRight className="w-2 h-2" /> {c.customFlatId ?? c.flatNumber ?? '-'}
                </span>
              </div>

              <div className="lg:col-span-1 flex items-center lg:block">
                <span className="px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase inline-block bg-violet-500/10 text-violet-700">
                  {c.dealStatus === 'CANCELLED' ? 'CANCELLED' : 'EXISTING OWNER'}
                </span>
              </div>

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
    </div>
  )
}
// Ã¢â€â‚¬Ã¢â€â‚¬ Page Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function SiteOverviewPanel({ site, isRedevelopment }: { site: any; isRedevelopment: boolean }) {
  const { data: siteCustomersData } = useSiteCustomers(site.id);
  const siteCustomers = (siteCustomersData?.data?.customers ?? []) as Array<{
    dealStatus?: string;
    sellingPrice?: number;
    amountPaid?: number;
    remaining?: number;
  }>;
  const createdDate = new Date(site.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();
  const activeDeals = siteCustomers.filter((customer) => customer.dealStatus !== 'CANCELLED');
  const cancelledDeals = siteCustomers.length - activeDeals.length;
  const totalAgreementValue = activeDeals.reduce((sum, customer) => sum + (customer.sellingPrice ?? 0), 0);
  const totalCollected = activeDeals.reduce((sum, customer) => sum + (customer.amountPaid ?? 0), 0);
  const totalOutstanding = activeDeals.reduce((sum, customer) => sum + Math.max(customer.remaining ?? 0, 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <p className="text-3xl font-sans font-bold text-foreground">{site.totalFloors || 0}</p>
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

      <div className="border border-border p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Deal Status</p>
        </div>
        <div className="flex flex-col gap-4 mt-2">
          {[
            { label: 'Total Customers', count: siteCustomers.length, color: 'bg-muted-foreground/20' },
            { label: 'Active Deals', count: activeDeals.length, color: 'bg-primary' },
            { label: 'Cancelled Deals', count: cancelledDeals, color: 'bg-red-500' },
            ...(isRedevelopment
              ? [
                  { label: 'Customer Flats', count: site.flatsSummary.customerFlats ?? 0, color: 'bg-primary' },
                  { label: 'Owner Flats', count: site.flatsSummary.ownerFlats ?? 0, color: 'bg-violet-500' },
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
        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
          <div className="border border-border bg-muted/20 p-3">
            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Agreement Value</p>
            <p className="mt-1 text-lg font-sans font-bold text-foreground">₹{formatINR(totalAgreementValue)}</p>
          </div>
          <div className="border border-border bg-muted/20 p-3">
            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Collected</p>
            <p className="mt-1 text-lg font-sans font-bold text-emerald-600">₹{formatINR(totalCollected)}</p>
          </div>
          <div className="border border-border bg-muted/20 p-3">
            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Outstanding</p>
            <p className="mt-1 text-lg font-sans font-bold text-red-500">₹{formatINR(totalOutstanding)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SiteDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data, isLoading, error } = useSite(siteId ?? '');
  const [addFundOpen, setAddFundOpen] = useState(false);
  const [pullFundOpen, setPullFundOpen] = useState(false);
  const addFundIntent = searchParams.get('fund') === 'add';
  const requestedFundAmount = Number(searchParams.get('amount') ?? '');
  const addFundDefaultAmount = Number.isFinite(requestedFundAmount) && requestedFundAmount > 0 ? requestedFundAmount : undefined;

  useEffect(() => {
    if (addFundIntent) {
      setAddFundOpen(true);
    }
  }, [addFundIntent]);

  const handleCloseAddFund = () => {
    setAddFundOpen(false);

    if (!addFundIntent) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('fund');
    nextParams.delete('amount');
    const nextQuery = nextParams.toString();

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const errorMessage =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'error' in error && typeof error.error === 'string'
        ? error.error
        : 'We could not load this site right now.';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!siteId || !data?.data?.site) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-serif text-foreground">Site unavailable</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {siteId ? errorMessage : 'The site link is missing a valid site id.'}
        </p>
        <Link
          href="/navigator"
          className="inline-flex h-10 items-center justify-center rounded-none border border-border px-4 text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
        >
          Back to Navigator
        </Link>
      </div>
    );
  }
  const site = data.data.site;
  const isRedevelopment = site.projectType === 'REDEVELOPMENT';

  const fundStats = [
    { label: 'Partner Fund', value: site.partnerAllocatedFund },
    { label: 'Investor Fund', value: site.investorAllocatedFund },
    { label: 'Total Allocated', value: site.allocatedFund },
    { label: 'Total Expenses', value: site.totalExpenses, red: true },
    { label: 'Remaining Fund', value: site.remainingFund, highlight: true },
    { label: 'Total Received', value: site.customerPayments, green: true },
    { label: 'Projected Profit', value: Number.isFinite(site.totalProfit) ? site.totalProfit : null, green: true },
  ];


  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'ledger', label: 'Transaction History' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'floors', label: 'Floors & Flats' },
    { key: 'investors', label: 'Investors' },
    ...(isRedevelopment ? [{ key: 'existingOwners' as const, label: 'Existing Owners' }] : []),
    { key: 'documents', label: 'Documents' },
  ] as Array<{ key: TabKey; label: string }>;
  const requestedTab = searchParams.get('tab');
  const activeTab =
    isSiteTabKey(requestedTab) && tabs.some((tab) => tab.key === requestedTab)
      ? requestedTab
      : 'overview';

  const handleTabChange = (tab: TabKey) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (tab === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tab);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  return (
    <>
      <div className="flex flex-col gap-0 animate-in fade-in duration-700">
        <div className="mb-4">
          <Link
            href="/sites"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Sites
          </Link>
        </div>

        {/* Page title + actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-foreground tracking-tight capitalize">{site.name}</h1>
          <div className="flex flex-col items-stretch gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/sites/${site.id}/report`}
                className={buttonVariants({
                  variant: 'outline',
                  className: 'flex-1 sm:flex-initial h-10 px-4 sm:px-5 text-[10px] font-bold tracking-widest uppercase gap-2',
                })}
              >
                Complete Site Report
              </Link>
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
        </div>

        {/* Fund stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 divide-x divide-y lg:divide-y-0 divide-border border border-border bg-muted/20 mb-8 overflow-hidden">
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
                {typeof value === 'number' ? formatINR(value) : 'Pending'}
              </span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-10 gap-0 overflow-x-auto pb-px scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
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
          <SiteOverviewPanel site={site} isRedevelopment={isRedevelopment} />
        )}

        {activeTab === 'ledger' && (
          <Suspense fallback={<TabContentLoadingFallback />}>
            <TransactionHistoryView
              action="site-transactions"
              selectedEntity={{ id: site.id, name: site.name }}
              onBack={() => handleTabChange('overview')}
            />
          </Suspense>
        )}

        {activeTab === 'floors' && (
          <Suspense fallback={<TabContentLoadingFallback />}>
            <FloorsFlatsTab siteId={site.id} siteName={site.name} projectType={site.projectType} />
          </Suspense>
        )}

        {activeTab === 'expenses' && (
          <Suspense fallback={<TabContentLoadingFallback />}>
            <ExpensesTab siteId={site.id} remainingFund={site.remainingFund} />
          </Suspense>
        )}

        {activeTab === 'investors' && (
          <Suspense fallback={<TabContentLoadingFallback />}>
            <InvestorsTab siteId={site.id} siteName={site.name} />
          </Suspense>
        )}

        {activeTab === 'existingOwners' && isRedevelopment && (
          <Suspense fallback={<TabContentLoadingFallback />}>
            <ExistingOwnersTab siteId={site.id} siteName={site.name} />
          </Suspense>
        )}

        {activeTab === 'documents' && (
          <div className="p-4 bg-card border rounded-lg">
            <DocumentManager entityType="site" entityId={site.id} />
          </div>
        )}

      </div>

      {addFundOpen && <AddFundDialog siteId={site.id} defaultAmount={addFundDefaultAmount} onClose={handleCloseAddFund} />}
      {pullFundOpen && <PullFundDialog siteId={site.id} remainingFund={site.remainingFund} onClose={() => setPullFundOpen(false)} />}
    </>
  );
}

