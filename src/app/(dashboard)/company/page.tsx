'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BarChart, Bar, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useCompany, useUpdateCompany, useWithdrawFund, useWithdrawals, useRecordWithdrawalPayment, useUpdateWithdrawalNote, useDeleteWithdrawal, usePartnerLedger } from '@/hooks/api/company.hooks';
import { AddPartnerDrawer } from '@/components/dashboard/add-partner-drawer';
import { EditPartnerDrawer } from '@/components/dashboard/edit-partner-drawer';
import { EquityReallocation } from '@/components/dashboard/equity-reallocation';
import { RecordPaymentModal } from '@/components/dashboard/record-payment-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, ArrowUpRight, Pencil, Download, TrendingUp, TrendingDown, Minus, CheckCircle2, SlidersHorizontal, Trash2, History, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api-error';
import { CompanyWithdrawal, Partner, PartnerLedgerEntry } from '@/schemas/company.schema';
import { Skeleton } from '@/components/ui/skeleton';

// ── Constants & helpers ───────────────────────────
const AVATAR_COLORS = [
  'bg-teal-600', 'bg-blue-600', 'bg-amber-500',
  'bg-rose-600', 'bg-violet-600', 'bg-emerald-600',
];

function getAvatarColor(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function formatINR(amount: number) {
  return '₹' + amount.toLocaleString('en-IN');
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateLong(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Schemas ────────────────────────────────────────
const editCompanySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.coerce.number().positive('Amount is required'),
  note: z.string().optional(),
});

// ── Edit Company Dialog ────────────────────────────
function EditCompanyDialog({ company, open, onClose }: { company: { name: string; address?: string | null }; open: boolean; onClose: () => void }) {
  const { mutate, isPending } = useUpdateCompany();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(editCompanySchema),
    defaultValues: { name: company.name, address: company.address || '' },
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Edit Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutate(data, { onSuccess: onClose }))} className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Company Name</Label>
            <Input className="h-11 bg-muted border-none rounded-none text-sm" {...register('name')} />
            {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Address</Label>
            <Input className="h-11 bg-muted border-none rounded-none text-sm" {...register('address')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px]">Cancel</Button>
            <Button type="submit" disabled={isPending} className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px]">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Withdraw Fund Dialog ───────────────────────────
function WithdrawDialog({ availableFund, open, onClose }: { availableFund: number; open: boolean; onClose: () => void }) {
  const { mutate, isPending, error } = useWithdrawFund({ onSuccess: onClose });
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(withdrawSchema),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Withdraw from Company</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Pull money from company available fund (owner payout, operational expenses, etc.)</p>
        <div className="flex justify-between items-center py-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Available Fund</span>
          <span className="text-xl font-sans font-bold text-primary tabular-nums">{formatINR(availableFund)}</span>
        </div>
        <form onSubmit={handleSubmit((data) => mutate(data))} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 text-[10px] font-bold text-red-500">
              {typeof error === 'object' && 'error' in (error as any) ? (error as any).error : 'Request failed'}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input type="number" min={0} className="h-11 pl-8 bg-muted border-none rounded-none text-sm" {...register('amount')} />
            </div>
            {errors.amount && <p className="text-[10px] text-destructive">{errors.amount.message}</p>}
            <button type="button" onClick={() => setValue('amount', availableFund)} className="text-[10px] font-bold text-primary self-end hover:underline">
              Withdraw all ({formatINR(availableFund)})
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Note (optional)</Label>
            <Input className="h-11 bg-muted border-none rounded-none text-sm" placeholder="e.g. Owner payout Q1" {...register('note')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px]">Cancel</Button>
            <Button type="submit" disabled={isPending} className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px] bg-red-500 hover:bg-red-600">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}



// ── Skeleton ───────────────────────────────────────
function CompanySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-6 w-44" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

// ── Equity Panel ──────────────────────────────────
function EquityPanel({
  partners, partnerFund, investorFund, onPartnersUpdate,
}: {
  partners: Partner[];
  partnerFund: number;
  investorFund: number;
  onPartnersUpdate: (p: Partner[]) => void;
}) {
  const [showReallocation, setShowReallocation] = useState(false);
  const totalStake = partners.reduce((s, p) => s + p.stakePercentage, 0);
  const isOverLimit = totalStake > 100;
  return (
    <div className="border border-border bg-card p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Equity</h3>
        <button type="button" onClick={() => setShowReallocation(true)}
          className="h-7 w-7 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Reallocate equity">
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative flex items-center justify-center border border-border bg-muted/10 h-44">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 176" preserveAspectRatio="none">
          <line x1="30" y1="146" x2="170" y2="30" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <div className="relative z-10 text-center">
          <p className={cn('text-4xl font-bold tabular-nums', isOverLimit ? 'text-destructive' : 'text-foreground')}>
            {totalStake}%
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            {isOverLimit ? 'OVER LIMIT' : 'DISTRIBUTED'}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Partners</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{formatINR(partnerFund)}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-sm text-muted-foreground">Investors</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{formatINR(investorFund)}</span>
        </div>
      </div>
      {isOverLimit && (
        <p className="text-[10px] text-destructive font-bold">
          Equity exceeds 100%. Use reallocation to fix.
        </p>
      )}
      <EquityReallocation partners={partners} isOpen={showReallocation} onOpenChange={setShowReallocation} onSave={onPartnersUpdate} />
    </div>
  );
}

// ── Withdrawal Trends ─────────────────────────────
function WithdrawalTrendsPanel({ withdrawals }: { withdrawals: CompanyWithdrawal[] }) {
  const now = useMemo(() => new Date(), []);

  const chartData = useMemo(() => {
    const buckets: { day: string; amount: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.push({ day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), amount: 0 });
    }
    withdrawals.forEach((w) => {
      const diff = Math.floor((now.getTime() - new Date(w.createdAt).getTime()) / 86400000);
      if (diff >= 0 && diff < 30) {
        const idx = 29 - diff;
        if (buckets[idx]) buckets[idx].amount += w.amount;
      }
    });
    return buckets;
  }, [withdrawals, now]);

  const last30Total = useMemo(() => chartData.reduce((s, b) => s + b.amount, 0), [chartData]);
  const maxAmount = Math.max(...chartData.map((b) => b.amount), 1);

  return (
    <div className="border border-border bg-card p-5 flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-foreground">Withdrawal Trends</h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="4%" barGap={1}>
            <Tooltip
              cursor={false}
              contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 0, fontSize: 11 }}
              formatter={(v: number) => v > 0 ? [formatINR(v), 'Withdrawn'] : null}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="amount" radius={0} minPointSize={0}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.amount === maxAmount && entry.amount > 0
                      ? 'var(--primary)'
                      : entry.amount > 0
                        ? 'color-mix(in oklch, var(--primary) 35%, transparent)'
                        : 'var(--muted)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Last 30 Days</span>
        <div className="flex items-center gap-4">
          <span className="text-base font-bold text-foreground">{formatINR(last30Total)}</span>
          <button
            type="button"
            onClick={() => {
              // scroll to company withdrawals panel
              document.getElementById('company-withdrawals-panel')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
          >
            Full Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Partner Ledger Drawer ─────────────────────────
function PartnerLedgerDrawer({
  partner,
  onClose,
}: {
  partner: Partner;
  onClose: () => void;
}) {
  const { data, isLoading } = usePartnerLedger(partner.id);
  const ledger = (data as any)?.data;

  function movementLabel(type: string, direction: string) {
    const labels: Record<string, string> = {
      PARTNER_CAPITAL_IN: 'Capital Contribution',
      ADJUSTMENT: 'Adjustment',
      REVERSAL: 'Reversal',
    };
    return labels[type] ?? (direction === 'IN' ? 'Capital In' : 'Capital Out');
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn('h-9 w-9 flex items-center justify-center text-white text-[11px] font-bold rounded-full shrink-0', getAvatarColor(partner.name))}>
              {getInitials(partner.name)}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground capitalize">{partner.name}</p>
              <p className="text-[11px] text-muted-foreground">{partner.stakePercentage}% Equity Stake</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !ledger ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground italic">
            Could not load ledger.
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border shrink-0">
              <div className="px-4 py-3 flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Total In</p>
                <p className="text-base font-bold text-emerald-600">{formatINR(ledger.summary.totalIn)}</p>
              </div>
              <div className="px-4 py-3 flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Total Out</p>
                <p className="text-base font-bold text-red-500">{formatINR(ledger.summary.totalOut)}</p>
              </div>
              <div className="px-4 py-3 flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Net Capital</p>
                <p className="text-base font-bold text-primary">{formatINR(ledger.summary.netCapital)}</p>
              </div>
            </div>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto">
              {ledger.entries.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground italic">
                  No capital transactions yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {ledger.entries.map((entry: PartnerLedgerEntry) => (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/10 transition-colors">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {movementLabel(entry.movementType, entry.direction)}
                        </p>
                        {entry.note && (
                          <p className="text-[11px] text-muted-foreground truncate">{entry.note}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60">{formatDate(entry.date)}</p>
                      </div>
                      <span className={cn(
                        'text-sm font-bold tabular-nums shrink-0 ml-4',
                        entry.direction === 'IN' ? 'text-emerald-600' : 'text-red-500',
                      )}>
                        {entry.direction === 'IN' ? '+' : '−'}{formatINR(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Partners Withdrawal Ledger ────────────────────
function PartnersWithdrawalLedger({
  partners, onAddPartner, onEditPartner,
}: {
  partners: Partner[];
  onAddPartner: () => void;
  onEditPartner: (p: Partner) => void;
}) {
  const [ledgerPartner, setLedgerPartner] = useState<Partner | null>(null);

  return (
    <>
      <div className="border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Partners Withdrawal Ledger</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const rows = [
                  ['Name', 'Email', 'Phone', 'Capital Invested', 'Stake %'],
                  ...partners.map(p => [p.name, p.email ?? '', p.phone ?? '', String(p.investmentAmount), String(p.stakePercentage)]),
                ];
                const csv = rows.map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'partners.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <Button onClick={onAddPartner} className="h-8 rounded-none text-[9px] font-bold tracking-widest uppercase gap-1.5 px-3">
              <Plus className="h-3.5 w-3.5" /> Add Partner
            </Button>
          </div>
        </div>

        {partners.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground italic">
            No partners added yet.
          </div>
        ) : (
          <div className={cn('grid', partners.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
            {partners.map((partner, idx) => (
              <div
                key={partner.id}
                className={cn(
                  'flex flex-col gap-3 p-5',
                  partners.length > 1 && idx % 2 === 0 ? 'sm:border-r border-border' : '',
                  idx >= (partners.length > 1 ? 2 : 1) ? 'border-t border-border' : '',
                  idx === 1 ? 'border-t border-border sm:border-t-0' : '',
                )}
              >
                {/* Top row: avatar + name + action buttons */}
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onEditPartner(partner)}
                    className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
                  >
                    <div className={cn('h-9 w-9 flex items-center justify-center text-white text-[11px] font-bold tracking-widest shrink-0 rounded-full', getAvatarColor(partner.name))}>
                      {getInitials(partner.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate capitalize">{partner.name}</p>
                      <p className="text-[11px] text-muted-foreground">{partner.stakePercentage}% Equity Stake</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerPartner(partner)}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors border border-border px-2 py-1 hover:border-primary/40"
                    title="View capital ledger"
                  >
                    <History className="h-3 w-3" /> Ledger
                  </button>
                </div>

                {/* Capital invested */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Capital Invested</span>
                  <span className="text-sm font-bold text-foreground">{formatINR(partner.investmentAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Partner ledger drawer */}
      {ledgerPartner && (
        <PartnerLedgerDrawer
          partner={ledgerPartner}
          onClose={() => setLedgerPartner(null)}
        />
      )}
    </>
  );
}

// ── Edit Withdrawal Note Dialog ───────────────────
function EditWithdrawalNoteDialog({
  withdrawal,
  onClose,
}: {
  withdrawal: CompanyWithdrawal;
  onClose: () => void;
}) {
  const { mutate, isPending } = useUpdateWithdrawalNote({ onSuccess: onClose });
  const [note, setNote] = useState(withdrawal.note ?? '');

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">Edit Withdrawal Note</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex justify-between text-sm text-muted-foreground border border-border bg-muted/20 px-3 py-2">
            <span>Amount</span>
            <span className="font-semibold text-foreground">{formatINR(withdrawal.amount)}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Note / Description</Label>
            <Input
              className="h-11 bg-muted border-none rounded-none text-sm"
              placeholder="e.g. Owner payout Q2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-10 rounded-none text-[10px] font-bold tracking-widest uppercase">
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => mutate({ id: withdrawal.id, data: { note: note.trim() || undefined } })}
              className="flex-1 h-10 rounded-none text-[10px] font-bold tracking-widest uppercase"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Note'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Withdrawal Confirm Dialog ─────────────
function DeleteWithdrawalDialog({
  withdrawal,
  onClose,
}: {
  withdrawal: CompanyWithdrawal;
  onClose: () => void;
}) {
  const { mutate, isPending, error } = useDeleteWithdrawal({ onSuccess: onClose });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm rounded-none border-t-4 border-t-red-500">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">Delete Withdrawal?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-1">
          <div className="bg-muted/30 border border-border px-4 py-3 text-sm">
            <p className="text-muted-foreground">Amount: <span className="font-semibold text-foreground">{formatINR(withdrawal.amount)}</span></p>
            {withdrawal.note && <p className="text-muted-foreground mt-1">Note: {withdrawal.note}</p>}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            This will permanently remove the withdrawal record. Only allowed if no payments have been recorded against it.
          </p>
          {error && (
            <p className="text-[11px] text-red-500 font-bold">
              {(error as any)?.error ?? 'Could not delete withdrawal.'}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-10 rounded-none text-[10px] font-bold tracking-widest uppercase">
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => mutate(withdrawal.id)}
              className="flex-1 h-10 rounded-none text-[10px] font-bold tracking-widest uppercase bg-red-500 hover:bg-red-600 text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Company Withdrawals table ─────────────────────
function CompanyWithdrawalsPanel({
  withdrawals, onRecordPayment, isPending,
}: {
  withdrawals: CompanyWithdrawal[];
  onRecordPayment: (w: CompanyWithdrawal) => void;
  isPending: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [editNoteWithdrawal, setEditNoteWithdrawal] = useState<CompanyWithdrawal | null>(null);
  const [deleteWithdrawal, setDeleteWithdrawal] = useState<CompanyWithdrawal | null>(null);
  const hasMore = withdrawals.length > 4;
  const displayed = showAll ? withdrawals : withdrawals.slice(0, 4);

  return (
    <>
      <div id="company-withdrawals-panel" className="border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">Company Withdrawals</h3>
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
              Live Data
            </span>
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[10px] font-bold uppercase tracking-widest text-foreground border border-border px-3 py-1.5 hover:bg-muted/50 transition-colors"
            >
              {showAll ? 'Show Less' : 'View All Transactions'}
            </button>
          )}
        </div>

        {withdrawals.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground italic">
            No withdrawals recorded yet.
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-muted/30 border-b border-border">
              <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Date</div>
              <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Note / Description</div>
              <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Amount</div>
              <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center">Status</div>
              <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Actions</div>
            </div>

            <div className="divide-y divide-border">
              {displayed.map((w) => (
                <div key={w.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-muted/10 transition-colors">
                  <div className="col-span-2">
                    <p className="text-sm text-foreground">{formatDate(w.createdAt)}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-foreground truncate">{w.note || 'Owner / company withdrawal'}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-foreground">{formatINR(w.amount)}</span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className={cn(
                      'text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest',
                      w.paymentStatus === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : w.paymentStatus === 'PARTIAL'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-500 border border-red-500/20',
                    )}>
                      {w.paymentStatus}
                    </span>
                  </div>
                  {/* Actions: Process / Settled + Edit note + Delete */}
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    {w.paymentStatus === 'COMPLETED' ? (
                      <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">Settled</span>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onRecordPayment(w)}
                        className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-widest transition-colors disabled:opacity-50"
                      >
                        Process
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditNoteWithdrawal(w)}
                      className="h-6 w-6 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors"
                      title="Edit note"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {w.paymentStatus === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => setDeleteWithdrawal(w)}
                        className="h-6 w-6 flex items-center justify-center text-muted-foreground/50 hover:text-red-500 transition-colors"
                        title="Delete withdrawal"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="border-t border-border px-5 py-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-[11px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                >
                  {showAll ? '— Show Recent Only —' : 'Access Full Ledger Archive'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {editNoteWithdrawal && (
        <EditWithdrawalNoteDialog
          withdrawal={editNoteWithdrawal}
          onClose={() => setEditNoteWithdrawal(null)}
        />
      )}
      {deleteWithdrawal && (
        <DeleteWithdrawalDialog
          withdrawal={deleteWithdrawal}
          onClose={() => setDeleteWithdrawal(null)}
        />
      )}
    </>
  );
}

// ── Main Page ──────────────────────────────────────
export default function CompanyPage() {
  const router = useRouter();
  const { data: companyData, isLoading, error: companyError } = useCompany();
  const companyExists = !!companyData?.data?.company;
  const companyMissing = getApiErrorStatus(companyError) === 404;
  const { data: withdrawalsData, isLoading: withdrawalsLoading } = useWithdrawals({ enabled: companyExists });

  const [addOpen, setAddOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<CompanyWithdrawal | null>(null);
  const [localPartners, setLocalPartners] = useState<Partner[]>([]);

  const { mutate: recordPayment, isPending: isRecordingPayment } = useRecordWithdrawalPayment({
    onSuccess: () => setSelectedWithdrawal(null),
  });

  useEffect(() => {
    if (companyMissing) router.replace('/setup-company');
  }, [companyMissing, router]);

  useEffect(() => {
    if (companyData?.data?.partners) setLocalPartners(companyData.data.partners);
  }, [companyData?.data?.partners]);

  const companyInfo = useMemo(() => {
    if (!companyData?.data?.company) return null;
    const { company, partners: apiPartners, partner_fund, investor_fund, total_fund, available_fund } = companyData.data;
    const currentPartners = localPartners.length > 0 ? localPartners : apiPartners;
    const totalStake = currentPartners.reduce((s: number, p: Partner) => s + p.stakePercentage, 0);
    return { company, partners: currentPartners, partner_fund, investor_fund, total_fund, available_fund, totalStake };
  }, [companyData, localPartners]);

  const handlePartnerClick = useCallback((partner: Partner) => setEditPartner(partner), []);
  const handlePartnersUpdate = useCallback((updatedPartners: Partner[]) => setLocalPartners(updatedPartners), []);

  if (isLoading) return <CompanySkeleton />;

  if (companyMissing) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to company setup...</p>
        </div>
      </div>
    );
  }

  if (companyError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-md space-y-3 border border-border bg-background p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Company Unavailable</p>
          <h1 className="text-2xl font-serif">We couldn&apos;t load your company profile.</h1>
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(companyError, 'Something went wrong while loading your company details.')}
          </p>
        </div>
      </div>
    );
  }

  if (!companyInfo) return null;

  const { company, partners, partner_fund, investor_fund, total_fund, available_fund, totalStake } = companyInfo;
  const withdrawals = withdrawalsData?.data?.withdrawals ?? [];
  const today = new Date();
  const reportingDate = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const estDate = formatDateLong(company.createdAt);

  // ── Dynamic stat card subtitles computed from real data ──
  // Count withdrawals in the last 30 days vs the 30 days before that
  const now = today.getTime();
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const withdrawalsLast30 = withdrawals.filter(w => now - new Date(w.createdAt).getTime() < ms30);
  const withdrawalsPrev30 = withdrawals.filter(w => {
    const age = now - new Date(w.createdAt).getTime();
    return age >= ms30 && age < ms30 * 2;
  });
  const totalWithdrawnLast30 = withdrawalsLast30.reduce((s, w) => s + w.amount, 0);
  const totalWithdrawnPrev30 = withdrawalsPrev30.reduce((s, w) => s + w.amount, 0);
  const pendingWithdrawals = withdrawals.filter(w => w.paymentStatus !== 'COMPLETED').length;
  const totalPartners = partners.length;
  const availablePct = total_fund > 0 ? Math.round((available_fund / total_fund) * 100) : 0;

  // Total fund sub: show the breakdown of what makes up total fund
  const totalFundSub = `${formatINR(partner_fund)} partners + ${formatINR(investor_fund)} investors`;

  // Partner fund sub: show total partners and their combined stake
  const partnerFundSub = totalPartners > 0
    ? `${totalStake}% equity distributed`
    : 'No partners yet';

  // Investor fund sub: show if there are investors
  const investorFundSub = investor_fund > 0
    ? `Active investor capital`
    : 'No investor capital';

  // Available fund sub: show withdrawal activity since this is where withdrawals come from
  const availableFundSub = totalWithdrawnLast30 > 0
    ? `${formatINR(totalWithdrawnLast30)} withdrawn this month`
    : totalWithdrawnPrev30 > 0
      ? `${formatINR(totalWithdrawnPrev30)} withdrawn last month`
      : pendingWithdrawals > 0
        ? `${pendingWithdrawals} pending withdrawal${pendingWithdrawals > 1 ? 's' : ''}`
        : availablePct > 0
          ? `${availablePct}% of total fund liquid`
          : 'Fully deployed';

  type SubIcon = 'up' | 'down' | 'flat' | 'check';
  const statCards: { label: string; value: number; sub: string; subIcon: SubIcon; highlight: boolean }[] = [
    {
      label: 'Total Fund',
      value: total_fund,
      sub: totalFundSub,
      subIcon: total_fund > 0 ? 'up' : 'flat',
      highlight: false,
    },
    {
      label: 'Partner Fund',
      value: partner_fund,
      sub: partnerFundSub,
      subIcon: totalPartners > 0 ? 'up' : 'flat',
      highlight: false,
    },
    {
      label: 'Investor Fund',
      value: investor_fund,
      sub: investorFundSub,
      subIcon: investor_fund > 0 ? 'up' : 'flat',
      highlight: false,
    },
    {
      label: 'Available Fund',
      value: available_fund,
      sub: availableFundSub,
      subIcon: totalWithdrawnLast30 > 0 ? 'down' : pendingWithdrawals > 0 ? 'down' : available_fund > 0 ? 'check' : 'flat',
      highlight: true,
    },
  ];

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-700">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{company.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Est. {estDate} &bull; Reporting as of {reportingDate}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setWithdrawOpen(true)}
              className="h-9 rounded-none border-red-500/30 text-red-500 text-[9px] font-bold tracking-widest uppercase hover:bg-red-50/5 gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" /> Withdraw
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditCompanyOpen(true)}
              className="h-9 rounded-none border-border text-[9px] font-bold tracking-widest uppercase hover:bg-muted/50 gap-1.5"
            >
              <Pencil className="w-4 h-4" /> Edit Company
            </Button>
            <div className="flex items-center gap-1.5 border border-border px-3 py-1.5 bg-card">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">System Status: Operational</span>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className={cn('border p-5 flex flex-col gap-2', card.highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-card')}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{card.label}</p>
              <p className={cn('text-2xl sm:text-3xl font-bold tabular-nums tracking-tight', card.highlight ? 'text-primary' : 'text-foreground')}>
                {formatINR(card.value)}
              </p>
              <div className="flex items-center gap-1.5">
                {card.subIcon === 'up'    && <TrendingUp    className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                {card.subIcon === 'down'  && <TrendingDown  className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                {card.subIcon === 'flat'  && <Minus         className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
                {card.subIcon === 'check' && <CheckCircle2  className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                <span className={cn('text-xs',
                  card.subIcon === 'up' || card.subIcon === 'check' ? 'text-emerald-600'
                  : card.subIcon === 'down' ? 'text-red-500'
                  : 'text-muted-foreground/60')}>
                  {card.sub}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Equity + Trends */}
          <div className="flex flex-col gap-6">
            <EquityPanel partners={partners} partnerFund={partner_fund} investorFund={investor_fund} onPartnersUpdate={handlePartnersUpdate} />
            {withdrawalsLoading ? <Skeleton className="h-48 w-full" /> : <WithdrawalTrendsPanel withdrawals={withdrawals} />}
          </div>
          {/* Right: Partners Ledger + Withdrawals */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <PartnersWithdrawalLedger partners={partners} onAddPartner={() => setAddOpen(true)} onEditPartner={handlePartnerClick} />
            {withdrawalsLoading ? <Skeleton className="h-64 w-full" /> : (
              <CompanyWithdrawalsPanel withdrawals={withdrawals} onRecordPayment={setSelectedWithdrawal} isPending={isRecordingPayment} />
            )}
          </div>
        </div>
      </div>

      <AddPartnerDrawer open={addOpen} onOpenChange={setAddOpen} existingPartners={partners} />
      {editPartner && (
        <EditPartnerDrawer
          isOpen={!!editPartner}
          onOpenChange={(open) => { if (!open) setEditPartner(null); }}
          partner={editPartner}
          totalPartners={partners.length}
          allPartners={partners}
          isOverEquityLimit={totalStake > 100}
        />
      )}
      <EditCompanyDialog company={company} open={editCompanyOpen} onClose={() => setEditCompanyOpen(false)} />
      <WithdrawDialog availableFund={available_fund} open={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
      {selectedWithdrawal && (
        <RecordPaymentModal
          title={`Company Withdrawal — ${selectedWithdrawal.note || 'Owner payout'}`}
          totalAmount={selectedWithdrawal.amount}
          currentlyPaid={selectedWithdrawal.amountPaid}
          entityType="company-withdrawal"
          entityId={selectedWithdrawal.id}
          isPending={isRecordingPayment}
          onClose={() => setSelectedWithdrawal(null)}
          onSubmit={({ amount, note }) => recordPayment({ id: selectedWithdrawal.id, data: { amount, note } })}
        />
      )}
    </>
  );
}
