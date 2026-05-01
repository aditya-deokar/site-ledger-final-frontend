'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Loader2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecordPaymentModal } from '@/components/dashboard/record-payment-modal';
import { formatFixedRateTerms } from '@/lib/investors';
import { cn } from '@/lib/utils';
import type { Investor } from '@/schemas/investor.schema';

import { useInvestorLedger } from './use-investor-ledger';
import {
  formatDate,
  formatINR,
  formatTransactionKind,
  transactionKindClasses,
} from './utils';

export function InvestorLedgerModal({
  investor,
  onClose,
}: {
  investor: Investor;
  onClose: () => void;
}) {
  const ledger = useInvestorLedger(investor);
  const {
    form,
  } = ledger;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
        <div className="animate-in slide-in-from-right flex h-full w-full max-w-5xl flex-col border-l border-border bg-background shadow-2xl duration-200">
          <div className="flex items-start justify-between border-b border-border px-8 pb-4 pt-8">
            <div>
              <h3 className="text-2xl font-serif text-foreground">
                Investor Ledger & Actions: {investor.name}
              </h3>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  {investor.type === 'EQUITY'
                    ? `Equity - ${investor.siteName ?? 'Site not linked'}`
                    : `Fixed Rate - ${formatFixedRateTerms(investor.fixedRate, investor.fixedRateCadence)}`}
                </p>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                {investor.type === 'EQUITY'
                  ? 'Add capital or record profit share from here. Equity payouts should come from profit, not principal return.'
                  : 'Add capital, principal returns, or interest from here. Follow-up payments stay inside each ledger row, so you only enter the new amount instead of re-entering the full transaction value.'}
              </p>
            </div>
            <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4">
            {ledger.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : ledger.transactions.length === 0 ? (
              <p className="py-8 text-center text-sm italic text-muted-foreground">
                No transactions yet.
              </p>
            ) : (
              <div className="overflow-x-auto border border-border">
                <div className="min-w-[760px] divide-y divide-border">
                  <div className="grid grid-cols-6 gap-4 bg-muted/30 px-4 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Date</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Kind</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Amount</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Paid / Due</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Note</span>
                  </div>

                  {ledger.transactions.map((transaction) => (
                    <div key={transaction.id} className="grid grid-cols-6 items-center gap-4 px-4 py-4">
                      <span className="text-[11px] font-bold tracking-widest text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </span>
                      <span
                        className={cn(
                          'inline-flex w-fit border px-2 py-1 text-[9px] font-bold uppercase tracking-widest',
                          transactionKindClasses(transaction.kind),
                        )}
                      >
                        {formatTransactionKind(transaction.kind, investor.type)}
                      </span>
                      <span
                        className={cn(
                          'text-base font-sans font-bold',
                          transaction.kind === 'PRINCIPAL_IN'
                            ? 'text-emerald-600'
                            : transaction.kind === 'INTEREST'
                              ? 'text-amber-600'
                              : 'text-red-500',
                        )}
                      >
                        {formatINR(Math.abs(transaction.amount))}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-emerald-600">
                          {formatINR(transaction.amountPaid)}
                        </span>
                        <span className="text-[10px] text-red-500/80">
                          Due {formatINR(transaction.remaining)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {transaction.paymentStatus === 'COMPLETED' ? (
                          <span className="border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold text-green-600">
                            PAID
                          </span>
                        ) : transaction.paymentStatus === 'PARTIAL' ? (
                          <button
                            onClick={() => ledger.setPayTx(transaction)}
                            className="cursor-pointer border border-yellow-500/20 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-bold text-yellow-600 transition-colors hover:bg-yellow-500/20"
                          >
                            PARTIAL
                          </button>
                        ) : (
                          <button
                            onClick={() => ledger.setPayTx(transaction)}
                            className="cursor-pointer border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-600 transition-colors hover:bg-red-500/20"
                          >
                            PENDING
                          </button>
                        )}
                      </div>
                      <span className="truncate text-xs font-medium text-muted-foreground">
                        {transaction.note || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ledger.addMode && (
              <form
                onSubmit={handleSubmit(ledger.onSubmit)}
                className="mt-4 flex flex-col gap-3 border border-border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                    {ledger.addModeLabel}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={ledger.closeAddMode}
                    className="h-8 px-2 text-[9px] font-bold uppercase tracking-widest"
                  >
                    Back
                  </Button>
                </div>

                {ledger.apiError && (
                  <div className="border border-red-500/20 bg-red-500/10 p-3 text-[10px] font-bold text-red-500">
                    {ledger.apiError}
                  </div>
                )}

                {ledger.addMode === 'interest' && investor.type === 'EQUITY' && (
                  <div className="flex flex-col gap-2 border border-primary/20 bg-primary/5 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-primary">
                      Profit Share {investor.equityPercentage ?? 0}% of {formatINR(ledger.siteProfit)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Estimated share: <span className="font-bold text-foreground">{formatINR(ledger.estimatedProfitShare)}</span> - Recorded: <span className="font-bold text-foreground">{formatINR(ledger.recordedProfitShare)}</span> - Paid: <span className="font-bold text-foreground">{formatINR(ledger.interestPaid)}</span> - Pending: <span className="font-bold text-primary">{formatINR(ledger.pendingProfitShare)}</span>
                    </p>
                    {!ledger.totalInvested && (
                      <p className="text-[10px] text-muted-foreground">
                        Profit share stays disabled until investor capital has actually been paid into the site.
                      </p>
                    )}
                    {ledger.hasOpenProfitShare && (
                      <p className="text-[10px] text-muted-foreground">
                        There is already an open profit-share row. Use its Partial/Pending status button to record the remaining payment.
                      </p>
                    )}
                  </div>
                )}

                {ledger.addMode === 'interest' && investor.type === 'FIXED_RATE' && (
                  <div className="flex flex-col gap-2 border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600">
                        Interest Calculator - {formatFixedRateTerms(investor.fixedRate, investor.fixedRateCadence)} on {formatINR(ledger.outstandingPrincipal)}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={ledger.calculateInterest}
                        className="h-7 rounded-none border-amber-500/30 px-3 text-[9px] font-bold uppercase tracking-widest text-amber-600 hover:bg-amber-500/10"
                      >
                        Calculate
                      </Button>
                    </div>

                    {ledger.calcResult && (
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        {[
                          ['Yearly', ledger.calcResult.annual],
                          ['Monthly', ledger.calcResult.monthly],
                          ['Daily', ledger.calcResult.daily],
                        ].map(([label, amount]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => ledger.setValue('amount', amount as number)}
                            className="border border-border p-2 text-left transition-colors hover:bg-amber-500/10"
                          >
                            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40">
                              {label}
                            </p>
                            <p className="text-sm font-serif text-foreground">{formatINR(amount as number)}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">\u20B9</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Amount"
                        className="h-10 rounded-none border-none bg-muted pl-8 text-sm"
                        {...register('amount', { valueAsNumber: true })}
                      />
                    </div>
                    {errors.amount && (
                      <p className="mt-1 text-[10px] text-destructive">{errors.amount.message}</p>
                    )}
                  </div>
                  <Input
                    placeholder="Note (optional)"
                    className="h-10 rounded-none border-none bg-muted text-sm"
                    {...register('note')}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={ledger.isPending}
                    size="sm"
                    className={cn(
                      'h-9 flex-1 rounded-none text-[9px] font-bold uppercase tracking-widest',
                      ledger.addMode === 'return'
                        ? 'bg-red-500 hover:bg-red-600'
                        : ledger.addMode === 'interest'
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : '',
                    )}
                  >
                    {ledger.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : ledger.addMode === 'invest' ? (
                      'Confirm Investment'
                    ) : ledger.addMode === 'interest' ? (
                      investor.type === 'EQUITY' ? 'Record Profit Share' : 'Pay Interest'
                    ) : (
                      'Return Principal'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={ledger.closeAddMode}
                    className="h-9 rounded-none px-4 text-[9px] font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-border px-8 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Total Invested
                </p>
                <p className="text-xl font-sans font-bold text-primary">{formatINR(ledger.totalInvested)}</p>
              </div>
              {investor.type === 'FIXED_RATE' && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-red-500/60">
                    Principal Returned
                  </p>
                  <p className="text-xl font-sans font-bold text-red-500">
                    {formatINR(ledger.principalReturned)}
                  </p>
                </div>
              )}
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-amber-600/70">
                  {investor.type === 'EQUITY' ? 'Profit Paid' : 'Interest Paid'}
                </p>
                <p className="text-xl font-sans font-bold text-amber-600">
                  {formatINR(ledger.interestPaid)}
                </p>
              </div>
              {investor.type === 'FIXED_RATE' && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Outstanding Principal
                  </p>
                  <p className="text-xl font-sans font-bold text-foreground">
                    {formatINR(ledger.outstandingPrincipal)}
                  </p>
                </div>
              )}
              {investor.type === 'EQUITY' && (
                <>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Pending Payout
                    </p>
                    <p className="text-xl font-sans font-bold text-foreground">
                      {formatINR(ledger.pendingProfitShare)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Available To Record
                    </p>
                    <p className="text-xl font-sans font-bold text-foreground">
                      {formatINR(ledger.availableProfitShareToRecord)}
                    </p>
                  </div>
                </>
              )}
              {investor.isClosed && (
                <div className="flex items-center">
                  <span className="bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Account Closed
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              {!ledger.addMode && !investor.isClosed && (
                <p className="max-w-md text-[10px] leading-relaxed text-muted-foreground">
                  {investor.type === 'EQUITY'
                    ? 'Use Add Capital for new investor money. Record Profit Share only after capital is actually paid into the site, and finish any remaining payout from the same row.'
                    : 'Use Add Capital for new investor money, Return Principal after paying capital back, and Record Interest for fixed-rate payouts.'}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {!ledger.addMode && !investor.isClosed && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => ledger.openAddMode('invest')}
                      className="h-9 gap-1.5 rounded-none px-4 text-[9px] font-bold uppercase tracking-widest"
                    >
                      <ArrowDownLeft className="h-3 w-3" /> Add Capital
                    </Button>

                    {investor.type === 'FIXED_RATE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ledger.openAddMode('interest')}
                        className="h-9 gap-1.5 rounded-none border-amber-500/30 px-4 text-[9px] font-bold uppercase tracking-widest text-amber-600 hover:bg-amber-500/5"
                      >
                        <ArrowUpRight className="h-3 w-3" /> Record Interest
                      </Button>
                    )}

                    {investor.type === 'FIXED_RATE' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ledger.openAddMode('return')}
                        className="h-9 gap-1.5 rounded-none border-red-500/30 px-4 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/5"
                      >
                        <ArrowUpRight className="h-3 w-3" /> Return Principal / Close
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ledger.openAddMode('interest')}
                        disabled={!ledger.canRecordProfitShare}
                        className="h-9 gap-1.5 rounded-none border-amber-500/30 px-4 text-[9px] font-bold uppercase tracking-widest text-amber-600 hover:bg-amber-500/5 disabled:border-border disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                      >
                        <ArrowUpRight className="h-3 w-3" /> Record Profit Share
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </>
  );
}
