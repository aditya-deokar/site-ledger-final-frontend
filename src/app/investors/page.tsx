'use client';

import { useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import {
  useInvestors, useCreateInvestor, useUpdateInvestor, useDeleteInvestor,
  useTransactions, useAddTransaction, useReturnInvestment, usePayInterest, useUpdateInvestorPayment,
} from '@/hooks/api/investor.hooks';
import { useSite, useSites } from '@/hooks/api/site.hooks';
import {
  createInvestorSchema, CreateInvestorInput, updateInvestorSchema, UpdateInvestorInput,
  transactionSchema, TransactionInput, Investor, Transaction,
} from '@/schemas/investor.schema';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RecordPaymentModal } from '@/components/dashboard/record-payment-modal';
import { cn } from '@/lib/utils';
import {
  Loader2, Plus, Phone, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, Eye, ArrowRight, X, Search
} from 'lucide-react';

function formatINR(n: number) { return '₹' + n.toLocaleString('en-IN'); }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

const AVATAR_COLORS = ['bg-teal-600','bg-blue-600','bg-amber-500','bg-rose-600','bg-violet-600','bg-emerald-600'];
function avatarColor(name: string) { return AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length]; }
function initials(name: string) { const p = name.trim().split(' '); return (p[0][0] + (p[1]?.[0] || '')).toUpperCase(); }
function formatTransactionKind(kind: Transaction['kind'], investorType?: Investor['type']) {
  switch (kind) {
    case 'PRINCIPAL_IN':
      return 'Principal In';
    case 'PRINCIPAL_OUT':
      if (!investorType) return 'Payout';
      return investorType === 'EQUITY' ? 'Capital Return' : 'Principal Out';
    case 'INTEREST':
      if (!investorType) return 'Interest / Profit Share';
      return investorType === 'EQUITY' ? 'Profit Share' : 'Interest';
    default:
      return kind;
  }
}

function transactionKindClasses(kind: Transaction['kind']) {
  switch (kind) {
    case 'PRINCIPAL_IN':
      return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
    case 'INTEREST':
      return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    case 'PRINCIPAL_OUT':
    default:
      return 'text-red-500 bg-red-500/10 border-red-500/20';
  }
}

// ── Add Investor Form ───────────────────────────────
function AddInvestorForm({ onClose }: { onClose: () => void }) {
  const { mutate: create, isPending } = useCreateInvestor({ onSuccess: onClose });
  const { data: sitesData } = useSites();
  const sites = sitesData?.data?.sites ?? [];

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<CreateInvestorInput>({
    resolver: zodResolver(createInvestorSchema),
    defaultValues: { type: 'EQUITY', equityPercentage: 0, fixedRate: 0 },
  });
  const investorType = watch('type');

  const onSubmit = (data: CreateInvestorInput) => {
    create({
      ...data,
      siteId: data.type === 'EQUITY' ? data.siteId : undefined,
      equityPercentage: data.type === 'EQUITY' ? data.equityPercentage : undefined,
      fixedRate: data.type === 'FIXED_RATE' ? data.fixedRate : undefined,
    });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-10 pb-10 flex flex-col gap-10">
        <form id="add-investor-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 mt-4">
          {/* Type Toggle */}
          <Controller control={control} name="type" render={({ field }) => (
            <div className="grid grid-cols-2 gap-3">
              {(['EQUITY', 'FIXED_RATE'] as const).map((t) => (
                <button key={t} type="button" onClick={() => field.onChange(t)}
                  className={cn('p-3 border-2 text-[10px] font-bold tracking-widest uppercase transition-all',
                    field.value === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                  )}
                >
                  {t === 'EQUITY' ? 'Equity (Site)' : 'Fixed Rate (Company)'}
                </button>
              ))}
            </div>
          )} />

          <div className={cn(
            'border p-4 text-[11px] leading-relaxed',
            investorType === 'EQUITY' ? 'border-primary/20 bg-primary/5 text-muted-foreground' : 'border-amber-500/20 bg-amber-500/5 text-muted-foreground'
          )}>
            {investorType === 'EQUITY'
              ? 'Equity investors are attached to a site. Create the investor here, then use Ledger & Actions later to add capital or record profit share without creating a duplicate record.'
              : 'Fixed-rate investors stay at company level. Create the investor once, then use Ledger & Actions to add capital, return principal, or record interest payments.'}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Full Name</Label>
            <Input placeholder="Investor name" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('name')} />
            {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Contact Number</Label>
            <Input placeholder="+91 XXXXX XXXXX" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('phone')} />
          </div>

          {investorType === 'EQUITY' && (
            <>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Select Site</Label>
                <select {...register('siteId')} className="h-12 bg-muted border-none text-[10px] px-3 outline-none focus:ring-2 focus:ring-primary font-bold tracking-widest">
                  <option value="">Choose site...</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Equity Percentage (%)</Label>
                <div className="relative">
                  <Input type="number" step="0.01" min={0} max={100} className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest pr-8 focus-visible:bg-card focus-visible:ring-primary/20" {...register('equityPercentage', { valueAsNumber: true })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                </div>
              </div>
            </>
          )}

          {investorType === 'FIXED_RATE' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Fixed Rate (% per annum)</Label>
                <div className="relative">
                  <Input type="number" step="0.01" min={0} className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest pr-8 focus-visible:bg-card focus-visible:ring-primary/20" {...register('fixedRate', { valueAsNumber: true })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Interest Cadence</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase text-amber-700">
                    Yearly
                    <span className="mt-1 block text-[9px] normal-case tracking-normal text-muted-foreground">Backend default</span>
                  </button>
                  <button type="button" disabled className="border border-dashed border-border px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                    Monthly
                    <span className="mt-1 block text-[9px] normal-case tracking-normal">UI placeholder until backend support is available</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="p-10 pt-6 border-t border-border flex items-center justify-between gap-6">
        <SheetClose className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-all px-4 py-2 text-foreground">
          Cancel
        </SheetClose>
        <Button form="add-investor-form" type="submit" disabled={isPending} className="h-14 flex-1 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-primary/90 rounded-none gap-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Add Investor</span><ArrowRight className="w-4 h-4" /></>}
        </Button>
      </div>
    </>
  );
}

// ── Update Investor Form ────────────────────────────
function UpdateInvestorForm({ investor, onClose }: { investor: Investor; onClose: () => void }) {
  const { mutate: update, isPending } = useUpdateInvestor({ onSuccess: onClose });
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateInvestorInput>({
    resolver: zodResolver(updateInvestorSchema),
    defaultValues: {
      name: investor.name,
      phone: investor.phone ?? '',
      equityPercentage: investor.equityPercentage ?? 0,
      fixedRate: investor.fixedRate ?? 0,
    },
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto px-10 pb-10 flex flex-col gap-10">
        <form id="update-investor-form" onSubmit={handleSubmit((data) => update({ id: investor.id, data }))} className="flex flex-col gap-8 mt-4">
          <div className={cn(
            'border p-4 text-[11px] leading-relaxed text-muted-foreground',
            investor.type === 'EQUITY' ? 'border-primary/20 bg-primary/5' : 'border-amber-500/20 bg-amber-500/5'
          )}>
            {investor.type === 'EQUITY'
              ? 'This investor stays attached to their current site. Use Ledger & Actions to add more capital or record profit share.'
              : 'Fixed-rate ledger actions remain available from Ledger & Actions. The cadence selector below is still informational only.'}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Full Name</Label>
            <Input placeholder="Enter investor name" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('name')} />
            {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Contact Number</Label>
            <Input placeholder="+91" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('phone')} />
          </div>

          {investor.type === 'EQUITY' && (
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Equity Percentage</Label>
              <div className="relative">
                <Input type="number" step="0.01" min={0} max={100} placeholder="0" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest pr-8 placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('equityPercentage', { valueAsNumber: true })} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">%</span>
              </div>
            </div>
          )}

          {investor.type === 'FIXED_RATE' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Fixed Rate</Label>
                <div className="relative">
                  <Input type="number" step="0.01" min={0} placeholder="0" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest pr-8 placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('fixedRate', { valueAsNumber: true })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">%</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Interest Cadence</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase text-amber-700">
                    Yearly
                    <span className="mt-1 block text-[9px] normal-case tracking-normal text-muted-foreground">Backend default</span>
                  </button>
                  <button type="button" disabled className="border border-dashed border-border px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                    Monthly
                    <span className="mt-1 block text-[9px] normal-case tracking-normal">Coming later with backend support</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="p-10 pt-6 border-t border-border flex items-center justify-between gap-6">
        <SheetClose className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-all px-4 py-2 text-foreground">
          Cancel
        </SheetClose>
        <Button form="update-investor-form" type="submit" disabled={isPending} className="h-14 flex-1 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-primary/90 rounded-none gap-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Update Investor</span><ArrowRight className="w-4 h-4" /></>}
        </Button>
      </div>
    </>
  );
}

// ── Transaction History Modal ───────────────────────
function TransactionModal({ investor, onClose }: { investor: Investor; onClose: () => void }) {
  const { data, isLoading } = useTransactions(investor.id);
  const { data: investorSiteData, isLoading: isSiteLoading } = useSite(investor.siteId ?? '');
  const [addMode, setAddMode] = useState<'invest' | 'return' | 'interest' | null>(null);
  const { mutate: addTx, isPending: addingTx } = useAddTransaction({ onSuccess: () => setAddMode(null) });
  const { mutate: returnTx, isPending: returningTx } = useReturnInvestment({ onSuccess: () => setAddMode(null) });
  const { mutate: payInterest, isPending: payingInterest } = usePayInterest({ onSuccess: () => setAddMode(null) });
  const { mutate: updatePayment, isPending: updatingPayment } = useUpdateInvestorPayment(investor.id, { onSuccess: () => setPayTx(null) });
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
  });
  const [calcResult, setCalcResult] = useState<{ annual: number; monthly: number; daily: number } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [payTx, setPayTx] = useState<Transaction | null>(null);

  const transactions: Transaction[] = data?.data?.transactions ?? [];
  const totalInvested = data?.data?.totalInvested ?? investor.totalInvested;
  const totalReturned = data?.data?.totalReturned ?? investor.totalReturned;
  const equityProfitTransactions = investor.type === 'EQUITY'
    ? transactions.filter((transaction) => transaction.kind === 'INTEREST')
    : [];
  const interestPaid = investor.type === 'EQUITY'
    ? equityProfitTransactions.reduce((sum, transaction) => sum + transaction.amountPaid, 0)
    : data?.data?.interestPaid ?? investor.interestPaid;
  const outstandingPrincipal = data?.data?.outstandingPrincipal ?? investor.outstandingPrincipal;
  const isPending = addingTx || returningTx || payingInterest;
  const siteProfit = Math.max(investorSiteData?.data?.site?.totalProfit ?? 0, 0);
  const estimatedProfitShare = investor.type === 'EQUITY'
    ? Math.round(((investor.equityPercentage ?? 0) / 100) * siteProfit)
    : 0;
  const recordedProfitShare = investor.type === 'EQUITY'
    ? equityProfitTransactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
    : 0;
  const pendingProfitShare = investor.type === 'EQUITY'
    ? equityProfitTransactions.reduce((sum, transaction) => sum + Math.max(transaction.remaining, 0), 0)
    : 0;
  const hasOpenProfitShare = investor.type === 'EQUITY'
    ? equityProfitTransactions.some((transaction) => transaction.paymentStatus !== 'COMPLETED')
    : false;
  const availableProfitShareToRecord = investor.type === 'EQUITY'
    ? Math.max(estimatedProfitShare - recordedProfitShare, 0)
    : 0;
  const canRecordProfitShare = investor.type === 'EQUITY'
    ? !isLoading && !isSiteLoading && totalInvested > 0 && availableProfitShareToRecord > 0 && !hasOpenProfitShare
    : false;
  const principalReturned = Math.max(totalReturned - interestPaid, 0);

  const calculateInterest = () => {
    const rate = investor.fixedRate ?? 0;
    const principal = Math.max(outstandingPrincipal, 0);
    const annual = Math.round((rate / 100) * principal);
    const monthly = Math.round(annual / 12);
    const daily = Math.round(annual / 365);
    setCalcResult({ annual, monthly, daily });
  };

  const openAddMode = (nextMode: 'invest' | 'return' | 'interest') => {
    if (nextMode === 'interest' && investor.type === 'EQUITY' && !canRecordProfitShare) {
      return;
    }

    setAddMode(nextMode);
    setApiError(null);
    setCalcResult(null);

    if (nextMode === 'interest' && investor.type === 'EQUITY') {
      reset({ amount: availableProfitShareToRecord, note: '' });
      return;
    }

    reset({ amount: undefined, note: '' });
  };

  const onSubmit = (formData: TransactionInput) => {
    setApiError(null);
    const onError = (err: any) => setApiError(err?.error || err?.message || 'Request failed');
    if (addMode === 'invest') addTx({ investorId: investor.id, data: formData }, { onError });
    else if (addMode === 'return') returnTx({ investorId: investor.id, data: formData }, { onError });
    else if (addMode === 'interest') payInterest({ investorId: investor.id, data: formData }, { onError });
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-5xl flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-border flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-serif text-foreground">Investor Ledger & Actions: {investor.name}</h3>
            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40 mt-1">
              {investor.type === 'EQUITY' ? `Equity · ${investor.siteName}` : `Fixed Rate · ${investor.fixedRate}% p.a.`}
            </p>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              {investor.type === 'EQUITY'
                ? 'Add capital or record profit share from here. Equity payouts should come from profit, not principal return.'
                : 'Add capital, principal returns, or interest from here. Follow-up payments stay inside each ledger row, so you only enter the new amount instead of re-entering the full transaction value.'}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Transactions */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto border border-border">
              <div className="min-w-[760px] divide-y divide-border">
              <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-muted/30">
                <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Date</span>
                <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Kind</span>
                <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Amount</span>
                <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Paid / Due</span>
                <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Status</span>
                <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Note</span>
              </div>
              {transactions.map((t) => (
                <div key={t.id} className="grid grid-cols-6 gap-4 px-4 py-4 items-center">
                  <span className="text-[11px] font-bold tracking-widest text-muted-foreground">{formatDate(t.createdAt)}</span>
                  <span className={cn('inline-flex w-fit px-2 py-1 text-[9px] font-bold tracking-widest uppercase border', transactionKindClasses(t.kind))}>
                    {formatTransactionKind(t.kind, investor.type)}
                  </span>
                  <span className={cn(
                    'text-base font-sans font-bold',
                    t.kind === 'PRINCIPAL_IN' ? 'text-emerald-600' : t.kind === 'INTEREST' ? 'text-amber-600' : 'text-red-500',
                  )}>
                    {formatINR(Math.abs(t.amount))}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-emerald-600">{formatINR(t.amountPaid)}</span>
                    <span className="text-[10px] text-red-500/80">Due {formatINR(t.remaining)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.paymentStatus === 'COMPLETED' ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-500/10 text-green-600 border border-green-500/20">PAID</span>
                    ) : t.paymentStatus === 'PARTIAL' ? (
                      <button onClick={() => setPayTx(t)} className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer">PARTIAL</button>
                    ) : (
                      <button onClick={() => setPayTx(t)} className="text-[9px] font-bold px-1.5 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer">PENDING</button>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate font-medium">{t.note || '—'}</span>
                </div>
              ))}
              </div>
            </div>
          )}

          {/* Add Transaction Form */}
          {addMode && (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 border border-border p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">
                  {addMode === 'invest' ? 'New Investment' : addMode === 'interest' ? investor.type === 'EQUITY' ? 'Profit Share Payout' : 'Interest Payment' : 'Return Principal'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAddMode(null); reset(); setCalcResult(null); setApiError(null); }}
                  className="h-8 px-2 text-[9px] font-bold tracking-widest uppercase"
                >
                  Back
                </Button>
              </div>

              {apiError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 text-[10px] font-bold text-red-500">
                  {apiError}
                </div>
              )}

              {addMode === 'interest' && investor.type === 'EQUITY' && (
                <div className="border border-primary/20 bg-primary/5 p-3 flex flex-col gap-2">
                  <p className="text-[9px] font-bold tracking-widest uppercase text-primary">
                    Profit Share {investor.equityPercentage ?? 0}% of {formatINR(siteProfit)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Estimated share: <span className="font-bold text-foreground">{formatINR(estimatedProfitShare)}</span> · Recorded: <span className="font-bold text-foreground">{formatINR(recordedProfitShare)}</span> · Paid: <span className="font-bold text-foreground">{formatINR(interestPaid)}</span> · Pending: <span className="font-bold text-primary">{formatINR(pendingProfitShare)}</span>
                  </p>
                  {!totalInvested && (
                    <p className="text-[10px] text-muted-foreground">
                      Profit share stays disabled until investor capital has actually been paid into the site.
                    </p>
                  )}
                  {hasOpenProfitShare && (
                    <p className="text-[10px] text-muted-foreground">
                      There is already an open profit-share row. Use its Partial/Pending status button to record the remaining payment.
                    </p>
                  )}
                </div>
              )}

              {/* Interest Calculator for FIXED_RATE */}
              {addMode === 'interest' && investor.type === 'FIXED_RATE' && (
                <div className="border border-amber-500/20 bg-amber-500/5 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold tracking-widest uppercase text-amber-600">
                      Interest Calculator — {investor.fixedRate}% p.a. on {formatINR(outstandingPrincipal)}
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={calculateInterest}
                      className="h-7 rounded-none text-[9px] font-bold tracking-widest uppercase px-3 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                    >Calculate</Button>
                  </div>
                  {calcResult && (
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <button type="button" onClick={() => setValue('amount', calcResult.annual)}
                        className="border border-border p-2 hover:bg-amber-500/10 transition-colors text-left"
                      >
                        <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground/40">Yearly</p>
                        <p className="text-sm font-serif text-foreground">{formatINR(calcResult.annual)}</p>
                      </button>
                      <button type="button" onClick={() => setValue('amount', calcResult.monthly)}
                        className="border border-border p-2 hover:bg-amber-500/10 transition-colors text-left"
                      >
                        <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground/40">Monthly</p>
                        <p className="text-sm font-serif text-foreground">{formatINR(calcResult.monthly)}</p>
                      </button>
                      <button type="button" onClick={() => setValue('amount', calcResult.daily)}
                        className="border border-border p-2 hover:bg-amber-500/10 transition-colors text-left"
                      >
                        <p className="text-[8px] font-bold tracking-widest uppercase text-muted-foreground/40">Daily</p>
                        <p className="text-sm font-serif text-foreground">{formatINR(calcResult.daily)}</p>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input type="number" min={0} placeholder="Amount" className="h-10 pl-8 bg-muted border-none rounded-none text-sm" {...register('amount', { valueAsNumber: true })} />
                  </div>
                  {errors.amount && <p className="text-[10px] text-destructive mt-1">{errors.amount.message}</p>}
                </div>
                <Input placeholder="Note (optional)" className="h-10 bg-muted border-none rounded-none text-sm" {...register('note')} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending} size="sm"
                  className={cn('flex-1 h-9 rounded-none font-bold text-[9px] tracking-widest uppercase',
                    addMode === 'return' ? 'bg-red-500 hover:bg-red-600' : addMode === 'interest' ? 'bg-amber-500 hover:bg-amber-600' : ''
                  )}
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : addMode === 'invest' ? 'Confirm Investment' : addMode === 'interest' ? investor.type === 'EQUITY' ? 'Record Profit Share' : 'Pay Interest' : 'Return Principal'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setAddMode(null); reset(); setCalcResult(null); setApiError(null); }}
                  className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase px-4"
                >Cancel</Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-1">Total Invested</p>
              <p className="text-xl font-sans font-bold text-primary">{formatINR(totalInvested)}</p>
            </div>
            {investor.type === 'FIXED_RATE' && (
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-red-500/60 mb-1">Principal Returned</p>
                <p className="text-xl font-sans font-bold text-red-500">{formatINR(principalReturned)}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600/70 mb-1">{investor.type === 'EQUITY' ? 'Profit Paid' : 'Interest Paid'}</p>
              <p className="text-xl font-sans font-bold text-amber-600">{formatINR(interestPaid)}</p>
            </div>
            {investor.type === 'FIXED_RATE' && (
              <>
                <div>
                  <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 mb-1">Outstanding Principal</p>
                  <p className="text-xl font-sans font-bold text-foreground">{formatINR(outstandingPrincipal)}</p>
                </div>
              </>
            )}
            {investor.type === 'EQUITY' && (
              <>
                <div>
                  <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 mb-1">Pending Payout</p>
                  <p className="text-xl font-sans font-bold text-foreground">{formatINR(pendingProfitShare)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 mb-1">Available To Record</p>
                  <p className="text-xl font-sans font-bold text-foreground">{formatINR(availableProfitShareToRecord)}</p>
                </div>
              </>
            )}
            {investor.isClosed && (
              <div className="flex items-center">
                <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 px-3 py-1.5 bg-muted">Account Closed</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            {!addMode && !investor.isClosed && (
              <p className="max-w-md text-[10px] leading-relaxed text-muted-foreground">
                {investor.type === 'EQUITY'
                  ? 'Use Add Capital for new investor money. Record Profit Share only after capital is actually paid into the site, and finish any remaining payout from the same row.'
                  : 'Use Add Capital for new investor money, Return Principal after paying capital back, and Record Interest for fixed-rate payouts.'}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
            {!addMode && !investor.isClosed && (
              <>
                <Button size="sm" onClick={() => openAddMode('invest')}
                  className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5 px-4"
                >
                  <ArrowDownLeft className="w-3 h-3" /> Add Capital
                </Button>
                {investor.type === 'FIXED_RATE' && (
                  <Button size="sm" variant="outline" onClick={() => openAddMode('interest')}
                    className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5 px-4 text-amber-600 border-amber-500/30 hover:bg-amber-500/5"
                  >
                    <ArrowUpRight className="w-3 h-3" /> Record Interest
                  </Button>
                )}
                {investor.type === 'FIXED_RATE' ? (
                  <Button size="sm" variant="outline" onClick={() => openAddMode('return')}
                    className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5 px-4 text-red-500 border-red-500/30 hover:bg-red-500/5"
                  >
                    <ArrowUpRight className="w-3 h-3" /> Return Principal / Close
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => openAddMode('interest')}
                    disabled={!canRecordProfitShare}
                    className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5 px-4 text-amber-600 border-amber-500/30 hover:bg-amber-500/5 disabled:text-muted-foreground/40 disabled:border-border disabled:hover:bg-transparent"
                  >
                    <ArrowUpRight className="w-3 h-3" /> Record Profit Share
                  </Button>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {payTx && (
        <RecordPaymentModal
          title={`${investor.name} - ${formatTransactionKind(payTx.kind, investor.type)}`}
          totalAmount={Math.abs(payTx.amount)}
          currentlyPaid={payTx.amountPaid}
          entityType="investor-transaction"
          entityId={payTx.id}
          investorId={investor.id}
          isPending={updatingPayment}
          onClose={() => setPayTx(null)}
          onSubmit={({ amount, note }) => {
            updatePayment({ transactionId: payTx.id, data: { amount, note } })
          }}
        />
      )}
    </>
  );
}

// ── Delete Confirm ──────────────────────────────────
function DeleteConfirm({ investor, onClose }: { investor: Investor; onClose: () => void }) {
  const { mutate, isPending } = useDeleteInvestor({ onSuccess: onClose });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border border-border p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-serif text-foreground mb-2">Remove Investor</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Remove <strong>{investor.name}</strong> and all their transaction records? Fund values will be recomputed.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => mutate(investor.id)} disabled={isPending} variant="destructive"
            className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px]"
          >{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}</Button>
          <Button onClick={onClose} variant="outline" className="h-11 rounded-none font-bold tracking-widest uppercase text-[10px] px-6">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────
export default function InvestorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const activeSearchQuery = searchQuery.trim() || undefined;
  const { data, isLoading } = useInvestors(typeFilter, activeSearchQuery);
  const [addOpen, setAddOpen] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const [deleteInvestor, setDeleteInvestor] = useState<Investor | null>(null);
  const [txInvestor, setTxInvestor] = useState<Investor | null>(null);

  const investors = data?.data?.investors ?? [];

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  const totalInvested = investors.reduce((s, i) => s + i.totalInvested, 0);
  const totalPrincipalReturned = investors.reduce((sum, investor) => sum + Math.max(investor.totalReturned - investor.interestPaid, 0), 0);
  const totalInterestPaid = investors.reduce((s, i) => s + i.interestPaid, 0);
  const totalOutstanding = investors
    .filter((investor) => investor.type === 'FIXED_RATE')
    .reduce((sum, investor) => sum + investor.outstandingPrincipal, 0);

  const tabs = [
    { key: undefined, label: 'All' },
    { key: 'EQUITY', label: 'Equity (Site)' },
    { key: 'FIXED_RATE', label: 'Fixed Rate (Company)' },
  ];

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl font-serif text-foreground tracking-tight">Investors</h1>
            <p className="mt-2 text-base text-muted-foreground italic">
              Manage equity and fixed-rate investors across your company.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by investor, phone, or site"
                className="h-11 rounded-none border-slate-200 bg-background pl-10 pr-10 text-sm text-slate-700 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-slate-700"
                  aria-label="Clear investor search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={() => setAddOpen(true)} className="h-11 text-xs font-bold tracking-widest uppercase gap-2 px-8">
              <Plus className="w-4 h-4" /> Add Investor
            </Button>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button key={t.label} onClick={() => setTypeFilter(t.key)}
              className={cn(
                'px-5 py-3 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap',
                typeFilter === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >{t.label}</button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mb-1.5">Total Capital Committed</p>
            <p className="text-3xl sm:text-4xl font-sans font-bold text-foreground tracking-tight">{formatINR(totalInvested)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-1.5">Principal Returned</p>
            <p className="text-2xl sm:text-3xl font-sans font-bold text-red-500">{formatINR(totalPrincipalReturned)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-1.5">Yield / Profit Paid</p>
            <p className="text-2xl sm:text-3xl font-sans font-bold text-amber-600">{formatINR(totalInterestPaid)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-1.5">Outstanding Principal</p>
            <p className="text-2xl sm:text-3xl font-sans font-bold text-primary">{formatINR(totalOutstanding)}</p>
          </div>
        </div>

        {/* Investor List */}
        {investors.length === 0 ? (
          <div className="border border-dashed border-border flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground italic">No investors found.</p>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30">
              <div className="col-span-3 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Investor Detail</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Type / Rate</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Site</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Totals</div>
              <div className="col-span-3 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Actions</div>
            </div>

            {investors.map((inv) => (
              <div key={inv.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/20 transition-colors items-center group">
                {/* Avatar + Name */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className={cn('w-10 h-10 flex items-center justify-center text-white text-[11px] font-bold tracking-widest shrink-0', avatarColor(inv.name))}>
                    {initials(inv.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-base tracking-tight text-foreground truncate">{inv.name}</p>
                    {inv.phone && (
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                        <Phone className="w-3 h-3" /> {inv.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Type */}
                <div className="col-span-2 flex items-center gap-2">
                  <span className={cn(
                    'inline-block px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase border',
                    inv.type === 'EQUITY' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  )}>
                    {inv.type === 'EQUITY' ? `${inv.equityPercentage ?? 0}%` : `${inv.fixedRate ?? 0}% p.a.`}
                  </span>
                  {inv.isClosed && (
                    <span className="px-2.5 py-1 bg-muted text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Closed</span>
                  )}
                </div>

                {/* Site */}
                <div className="col-span-2 text-base text-muted-foreground truncate font-medium">
                  {inv.siteName ?? '—'}
                </div>

                {/* Total Invested */}
                <div className="col-span-2">
                  <p className="font-sans font-bold text-base lg:text-lg tracking-tight text-foreground">{formatINR(inv.totalInvested)}</p>
                  <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">Invested</p>
                  {Math.max(inv.totalReturned - inv.interestPaid, 0) > 0 && (
                    <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest mt-1">Principal Returned: {formatINR(Math.max(inv.totalReturned - inv.interestPaid, 0))}</p>
                  )}
                  {inv.interestPaid > 0 && (
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mt-1">{inv.type === 'EQUITY' ? 'Profit Paid' : 'Interest'}: {formatINR(inv.interestPaid)}</p>
                  )}
                  {inv.type === 'FIXED_RATE' && inv.outstandingPrincipal > 0 && (
                    <p className="text-[11px] font-bold text-primary uppercase tracking-widest mt-1">Outstanding: {formatINR(inv.outstandingPrincipal)}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-3 flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => setTxInvestor(inv)}
                    className="h-8 text-[9px] font-bold tracking-widest uppercase gap-1 text-primary border-primary/30 hover:text-primary hover:bg-primary/5"
                  >
                    <Eye className="w-3 h-3" /> Ledger & Actions
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditInvestor(inv)}
                    className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  ><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteInvestor(inv)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  ><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <Sheet open={addOpen} onOpenChange={() => setAddOpen(false)}>
          <SheetContent className="w-full sm:max-w-[500px] border-l border-border p-0 flex flex-col overflow-hidden bg-background">
            <SheetHeader className="p-10 pb-6 flex-row justify-start items-center space-y-0">
              <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">Add Investor</SheetTitle>
            </SheetHeader>
            <AddInvestorForm onClose={() => setAddOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
      {editInvestor && (
        <Sheet open={!!editInvestor} onOpenChange={() => setEditInvestor(null)}>
          <SheetContent className="w-full sm:max-w-[500px] border-l border-border p-0 flex flex-col overflow-hidden bg-background">
            <SheetHeader className="p-10 pb-6 flex-row justify-start items-center space-y-0">
              <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">Update Investor</SheetTitle>
            </SheetHeader>
            <UpdateInvestorForm investor={editInvestor} onClose={() => setEditInvestor(null)} />
          </SheetContent>
        </Sheet>
      )}
      {txInvestor && <TransactionModal investor={txInvestor} onClose={() => setTxInvestor(null)} />}
      {deleteInvestor && <DeleteConfirm investor={deleteInvestor} onClose={() => setDeleteInvestor(null)} />}
    </DashboardShell>
  );
}
