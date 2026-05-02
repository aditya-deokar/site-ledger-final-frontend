'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecordPaymentModal } from '@/components/dashboard/record-payment-modal';
import { useInvestor } from '@/hooks/api/investor.hooks';
import { useInvestorLedger } from '@/components/investors/page/use-investor-ledger';
import { formatFixedRateTerms } from '@/lib/investors';
import { cn } from '@/lib/utils';
import {
  formatDate,
  formatINR,
  formatTransactionKind,
  transactionKindClasses,
} from '@/components/investors/page/utils';

export default function InvestorLedgerPage() {
  const params = useParams();
  const investorId = typeof params?.investorId === 'string' ? params.investorId : '';
  const { data, isLoading } = useInvestor(investorId);
  const investor = data?.data?.investor;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="space-y-4 py-10">
        <p className="text-sm text-muted-foreground">Investor not found.</p>
        <Link href="/investors" className="text-sm text-primary underline">
          Back to investors
        </Link>
      </div>
    );
  }

  return <InvestorLedgerPageContent investor={investor} />;
}

function InvestorLedgerPageContent({ investor }: { investor: any }) {
  const ledger = useInvestorLedger(investor);
  const { register, handleSubmit, formState: { errors } } = ledger.form;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/investors"
            className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Investors
          </Link>
          <h1 className="text-3xl font-serif tracking-tight text-foreground">
            Investor Ledger & Actions: {investor.name}
          </h1>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
            {investor.type === 'EQUITY'
              ? `Equity - ${investor.siteName ?? 'Site not linked'}`
              : `Fixed Rate - ${formatFixedRateTerms(investor.fixedRate, investor.fixedRateCadence)}`}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {investor.type === 'EQUITY'
              ? 'Add capital or record profit share from here. Equity payouts should come from profit, not principal return.'
              : 'Add capital, principal returns, or interest from here.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Invested" value={formatINR(ledger.totalInvested)} valueClass="text-primary" />
        {investor.type === 'FIXED_RATE' ? (
          <Stat label="Principal Returned" value={formatINR(ledger.principalReturned)} valueClass="text-red-500" />
        ) : (
          <Stat label="Pending Payout" value={formatINR(ledger.pendingProfitShare)} />
        )}
        <Stat label={investor.type === 'EQUITY' ? 'Profit Paid' : 'Interest Paid'} value={formatINR(ledger.interestPaid)} valueClass="text-amber-600" />
        {investor.type === 'FIXED_RATE'
          ? <Stat label="Outstanding Principal" value={formatINR(ledger.outstandingPrincipal)} />
          : <Stat label="Available To Record" value={formatINR(ledger.availableProfitShareToRecord)} />}
      </div>

      <div className="overflow-hidden border border-border">
        <div className="grid grid-cols-6 gap-4 bg-muted/30 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
          <span>Date</span>
          <span>Kind</span>
          <span>Amount</span>
          <span>Paid / Due</span>
          <span>Status</span>
          <span>Note</span>
        </div>
        {ledger.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : ledger.transactions.length === 0 ? (
          <p className="py-8 text-center text-sm italic text-muted-foreground">No transactions yet.</p>
        ) : (
          ledger.transactions.map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-6 items-center gap-4 border-t border-border/60 px-4 py-3 text-sm hover:bg-muted/20">
              <span className="font-medium text-muted-foreground">{formatDate(transaction.createdAt)}</span>
              <span className={cn('inline-flex w-fit border px-2 py-1 text-[10px] font-bold uppercase tracking-widest', transactionKindClasses(transaction.kind))}>
                {formatTransactionKind(transaction.kind, investor.type)}
              </span>
              <span className={cn('font-bold', transaction.kind === 'PRINCIPAL_IN' ? 'text-emerald-600' : transaction.kind === 'INTEREST' ? 'text-amber-600' : 'text-red-500')}>
                {formatINR(Math.abs(transaction.amount))}
              </span>
              <div>
                <p className="font-semibold text-emerald-600">{formatINR(transaction.amountPaid)}</p>
                <p className="text-xs text-red-500/80">Due {formatINR(transaction.remaining)}</p>
              </div>
              <div>
                {transaction.paymentStatus === 'COMPLETED' ? (
                  <span className="border border-green-500/20 bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-600">PAID</span>
                ) : (
                  <button
                    onClick={() => ledger.setPayTx(transaction)}
                    className={cn(
                      'border px-2 py-1 text-[10px] font-bold transition-colors',
                      transaction.paymentStatus === 'PARTIAL'
                        ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'
                        : 'border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20',
                    )}
                  >
                    {transaction.paymentStatus}
                  </button>
                )}
              </div>
              <span className="truncate text-muted-foreground">{transaction.note || '-'}</span>
            </div>
          ))
        )}
      </div>

      {!ledger.addMode && !investor.isClosed && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => ledger.openAddMode('invest')} className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest">
            <ArrowDownLeft className="mr-1 h-3 w-3" /> Add Capital
          </Button>
          {investor.type === 'FIXED_RATE' ? (
            <>
              <Button size="sm" variant="outline" onClick={() => ledger.openAddMode('interest')} className="h-9 rounded-none border-amber-500/30 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                <ArrowUpRight className="mr-1 h-3 w-3" /> Record Interest
              </Button>
              <Button size="sm" variant="outline" onClick={() => ledger.openAddMode('return')} className="h-9 rounded-none border-red-500/30 text-[10px] font-bold uppercase tracking-widest text-red-500">
                <ArrowUpRight className="mr-1 h-3 w-3" /> Return Principal / Close
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => ledger.openAddMode('interest')} disabled={!ledger.canRecordProfitShare} className="h-9 rounded-none border-amber-500/30 text-[10px] font-bold uppercase tracking-widest text-amber-600">
              <ArrowUpRight className="mr-1 h-3 w-3" /> Record Profit Share
            </Button>
          )}
        </div>
      )}

      {ledger.addMode && (
        <form onSubmit={handleSubmit(ledger.onSubmit)} className="space-y-3 border border-border p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{ledger.addModeLabel}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input type="number" min={0} placeholder="Amount" className="h-10 rounded-none border-none bg-muted text-sm" {...register('amount', { valueAsNumber: true })} />
              {errors.amount ? <p className="mt-1 text-[10px] text-destructive">{errors.amount.message}</p> : null}
            </div>
            <Input placeholder="Note (optional)" className="h-10 rounded-none border-none bg-muted text-sm" {...register('note')} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={ledger.isPending} className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest">
              {ledger.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Submit'}
            </Button>
            <Button type="button" variant="outline" onClick={ledger.closeAddMode} className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {ledger.payTx && (
        <RecordPaymentModal
          title={`${investor.name} - ${formatTransactionKind(ledger.payTx.kind, investor.type)}`}
          totalAmount={Math.abs(ledger.payTx.amount)}
          currentlyPaid={ledger.payTx.amountPaid}
          entityType="investor-transaction"
          entityId={ledger.payTx.id}
          investorId={investor.id}
          isPending={ledger.updatingPayment}
          onClose={() => ledger.setPayTx(null)}
          onSubmit={({ amount, note }) => ledger.submitPayment({ amount, note })}
        />
      )}
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="border border-border p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
      <p className={cn('mt-1 text-2xl font-sans font-bold text-foreground', valueClass)}>{value}</p>
    </div>
  );
}
