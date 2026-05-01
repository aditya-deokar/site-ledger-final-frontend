import { useEffect, useMemo, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { useEmployeeAttendance } from '@/hooks/api/attendance.hooks';
import {
  useCreateEmployeeTransaction,
  useEmployee,
  useEmployeeTransactions,
  useUpdateEmployeeTransactionStatus,
} from '@/hooks/api/employee.hooks';
import type {
  Employee,
  EmployeeTransaction,
  EmployeeTransactionResponse,
} from '@/schemas/employee.schema';

import {
  DEFAULT_SHIFT_END_MINUTES,
  DEFAULT_SHIFT_START_MINUTES,
  buildEmployeePayslipHtml,
  getMonthBounds,
  getMonthLabel,
  getTransactionComposerDefaultValues,
  getUtcMinutes,
  toDateInputValue,
  transactionComposerSchema,
  transactionTypeLabel,
  type EmployeeTransactionTypeFilter,
  type TransactionComposerFormValues,
  type TransactionComposerInput,
} from './utils';

export type EmployeeWorkspaceTab = 'overview' | 'attendance' | 'transactions' | 'payslip';

export type EmployeeWorkspaceForm = UseFormReturn<
  TransactionComposerFormValues,
  unknown,
  TransactionComposerInput
>;

type UseEmployeeWorkspaceOptions = {
  employeeId?: string;
  initialEmployee?: Employee | null;
};

export function useEmployeeWorkspace({
  employeeId,
  initialEmployee,
}: UseEmployeeWorkspaceOptions) {
  const resolvedEmployeeId = employeeId ?? initialEmployee?.id;

  const [activeTab, setActiveTab] = useState<EmployeeWorkspaceTab>('overview');
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState<EmployeeTransactionTypeFilter>('all');
  const [selectedPayslipTransactionId, setSelectedPayslipTransactionId] =
    useState<string | null>(null);

  const { startDate, endDate } = useMemo(
    () => getMonthBounds(periodMonth, periodYear),
    [periodMonth, periodYear],
  );

  const { data: employeeData, isLoading: isEmployeeLoading } = useEmployee(resolvedEmployeeId);
  const { data: attendanceData, isLoading: isAttendanceLoading } = useEmployeeAttendance(
    resolvedEmployeeId,
    periodMonth,
    periodYear,
  );
  const { data: monthlyTransactionsData, isLoading: isMonthlyTransactionsLoading } =
    useEmployeeTransactions(resolvedEmployeeId, {
      startDate,
      endDate,
    });
  const { data: allTransactionsData, isLoading: isAllTransactionsLoading } =
    useEmployeeTransactions(resolvedEmployeeId);

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

  const employeeDetails = employeeData?.data?.employee ?? initialEmployee ?? null;
  const employeeStats = employeeData?.data?.stats;
  const attendanceSummary = attendanceData?.data?.summary;
  const attendanceRows = attendanceData?.data?.attendance ?? [];
  const monthlyTransactions = monthlyTransactionsData?.data?.transactions ?? [];
  const allTransactions = allTransactionsData?.data?.transactions ?? [];
  const monthlyTransactionSummary = monthlyTransactionsData?.data?.summary;

  const filteredTransactions = useMemo(
    () => (
      transactionTypeFilter === 'all'
        ? monthlyTransactions
        : monthlyTransactions.filter((transaction) => transaction.type === transactionTypeFilter)
    ),
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
    () => allTransactions.filter((transaction) => (
      transaction.type === 'salary' && transaction.status === 'paid'
    )),
    [allTransactions],
  );

  const selectedPayslipTransaction = useMemo(() => {
    if (selectedPayslipTransactionId) {
      const selected = paidSalaryTransactions.find(
        (transaction) => transaction.id === selectedPayslipTransactionId,
      );
      if (selected) return selected;
    }

    return monthlyTransactions.find((transaction) => (
      transaction.type === 'salary' && transaction.status === 'paid'
    )) ?? paidSalaryTransactions[0] ?? null;
  }, [monthlyTransactions, paidSalaryTransactions, selectedPayslipTransactionId]);

  const payslipBreakdown = useMemo(() => {
    const bonusAmount = monthlyTransactions
      .filter((transaction) => transaction.status === 'paid' && transaction.type === 'bonus')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const reimbursementAmount = monthlyTransactions
      .filter((transaction) => (
        transaction.status === 'paid' && transaction.type === 'reimbursement'
      ))
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
      salaryDate: employeeDetails.salaryDate
        ? `${employeeDetails.salaryDate}th of every month`
        : 'Not configured',
      bonusAmount: payslipBreakdown.bonusAmount,
      reimbursementAmount: payslipBreakdown.reimbursementAmount,
      deductionAmount: payslipBreakdown.deductionAmount,
      netAmount: payslipBreakdown.netAmount,
      paidAt: selectedPayslipTransaction.paidAt,
      paymentMethod: selectedPayslipTransaction.paymentMethod ?? 'Not recorded',
    });
  }, [
    employeeDetails,
    payslipBreakdown,
    periodMonth,
    periodYear,
    selectedPayslipTransaction,
  ]);

  const currentMonthLabel = getMonthLabel(periodMonth, periodYear);
  const isLoading = Boolean(resolvedEmployeeId) && (
    isEmployeeLoading
    || isAttendanceLoading
    || isMonthlyTransactionsLoading
    || isAllTransactionsLoading
  );

  const form = useForm<TransactionComposerFormValues, unknown, TransactionComposerInput>({
    resolver: zodResolver(transactionComposerSchema),
    defaultValues: getTransactionComposerDefaultValues(resolvedEmployeeId),
  });

  const {
    reset,
    setValue,
  } = form;

  useEffect(() => {
    setActiveTab('overview');
    setTransactionTypeFilter('all');
    setSelectedPayslipTransactionId(null);
    reset(getTransactionComposerDefaultValues(resolvedEmployeeId));
  }, [resolvedEmployeeId, reset]);

  const openTransactionComposer = (
    type: EmployeeTransaction['type'],
    description: string,
  ) => {
    setActiveTab('transactions');
    setValue('type', type);
    setValue('description', description);
  };

  const openTransactionsTab = () => {
    setActiveTab('transactions');
  };

  const openPayslipTab = () => {
    setActiveTab('payslip');
  };

  const viewTransactionPayslip = (transaction: EmployeeTransaction) => {
    const date = new Date(transaction.date);
    setPeriodMonth(date.getUTCMonth() + 1);
    setPeriodYear(date.getUTCFullYear());
    setSelectedPayslipTransactionId(transaction.id);
    setActiveTab('payslip');
  };

  const handleCreateTransaction = async (values: TransactionComposerInput) => {
    if (!resolvedEmployeeId) return;

    try {
      const payload = {
        employeeId: resolvedEmployeeId,
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
          employeeId: resolvedEmployeeId,
          data: {
            status: 'paid',
            paidAt: values.date,
          },
        });
      }

      toast.success(
        `${transactionTypeLabel(values.type)} entry created for ${employeeDetails?.name ?? 'employee'}`,
      );

      reset(getTransactionComposerDefaultValues(resolvedEmployeeId, {
        type: values.type,
        paymentMethod: values.paymentMethod ?? 'cash',
        markAsPaidNow: values.markAsPaidNow,
      }));
    } catch {
      // Mutation state already captures the user-facing error.
    }
  };

  const markTransactionPaid = async (transaction: EmployeeTransaction) => {
    if (!resolvedEmployeeId) return;

    try {
      await updateTransactionStatusAsync({
        id: transaction.id,
        employeeId: resolvedEmployeeId,
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

  return {
    resolvedEmployeeId,
    activeTab,
    setActiveTab,
    periodMonth,
    setPeriodMonth,
    periodYear,
    setPeriodYear,
    transactionTypeFilter,
    setTransactionTypeFilter,
    employeeDetails,
    employeeStats,
    attendanceSummary,
    attendanceRows,
    attendanceInsights,
    monthlyTransactionSummary,
    filteredTransactions,
    advanceOutstanding,
    selectedPayslipTransaction,
    payslipBreakdown,
    payslipHtml,
    currentMonthLabel,
    isLoading,
    form,
    isCreatingTransaction,
    isUpdatingTransaction,
    saveTransactionError: createTransactionError ?? updateTransactionError,
    isSavingTransaction: isCreatingTransaction || isUpdatingTransaction,
    openTransactionComposer,
    openTransactionsTab,
    openPayslipTab,
    viewTransactionPayslip,
    handleCreateTransaction,
    markTransactionPaid,
  };
}

export type EmployeeWorkspaceController = ReturnType<typeof useEmployeeWorkspace>;
