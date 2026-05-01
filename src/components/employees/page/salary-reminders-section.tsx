'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Bell,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useGenerateReminders,
  useMarkReminderPaid,
  useSalaryReminders,
} from '@/hooks/api/salary-reminder.hooks';

import { ReminderActionDialog } from './reminder-action-dialog';
import type { ReminderActionState, ReminderStatusFilter } from './types';
import {
  formatCurrency,
  formatReminderDate,
  getMonthName,
  getReminderStatusColor,
} from './utils';

export function SalaryRemindersSection() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<ReminderStatusFilter>(undefined);
  const [pendingAction, setPendingAction] = useState<ReminderActionState | null>(null);

  const { data, isLoading } = useSalaryReminders({
    year: selectedYear,
    month: selectedMonth,
    status: statusFilter,
  });

  const reminders = data?.data?.reminders ?? [];
  const summary = data?.data?.summary ?? { totalPending: 0, totalAmount: 0, overdueCount: 0 };

  const {
    mutate: generateReminders,
    isPending: isGenerating,
    error: generateError,
    reset: resetGenerateReminders,
  } = useGenerateReminders({
    onSuccess: () => {
      if (pendingAction?.kind === 'generate') {
        toast.success(`Salary reminders generated for ${pendingAction.periodLabel}`);
      } else {
        toast.success('Salary reminders generated successfully');
      }
      resetGenerateReminders();
      setPendingAction(null);
    },
  });

  const {
    mutate: markPaid,
    isPending: isMarkingPaid,
    error: payError,
    reset: resetMarkPaid,
  } = useMarkReminderPaid({
    onSuccess: () => {
      if (pendingAction?.kind === 'pay') {
        toast.success(`Salary paid to ${pendingAction.employeeName}`);
      } else {
        toast.success('Salary payment completed successfully');
      }
      resetMarkPaid();
      setPendingAction(null);
    },
  });

  const handleGenerate = () => {
    resetGenerateReminders();
    setPendingAction({
      kind: 'generate',
      month: selectedMonth,
      year: selectedYear,
      periodLabel: `${getMonthName(selectedMonth)} ${selectedYear}`,
    });
  };

  const handleMarkPaid = (
    reminderId: string,
    amount: number,
    employeeName: string,
    month: number,
    year: number,
  ) => {
    resetMarkPaid();
    setPendingAction({
      kind: 'pay',
      reminderId,
      amount,
      employeeName,
      periodLabel: `${getMonthName(month)} ${year}`,
    });
  };

  const closePendingAction = () => {
    if (isGenerating || isMarkingPaid) return;
    resetGenerateReminders();
    resetMarkPaid();
    setPendingAction(null);
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;

    if (pendingAction.kind === 'generate') {
      generateReminders({ year: pendingAction.year, month: pendingAction.month });
      return;
    }

    markPaid({
      id: pendingAction.reminderId,
      data: { paidAt: new Date().toISOString() },
    });
  };

  const dialogError = pendingAction?.kind === 'generate' ? generateError : payError;
  const dialogPending = pendingAction?.kind === 'generate' ? isGenerating : isMarkingPaid;

  return (
    <div className="space-y-6">
      <ReminderActionDialog
        action={pendingAction}
        isPending={dialogPending}
        error={dialogError}
        onClose={closePendingAction}
        onConfirm={confirmPendingAction}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Pending
              </p>
              <p className="mt-1 text-2xl font-serif text-foreground">{summary.totalPending}</p>
            </div>
          </div>
        </div>

        <div className="border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Overdue
              </p>
              <p className="mt-1 text-2xl font-serif text-foreground">{summary.overdueCount}</p>
            </div>
          </div>
        </div>

        <div className="border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Total Amount
              </p>
              <p className="mt-1 text-2xl font-serif text-foreground">{formatCurrency(summary.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
            className="h-10 rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-widest"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="h-10 rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-widest"
          >
            {Array.from({ length: 5 }, (_, index) => now.getFullYear() - 2 + index).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={statusFilter ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              setStatusFilter(value ? (value as ReminderStatusFilter) : undefined);
            }}
            className="h-10 rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-widest"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-10 gap-2 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          Generate Reminders
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center border border-border p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border p-12">
          <Bell className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm italic text-muted-foreground">
            No salary reminders found. Click "Generate Reminders" to create them.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border">
          <div className="hidden grid-cols-12 gap-4 bg-muted/30 px-6 py-4 lg:grid">
            <div className="col-span-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Employee</div>
            <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Month/Year</div>
            <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Due Date</div>
            <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Amount</div>
            <div className="col-span-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</div>
            <div className="col-span-2 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Actions</div>
          </div>

          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-muted/20 lg:grid-cols-12 lg:items-center lg:gap-4 lg:px-6"
            >
              <div className="lg:col-span-3">
                <p className="font-serif text-base text-foreground">{reminder.employeeName}</p>
              </div>
              <div className="text-sm text-muted-foreground lg:col-span-2">
                {getMonthName(reminder.month)} {reminder.year}
              </div>
              <div className="text-sm text-muted-foreground lg:col-span-2">
                {formatReminderDate(reminder.dueDate)}
              </div>
              <div className="lg:col-span-2">
                <p className="text-sm font-semibold text-primary">{formatCurrency(reminder.salaryAmount)}</p>
                {reminder.paidAt && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                    Paid: {formatReminderDate(reminder.paidAt)}
                  </p>
                )}
              </div>
              <div className="lg:col-span-1">
                <span
                  className={cn(
                    'inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                    getReminderStatusColor(reminder.status),
                  )}
                >
                  {reminder.status}
                </span>
              </div>
              <div className="flex items-center justify-start gap-2 lg:col-span-2 lg:justify-end">
                {reminder.status !== 'paid' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest"
                    onClick={() => handleMarkPaid(
                      reminder.id,
                      reminder.salaryAmount,
                      reminder.employeeName,
                      reminder.month,
                      reminder.year,
                    )}
                    disabled={isMarkingPaid}
                  >
                    {isMarkingPaid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark Paid'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
