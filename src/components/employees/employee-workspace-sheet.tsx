'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  FileText,
  Loader2,
  Printer,
  Wallet,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import {
  createEmployeeTransactionSchema,
  type Employee,
  type EmployeeTransaction,
  type EmployeeTransactionResponse,
} from '@/schemas/employee.schema';
import { useEmployeeAttendance } from '@/hooks/api/attendance.hooks';
import {
  useCreateEmployeeTransaction,
  useEmployee,
  useEmployeeTransactions,
  useUpdateEmployeeTransactionStatus,
} from '@/hooks/api/employee.hooks';
import { toast } from 'sonner';

const DEFAULT_SHIFT_START_MINUTES = 10 * 60;
const DEFAULT_SHIFT_END_MINUTES = 18 * 60;

const transactionComposerSchema = createEmployeeTransactionSchema.extend({
  markAsPaidNow: z.boolean().default(false),
});

type TransactionComposerFormValues = z.input<typeof transactionComposerSchema>;
type TransactionComposerInput = z.output<typeof transactionComposerSchema>;

function formatCurrency(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMonthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function toDateInputValue(value: Date) {
  const next = new Date(value);
  return new Date(next.getTime() - (next.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
}

function getMonthBounds(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function transactionTypeLabel(type: EmployeeTransaction['type']) {
  switch (type) {
    case 'salary':
      return 'Salary';
    case 'bonus':
      return 'Bonus';
    case 'deduction':
      return 'Deduction';
    case 'advance':
      return 'Advance';
    case 'reimbursement':
      return 'Reimbursement';
    default:
      return type;
  }
}

function transactionTypeClass(type: EmployeeTransaction['type']) {
  switch (type) {
    case 'salary':
      return 'bg-primary/10 text-primary';
    case 'bonus':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'deduction':
      return 'bg-red-500/10 text-red-600';
    case 'advance':
      return 'bg-amber-500/10 text-amber-600';
    case 'reimbursement':
      return 'bg-blue-500/10 text-blue-600';
    default:
      return 'bg-muted text-foreground';
  }
}

function transactionStatusClass(status: EmployeeTransaction['status']) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'failed':
      return 'bg-red-500/10 text-red-600';
    case 'pending':
    default:
      return 'bg-amber-500/10 text-amber-600';
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getUtcMinutes(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return (parsed.getUTCHours() * 60) + parsed.getUTCMinutes();
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function buildEmployeePayslipHtml(input: {
  employee: Employee;
  periodLabel: string;
  salaryAmount: number;
  salaryDate: string;
  bonusAmount: number;
  reimbursementAmount: number;
  deductionAmount: number;
  netAmount: number;
  paidAt: string | null;
  paymentMethod: string;
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Payslip ${escapeHtml(input.employee.name)} ${escapeHtml(input.periodLabel)}</title>
      <style>
        body {
          font-family: Georgia, "Times New Roman", serif;
          margin: 0;
          padding: 40px;
          background: #f8fafc;
          color: #0f172a;
        }
        .sheet {
          max-width: 840px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 24px;
          margin-bottom: 28px;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 8px;
        }
        h1 {
          margin: 0;
          font-size: 34px;
          font-weight: 600;
        }
        .meta {
          text-align: right;
          font-size: 14px;
          line-height: 1.7;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }
        .panel {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 18px;
        }
        .label {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .value {
          font-size: 22px;
          font-weight: 700;
        }
        .table {
          border: 1px solid #e2e8f0;
          margin-top: 8px;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 20px;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        .row:last-child {
          border-bottom: none;
        }
        .row-total {
          background: #f8fafc;
        }
        .row-label {
          font-size: 12px;
          color: #0f172a;
        }
        .row-value {
          text-align: right;
          font-size: 14px;
          font-weight: 700;
        }
        .footnote {
          margin-top: 18px;
          font-size: 12px;
          color: #64748b;
        }
        @media print {
          body {
            padding: 0;
            background: #ffffff;
          }
          .sheet {
            border: none;
            padding: 0;
            max-width: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div>
            <div class="eyebrow">Employee Payslip</div>
            <h1>Salary Slip</h1>
          </div>
          <div class="meta">
            <div><strong>Period:</strong> ${escapeHtml(input.periodLabel)}</div>
            <div><strong>Paid On:</strong> ${escapeHtml(formatDate(input.paidAt))}</div>
          </div>
        </div>

        <div class="grid">
          <div class="panel">
            <div class="label">Employee</div>
            <div class="value">${escapeHtml(input.employee.name)}</div>
            <div style="margin-top: 10px; font-size: 14px; color: #475569;">
              ${escapeHtml(input.employee.employeeId)}<br />
              ${escapeHtml(input.employee.designation)} - ${escapeHtml(input.employee.department)}
            </div>
          </div>
          <div class="panel">
            <div class="label">Net Payment</div>
            <div class="value">${escapeHtml(formatCurrency(input.netAmount))}</div>
            <div style="margin-top: 10px; font-size: 14px; color: #475569;">
              Method: ${escapeHtml(input.paymentMethod)}<br />
              Salary Due: ${escapeHtml(input.salaryDate)}
            </div>
          </div>
        </div>

        <div class="table">
          <div class="row">
            <div class="row-label">Base Salary</div>
            <div class="row-value">${escapeHtml(formatCurrency(input.salaryAmount))}</div>
          </div>
          <div class="row">
            <div class="row-label">Bonus</div>
            <div class="row-value">${escapeHtml(formatCurrency(input.bonusAmount))}</div>
          </div>
          <div class="row">
            <div class="row-label">Reimbursements</div>
            <div class="row-value">${escapeHtml(formatCurrency(input.reimbursementAmount))}</div>
          </div>
          <div class="row">
            <div class="row-label">Deductions / Recoveries</div>
            <div class="row-value">${escapeHtml(formatCurrency(input.deductionAmount))}</div>
          </div>
          <div class="row row-total">
            <div class="row-label"><strong>Net Salary Paid</strong></div>
            <div class="row-value">${escapeHtml(formatCurrency(input.netAmount))}</div>
          </div>
        </div>

        <p class="footnote">
          This payslip is generated from the recorded employee transactions for the selected period. No duplicate payslip record is stored separately.
        </p>
      </div>
    </body>
    </html>
  `;
}

function downloadEmployeePayslip(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function printEmployeePayslip(html: string) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="border border-border p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((index) => (
          <div key={index} className="border border-border p-4 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmployeeWorkspaceSheet({
  employee,
  open,
  onClose,
}: {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | EmployeeTransaction['type']>('all');
  const [selectedPayslipTransactionId, setSelectedPayslipTransactionId] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(
    () => getMonthBounds(periodMonth, periodYear),
    [periodMonth, periodYear],
  );

  const { data: employeeData, isLoading: isEmployeeLoading } = useEmployee(employee?.id);
  const { data: attendanceData, isLoading: isAttendanceLoading } = useEmployeeAttendance(employee?.id, periodMonth, periodYear);
  const { data: monthlyTransactionsData, isLoading: isMonthlyTransactionsLoading } = useEmployeeTransactions(employee?.id, {
    startDate,
    endDate,
  });
  const { data: allTransactionsData, isLoading: isAllTransactionsLoading } = useEmployeeTransactions(employee?.id);

  const {
    mutateAsync: createTransactionAsync,
    isPending: isCreatingTransaction,
    error: createTransactionError,
  } = useCreateEmployeeTransaction();

  const {
    mutateAsync: updateTransactionStatusAsync,
    isPending: isUpdatingTransaction,
    error: updateTransactionError,
  } = useUpdateEmployeeTransactionStatus();

  const employeeDetails = employeeData?.data?.employee ?? employee;
  const employeeStats = employeeData?.data?.stats;
  const attendanceSummary = attendanceData?.data?.summary;
  const attendanceRows = attendanceData?.data?.attendance ?? [];
  const monthlyTransactions = monthlyTransactionsData?.data?.transactions ?? [];
  const allTransactions = allTransactionsData?.data?.transactions ?? [];

  const filteredTransactions = useMemo(
    () => (transactionTypeFilter === 'all'
      ? monthlyTransactions
      : monthlyTransactions.filter((transaction) => transaction.type === transactionTypeFilter)),
    [monthlyTransactions, transactionTypeFilter],
  );

  const advanceOutstanding = useMemo(() => {
    const advances = allTransactions
      .filter((transaction) => transaction.status === 'paid' && transaction.type === 'advance')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const deductions = allTransactions
      .filter((transaction) => transaction.status === 'paid' && transaction.type === 'deduction')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return Math.max(advances - deductions, 0);
  }, [allTransactions]);

  const attendanceInsights = useMemo(() => {
    let lateDays = 0;
    let overtimeMinutes = 0;
    let sickLeaveDays = 0;
    let casualLeaveDays = 0;
    let unpaidLeaveDays = 0;

    attendanceRows.forEach((record) => {
      const reason = record.reasonOfAbsenteeism?.toLowerCase() ?? '';

      if (record.status === 'absent') {
        if (reason.includes('sick')) sickLeaveDays += 1;
        else if (reason.includes('casual')) casualLeaveDays += 1;
        else if (reason.includes('unpaid')) unpaidLeaveDays += 1;
      }

      const checkInMinutes = getUtcMinutes(record.checkInTime);
      if (checkInMinutes !== null && checkInMinutes > DEFAULT_SHIFT_START_MINUTES) {
        lateDays += 1;
      }

      const checkOutMinutes = getUtcMinutes(record.checkOutTime);
      if (checkOutMinutes !== null && checkOutMinutes > DEFAULT_SHIFT_END_MINUTES) {
        overtimeMinutes += checkOutMinutes - DEFAULT_SHIFT_END_MINUTES;
      }
    });

    return {
      lateDays,
      overtimeMinutes,
      sickLeaveDays,
      casualLeaveDays,
      unpaidLeaveDays,
    };
  }, [attendanceRows]);

  const paidSalaryTransactions = useMemo(
    () => allTransactions.filter((transaction) => transaction.type === 'salary' && transaction.status === 'paid'),
    [allTransactions],
  );

  const selectedPayslipTransaction = useMemo(() => {
    if (selectedPayslipTransactionId) {
      const selected = paidSalaryTransactions.find((transaction) => transaction.id === selectedPayslipTransactionId);
      if (selected) return selected;
    }

    return monthlyTransactions.find((transaction) => transaction.type === 'salary' && transaction.status === 'paid')
      ?? paidSalaryTransactions[0]
      ?? null;
  }, [monthlyTransactions, paidSalaryTransactions, selectedPayslipTransactionId]);

  const payslipBreakdown = useMemo(() => {
    const bonusAmount = monthlyTransactions
      .filter((transaction) => transaction.status === 'paid' && transaction.type === 'bonus')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const reimbursementAmount = monthlyTransactions
      .filter((transaction) => transaction.status === 'paid' && transaction.type === 'reimbursement')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const deductionAmount = monthlyTransactions
      .filter((transaction) => transaction.status === 'paid' && transaction.type === 'deduction')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const baseSalary = selectedPayslipTransaction?.amount ?? employeeDetails?.salary ?? 0;

    return {
      baseSalary,
      bonusAmount,
      reimbursementAmount,
      deductionAmount,
      netAmount: baseSalary + bonusAmount + reimbursementAmount - deductionAmount,
    };
  }, [employeeDetails?.salary, monthlyTransactions, selectedPayslipTransaction]);

  const payslipHtml = useMemo(() => {
    if (!employeeDetails || !selectedPayslipTransaction) return null;

    return buildEmployeePayslipHtml({
      employee: employeeDetails,
      periodLabel: getMonthLabel(periodMonth, periodYear),
      salaryAmount: payslipBreakdown.baseSalary,
      salaryDate: employeeDetails.salaryDate ? `${employeeDetails.salaryDate}th of every month` : 'Not configured',
      bonusAmount: payslipBreakdown.bonusAmount,
      reimbursementAmount: payslipBreakdown.reimbursementAmount,
      deductionAmount: payslipBreakdown.deductionAmount,
      netAmount: payslipBreakdown.netAmount,
      paidAt: selectedPayslipTransaction.paidAt,
      paymentMethod: selectedPayslipTransaction.paymentMethod ?? 'Not recorded',
    });
  }, [employeeDetails, payslipBreakdown, periodMonth, periodYear, selectedPayslipTransaction]);

  const currentMonthLabel = getMonthLabel(periodMonth, periodYear);
  const isLoading = isEmployeeLoading || isAttendanceLoading || isMonthlyTransactionsLoading || isAllTransactionsLoading;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TransactionComposerFormValues, unknown, TransactionComposerInput>({
    resolver: zodResolver(transactionComposerSchema),
    defaultValues: {
      employeeId: employee?.id ?? '',
      type: 'advance',
      amount: 0,
      description: '',
      date: toDateInputValue(new Date()),
      paymentMethod: 'cash',
      markAsPaidNow: true,
    },
  });

  useEffect(() => {
    if (!employee?.id) return;

    setActiveTab('overview');
    setTransactionTypeFilter('all');
    setSelectedPayslipTransactionId(null);
    reset({
      employeeId: employee.id,
      type: 'advance',
      amount: 0,
      description: '',
      date: toDateInputValue(new Date()),
      paymentMethod: 'cash',
      markAsPaidNow: true,
    });
  }, [employee?.id, reset]);

  const openTransactionComposer = (
    type: EmployeeTransaction['type'],
    description: string,
  ) => {
    setActiveTab('transactions');
    setValue('type', type);
    setValue('description', description);
  };

  const handleCreateTransaction = async (values: TransactionComposerInput) => {
    if (!employee?.id) return;

    try {
      const payload = {
        employeeId: employee.id,
        type: values.type,
        amount: values.amount,
        description: values.description,
        date: values.date,
        paymentMethod: values.paymentMethod,
      };

      const result = await createTransactionAsync(payload) as EmployeeTransactionResponse;

      if (values.markAsPaidNow) {
        await updateTransactionStatusAsync({
          id: result.data.transaction.id,
          employeeId: employee.id,
          data: {
            status: 'paid',
            paidAt: values.date,
          },
        });
      }

      toast.success(`${transactionTypeLabel(values.type)} entry created for ${employeeDetails?.name ?? 'employee'}`);

      reset({
        employeeId: employee.id,
        type: values.type,
        amount: 0,
        description: '',
        date: toDateInputValue(new Date()),
        paymentMethod: values.paymentMethod ?? 'cash',
        markAsPaidNow: values.markAsPaidNow,
      });
    } catch {
      // Mutation state already captures the user-facing error.
    }
  };

  const markTransactionPaid = async (transaction: EmployeeTransaction) => {
    if (!employee?.id) return;

    try {
      await updateTransactionStatusAsync({
        id: transaction.id,
        employeeId: employee.id,
        data: {
          status: 'paid',
          paidAt: toDateInputValue(new Date()),
        },
      });
      toast.success(`${transactionTypeLabel(transaction.type)} marked as paid`);
    } catch {
      // Mutation state already captures the user-facing error.
    }
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[1180px] border-l border-border p-0 flex flex-col bg-background">
        <SheetHeader className="border-b border-border p-8 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">Employee Workspace</p>
              <SheetTitle className="mt-2 text-3xl font-serif tracking-tight text-foreground italic">
                {employeeDetails?.name ?? employee?.name ?? 'Employee'}
              </SheetTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {employeeDetails?.employeeId ?? employee?.employeeId} - {employeeDetails?.designation ?? employee?.designation}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Month</Label>
                <select
                  value={periodMonth}
                  onChange={(event) => setPeriodMonth(Number(event.target.value))}
                  className="h-10 rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-widest"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>{new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'short' })}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Year</Label>
                <select
                  value={periodYear}
                  onChange={(event) => setPeriodYear(Number(event.target.value))}
                  className="h-10 rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-widest"
                >
                  {Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </SheetHeader>

        {isLoading || !employeeDetails ? (
          <DetailSkeleton />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
            <div className="border-b border-border px-8 py-3">
              <TabsList variant="line" className="gap-3">
                <TabsTrigger value="overview" className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest">Overview</TabsTrigger>
                <TabsTrigger value="attendance" className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest">Attendance</TabsTrigger>
                <TabsTrigger value="transactions" className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest">Transactions</TabsTrigger>
                <TabsTrigger value="payslip" className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest">Payslip</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Monthly Salary</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-foreground">{formatCurrency(employeeDetails.salary)}</p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Advance Outstanding</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-amber-600">{formatCurrency(advanceOutstanding)}</p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Attendance Count</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-foreground">{employeeStats?.attendanceCount ?? 0}</p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Transactions</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-foreground">{employeeStats?.transactionCount ?? 0}</p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="border border-border">
                    <div className="border-b border-border px-5 py-4">
                      <h3 className="text-lg font-serif text-foreground">Employee Profile</h3>
                    </div>
                    <div className="grid gap-0 sm:grid-cols-2">
                      {[
                        ['Employee ID', employeeDetails.employeeId],
                        ['Department', employeeDetails.department],
                        ['Designation', employeeDetails.designation],
                        ['Status', employeeDetails.status],
                        ['Phone', employeeDetails.phone],
                        ['Email', employeeDetails.email ?? '-'],
                        ['Joining Date', formatDate(employeeDetails.dateOfJoining)],
                        ['Salary Due Day', employeeDetails.salaryDate ? `${employeeDetails.salaryDate}th` : 'Not set'],
                      ].map(([label, value]) => (
                        <div key={label} className="border-b border-border p-4 sm:border-r even:sm:border-r-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</p>
                          <p className="mt-2 text-sm text-foreground">{value}</p>
                        </div>
                      ))}
                      <div className="p-4 sm:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Address</p>
                        <p className="mt-2 text-sm text-foreground">{employeeDetails.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-border p-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Current Period Snapshot</p>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{currentMonthLabel} work days</span>
                          <span className="font-bold text-foreground">{attendanceSummary?.workDays ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Attendance percentage</span>
                          <span className="font-bold text-foreground">{attendanceSummary?.attendancePercentage ?? 0}%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Net paid / adjusted</span>
                          <span className="font-bold text-foreground">{formatCurrency(monthlyTransactionsData?.data?.summary.netAmount ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Pending transaction amount</span>
                          <span className="font-bold text-amber-600">{formatCurrency(monthlyTransactionsData?.data?.summary.pendingAmount ?? 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-border p-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Quick Actions</p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest"
                          onClick={() => openTransactionComposer('advance', `Advance issued for ${currentMonthLabel}`)}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" /> Add Advance
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest"
                          onClick={() => openTransactionComposer('deduction', `Recovery for ${currentMonthLabel}`)}
                        >
                          <ArrowDownRight className="h-3.5 w-3.5" /> Add Recovery
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest"
                          onClick={() => openTransactionComposer('bonus', `Bonus for ${currentMonthLabel}`)}
                        >
                          <Wallet className="h-3.5 w-3.5" /> Add Bonus
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest"
                          onClick={() => setActiveTab('payslip')}
                        >
                          <FileText className="h-3.5 w-3.5" /> Open Payslip
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Present</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-emerald-600">{attendanceSummary?.presentDays ?? 0}</p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Absent</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-red-600">{attendanceSummary?.absentDays ?? 0}</p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Half Days</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-amber-600">{attendanceSummary?.halfDays ?? 0}</p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Late Marks</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-foreground">{attendanceInsights.lateDays}</p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Overtime</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-foreground">{formatMinutes(attendanceInsights.overtimeMinutes)}</p>
                  </div>
                </div>

                <div className="border border-border p-5 bg-muted/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Leave Tracking</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="border border-border bg-background p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Sick Leave</p>
                      <p className="mt-2 text-xl font-bold text-foreground">{attendanceInsights.sickLeaveDays}</p>
                    </div>
                    <div className="border border-border bg-background p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Casual Leave</p>
                      <p className="mt-2 text-xl font-bold text-foreground">{attendanceInsights.casualLeaveDays}</p>
                    </div>
                    <div className="border border-border bg-background p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Unpaid Leave</p>
                      <p className="mt-2 text-xl font-bold text-foreground">{attendanceInsights.unpaidLeaveDays}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-muted-foreground">
                    Late and overtime analytics use a default 10:00 AM to 6:00 PM shift whenever check-in and check-out times are recorded.
                  </p>
                </div>

                <div className="border border-border overflow-hidden">
                  <div className="border-b border-border bg-muted/20 px-5 py-4">
                    <h3 className="text-lg font-serif text-foreground">{currentMonthLabel} Attendance</h3>
                  </div>

                  {attendanceRows.length === 0 ? (
                    <div className="p-10 text-sm text-muted-foreground italic">No attendance recorded for this period yet.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {attendanceRows.map((record) => (
                        <div key={record.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[160px_140px_1fr_1fr] lg:items-start">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Date</p>
                            <p className="mt-2 text-sm text-foreground">{formatDate(record.date)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</p>
                            <span className={cn(
                              'mt-2 inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                              record.status === 'present'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : record.status === 'half_day'
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-red-500/10 text-red-600',
                            )}>
                              {record.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Shift Times</p>
                            <p className="mt-2 text-sm text-foreground">
                              In: {formatDateTime(record.checkInTime)}<br />
                              Out: {formatDateTime(record.checkOutTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Notes</p>
                            <p className="mt-2 text-sm text-foreground">{record.reasonOfAbsenteeism ?? 'No note recorded'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Paid This Period</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-emerald-600">
                      {formatCurrency(monthlyTransactionsData?.data?.summary.totalPaid ?? 0)}
                    </p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Pending</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-amber-600">
                      {formatCurrency(monthlyTransactionsData?.data?.summary.pendingAmount ?? 0)}
                    </p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Deductions</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-red-600">
                      {formatCurrency(monthlyTransactionsData?.data?.summary.totalDeducted ?? 0)}
                    </p>
                  </div>
                  <div className="border border-border p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Advance Outstanding</p>
                    <p className="mt-3 text-2xl font-sans font-bold text-foreground">{formatCurrency(advanceOutstanding)}</p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                  <div className="border border-border p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Create Transaction</p>
                        <h3 className="mt-2 text-lg font-serif text-foreground">Advance, recovery, bonus, or manual pay item</h3>
                      </div>
                      <CalendarDays className="h-4 w-4 text-muted-foreground/40" />
                    </div>

                    <form onSubmit={handleSubmit(handleCreateTransaction)} className="mt-5 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Type</Label>
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
                          Salary payments are created from payroll actions so company funds and reminders stay in sync.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Amount</Label>
                          <Input type="number" min={0} step="0.01" {...register('amount', { valueAsNumber: true })} className="h-11 rounded-none bg-background" />
                          {errors.amount && <p className="text-[10px] text-destructive">{errors.amount.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Date</Label>
                          <Input type="date" {...register('date')} className="h-11 rounded-none bg-background" />
                          {errors.date && <p className="text-[10px] text-destructive">{errors.date.message}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Payment Method</Label>
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
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Description</Label>
                        <Input {...register('description')} className="h-11 rounded-none bg-background" placeholder={`Entry for ${currentMonthLabel}`} />
                        {errors.description && <p className="text-[10px] text-destructive">{errors.description.message}</p>}
                      </div>

                      <label className="flex items-center gap-3 border border-border px-4 py-3 text-sm text-foreground">
                        <input type="checkbox" {...register('markAsPaidNow')} className="h-4 w-4 rounded-none accent-current" />
                        Mark this transaction as paid immediately
                      </label>

                      {(createTransactionError || updateTransactionError) && (
                        <div className="border border-red-500/30 bg-red-500/10 p-4 text-[11px] text-red-600">
                          {getApiErrorMessage(
                            createTransactionError ?? updateTransactionError,
                            'Unable to save employee transaction.',
                          )}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isCreatingTransaction || isUpdatingTransaction}
                        className="h-11 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest"
                      >
                        {isCreatingTransaction || isUpdatingTransaction ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Transaction'}
                      </Button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Transaction History</p>
                        <h3 className="mt-2 text-lg font-serif text-foreground">{currentMonthLabel}</h3>
                      </div>

                      <div className="w-full lg:w-52">
                        <select
                          value={transactionTypeFilter}
                          onChange={(event) => setTransactionTypeFilter(event.target.value as typeof transactionTypeFilter)}
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

                    <div className="border border-border overflow-hidden">
                      {filteredTransactions.length === 0 ? (
                        <div className="p-10 text-sm text-muted-foreground italic">
                          No transactions recorded for this period with the current filter.
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {filteredTransactions.map((transaction) => (
                            <div key={transaction.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[140px_110px_1fr_120px_140px] lg:items-center">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Date</p>
                                <p className="mt-2 text-sm text-foreground">{formatDate(transaction.date)}</p>
                              </div>

                              <div>
                                <span className={cn('inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', transactionTypeClass(transaction.type))}>
                                  {transactionTypeLabel(transaction.type)}
                                </span>
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-foreground">{formatCurrency(transaction.amount)}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">{transaction.description}</p>
                              </div>

                              <div>
                                <span className={cn('inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', transactionStatusClass(transaction.status))}>
                                  {transaction.status}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2 lg:justify-end">
                                {transaction.status === 'pending' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest"
                                    onClick={() => markTransactionPaid(transaction)}
                                    disabled={isUpdatingTransaction}
                                  >
                                    {isUpdatingTransaction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mark Paid'}
                                  </Button>
                                )}

                                {transaction.type === 'salary' && transaction.status === 'paid' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest"
                                    onClick={() => {
                                      const date = new Date(transaction.date);
                                      setPeriodMonth(date.getUTCMonth() + 1);
                                      setPeriodYear(date.getUTCFullYear());
                                      setSelectedPayslipTransactionId(transaction.id);
                                      setActiveTab('payslip');
                                    }}
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
              </TabsContent>

              <TabsContent value="payslip" className="space-y-6">
                {!selectedPayslipTransaction || !payslipHtml ? (
                  <div className="border border-dashed border-border p-12 text-center">
                    <p className="text-lg font-serif text-foreground">No paid salary transaction found</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Use the payroll dashboard to pay salary for {currentMonthLabel}, then this printable payslip will be ready here.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-6 h-10 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest"
                      onClick={() => setActiveTab('transactions')}
                    >
                      Open Transactions
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Payslip Preview</p>
                        <h3 className="mt-2 text-2xl font-serif text-foreground">{employeeDetails.name} - {currentMonthLabel}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Generated from recorded salary, bonus, reimbursement, and deduction transactions.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="h-10 rounded-none px-4 text-[10px] font-bold uppercase tracking-widest"
                          onClick={() => downloadEmployeePayslip(
                            `Payslip-${employeeDetails.name.replace(/\s+/g, '-')}-${currentMonthLabel.replace(/\s+/g, '-')}.html`,
                            payslipHtml,
                          )}
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 rounded-none px-4 text-[10px] font-bold uppercase tracking-widest"
                          onClick={() => printEmployeePayslip(payslipHtml)}
                        >
                          <Printer className="h-3.5 w-3.5" /> Print
                        </Button>
                      </div>
                    </div>

                    <div className="border border-border bg-card">
                      <div className="flex flex-col gap-6 border-b border-border px-6 py-6 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground/50">Employee Payslip</p>
                          <h4 className="mt-3 text-3xl font-serif tracking-tight text-foreground">Salary Slip</h4>
                        </div>
                        <div className="space-y-1 text-left md:text-right">
                          <p className="text-sm text-muted-foreground">
                            Period: <span className="font-bold text-foreground">{currentMonthLabel}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Paid On: <span className="font-bold text-foreground">{formatDate(selectedPayslipTransaction.paidAt)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 border-b border-border px-6 py-6 md:grid-cols-2">
                        <div className="border border-border bg-muted/20 p-5">
                          <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Employee</p>
                          <p className="mt-3 text-2xl font-sans font-bold text-foreground">{employeeDetails.name}</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {employeeDetails.employeeId} - {employeeDetails.designation}
                          </p>
                        </div>
                        <div className="border border-border bg-muted/20 p-5">
                          <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Net Paid</p>
                          <p className="mt-3 text-2xl font-sans font-bold text-emerald-600">{formatCurrency(payslipBreakdown.netAmount)}</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Method: {selectedPayslipTransaction.paymentMethod ?? 'Not recorded'}
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-border">
                        <div className="grid gap-2 px-6 py-4 md:grid-cols-[240px_1fr]">
                          <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Base Salary</span>
                          <span className="text-sm text-foreground">{formatCurrency(payslipBreakdown.baseSalary)}</span>
                        </div>
                        <div className="grid gap-2 px-6 py-4 md:grid-cols-[240px_1fr]">
                          <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Bonus</span>
                          <span className="text-sm text-foreground">{formatCurrency(payslipBreakdown.bonusAmount)}</span>
                        </div>
                        <div className="grid gap-2 px-6 py-4 md:grid-cols-[240px_1fr]">
                          <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Reimbursements</span>
                          <span className="text-sm text-foreground">{formatCurrency(payslipBreakdown.reimbursementAmount)}</span>
                        </div>
                        <div className="grid gap-2 px-6 py-4 md:grid-cols-[240px_1fr]">
                          <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Deductions / Recoveries</span>
                          <span className="text-sm text-foreground">{formatCurrency(payslipBreakdown.deductionAmount)}</span>
                        </div>
                        <div className="grid gap-2 bg-muted/20 px-6 py-4 md:grid-cols-[240px_1fr]">
                          <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Net Salary Paid</span>
                          <span className="text-sm font-bold text-foreground">{formatCurrency(payslipBreakdown.netAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
