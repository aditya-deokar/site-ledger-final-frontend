import { CalendarDays, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import type {
  EmployeeTransaction,
  EmployeeTransactionsSummary,
} from '@/schemas/employee.schema';

import type { EmployeeWorkspaceForm } from './use-employee-workspace';
import {
  formatCurrency,
  formatDate,
  transactionStatusClass,
  transactionTypeClass,
  transactionTypeLabel,
  type EmployeeTransactionTypeFilter,
  type TransactionComposerInput,
} from './utils';

type EmployeeWorkspaceTransactionsTabProps = {
  form: EmployeeWorkspaceForm;
  currentMonthLabel: string;
  monthlyTransactionSummary?: EmployeeTransactionsSummary;
  advanceOutstanding: number;
  filteredTransactions: EmployeeTransaction[];
  transactionTypeFilter: EmployeeTransactionTypeFilter;
  onTransactionTypeFilterChange: (value: EmployeeTransactionTypeFilter) => void;
  onSubmit: (values: TransactionComposerInput) => Promise<void>;
  onMarkTransactionPaid: (transaction: EmployeeTransaction) => Promise<void>;
  onViewPayslip: (transaction: EmployeeTransaction) => void;
  isUpdatingTransaction: boolean;
  isSavingTransaction: boolean;
  saveTransactionError?: unknown;
};

function TransactionMetric({
  label,
  value,
  valueClassName = 'text-foreground',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="border border-border p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {label}
      </p>
      <p className={`mt-3 text-2xl font-sans font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

export function EmployeeWorkspaceTransactionsTab({
  form,
  currentMonthLabel,
  monthlyTransactionSummary,
  advanceOutstanding,
  filteredTransactions,
  transactionTypeFilter,
  onTransactionTypeFilterChange,
  onSubmit,
  onMarkTransactionPaid,
  onViewPayslip,
  isUpdatingTransaction,
  isSavingTransaction,
  saveTransactionError,
}: EmployeeWorkspaceTransactionsTabProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TransactionMetric
          label="Paid This Period"
          value={formatCurrency(monthlyTransactionSummary?.totalPaid ?? 0)}
          valueClassName="text-emerald-600"
        />
        <TransactionMetric
          label="Pending"
          value={formatCurrency(monthlyTransactionSummary?.pendingAmount ?? 0)}
          valueClassName="text-amber-600"
        />
        <TransactionMetric
          label="Deductions"
          value={formatCurrency(monthlyTransactionSummary?.totalDeducted ?? 0)}
          valueClassName="text-red-600"
        />
        <TransactionMetric
          label="Advance Outstanding"
          value={formatCurrency(advanceOutstanding)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="border border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Create Transaction
              </p>
              <h3 className="mt-2 text-lg font-serif text-foreground">
                Advance, recovery, bonus, or manual pay item
              </h3>
            </div>
            <CalendarDays className="h-4 w-4 text-muted-foreground/40" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Type
              </Label>
              <select
                className="h-11 w-full rounded-none border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                {...register('type')}
              >
                <option value="advance">Advance</option>
                <option value="deduction">Deduction / Recovery</option>
                <option value="bonus">Bonus</option>
                <option value="reimbursement">Reimbursement</option>
              </select>
              <p className="text-[10px] text-muted-foreground/60">
                Salary payments are created from payroll actions so company funds and reminders stay
                in sync.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Amount
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  className="h-11 rounded-none bg-background"
                />
                {errors.amount && (
                  <p className="text-[10px] text-destructive">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Date
                </Label>
                <Input
                  type="date"
                  {...register('date')}
                  className="h-11 rounded-none bg-background"
                />
                {errors.date && (
                  <p className="text-[10px] text-destructive">{errors.date.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Payment Method
              </Label>
              <select
                className="h-11 w-full rounded-none border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                {...register('paymentMethod')}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Description
              </Label>
              <Input
                {...register('description')}
                className="h-11 rounded-none bg-background"
                placeholder={`Entry for ${currentMonthLabel}`}
              />
              {errors.description && (
                <p className="text-[10px] text-destructive">{errors.description.message}</p>
              )}
            </div>

            <label className="flex items-center gap-3 border border-border px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                {...register('markAsPaidNow')}
                className="h-4 w-4 rounded-none accent-current"
              />
              Mark this transaction as paid immediately
            </label>

            {Boolean(saveTransactionError) && (
              <div className="border border-red-500/30 bg-red-500/10 p-4 text-[11px] text-red-600">
                {getApiErrorMessage(
                  saveTransactionError,
                  'Unable to save employee transaction.',
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSavingTransaction}
              className="h-11 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest"
            >
              {isSavingTransaction ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Transaction'
              )}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Transaction History
              </p>
              <h3 className="mt-2 text-lg font-serif text-foreground">{currentMonthLabel}</h3>
            </div>

            <div className="w-full lg:w-52">
              <select
                value={transactionTypeFilter}
                onChange={(event) => (
                  onTransactionTypeFilterChange(event.target.value as EmployeeTransactionTypeFilter)
                )}
                className="h-10 w-full rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-widest"
              >
                <option value="all">All Types</option>
                <option value="salary">Salary</option>
                <option value="advance">Advance</option>
                <option value="deduction">Deduction</option>
                <option value="bonus">Bonus</option>
                <option value="reimbursement">Reimbursement</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden border border-border">
            {filteredTransactions.length === 0 ? (
              <div className="p-10 text-sm italic text-muted-foreground">
                No transactions recorded for this period with the current filter.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="grid gap-4 px-5 py-4 lg:grid-cols-[140px_110px_1fr_120px_140px] lg:items-center"
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Date
                      </p>
                      <p className="mt-2 text-sm text-foreground">{formatDate(transaction.date)}</p>
                    </div>

                    <div>
                      <span
                        className={cn(
                          'inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                          transactionTypeClass(transaction.type),
                        )}
                      >
                        {transactionTypeLabel(transaction.type)}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {transaction.description}
                      </p>
                    </div>

                    <div>
                      <span
                        className={cn(
                          'inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                          transactionStatusClass(transaction.status),
                        )}
                      >
                        {transaction.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {transaction.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest"
                          onClick={() => onMarkTransactionPaid(transaction)}
                          disabled={isUpdatingTransaction}
                        >
                          {isUpdatingTransaction ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Mark Paid'
                          )}
                        </Button>
                      )}

                      {transaction.type === 'salary' && transaction.status === 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest"
                          onClick={() => onViewPayslip(transaction)}
                        >
                          View Payslip
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
