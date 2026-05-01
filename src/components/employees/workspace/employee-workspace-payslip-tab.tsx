import { Download, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Employee, EmployeeTransaction } from '@/schemas/employee.schema';

import {
  downloadEmployeePayslip,
  formatCurrency,
  formatDate,
  printEmployeePayslip,
} from './utils';

type EmployeeWorkspacePayslipTabProps = {
  employee: Employee;
  currentMonthLabel: string;
  selectedPayslipTransaction: EmployeeTransaction | null;
  payslipHtml: string | null;
  payslipBreakdown: {
    baseSalary: number;
    bonusAmount: number;
    reimbursementAmount: number;
    deductionAmount: number;
    netAmount: number;
  };
  onOpenTransactions: () => void;
};

export function EmployeeWorkspacePayslipTab({
  employee,
  currentMonthLabel,
  selectedPayslipTransaction,
  payslipHtml,
  payslipBreakdown,
  onOpenTransactions,
}: EmployeeWorkspacePayslipTabProps) {
  if (!selectedPayslipTransaction || !payslipHtml) {
    return (
      <div className="border border-dashed border-border p-12 text-center">
        <p className="text-lg font-serif text-foreground">No paid salary transaction found</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Use the payroll dashboard to pay salary for {currentMonthLabel}, then this printable
          payslip will be ready here.
        </p>
        <Button
          variant="outline"
          className="mt-6 h-10 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest"
          onClick={onOpenTransactions}
        >
          Open Transactions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Payslip Preview
          </p>
          <h3 className="mt-2 text-2xl font-serif text-foreground">
            {employee.name} - {currentMonthLabel}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Generated from recorded salary, bonus, reimbursement, and deduction transactions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-none px-4 text-[10px] font-bold uppercase tracking-widest"
            onClick={() => downloadEmployeePayslip(
              `Payslip-${employee.name.replace(/\s+/g, '-')}-${currentMonthLabel.replace(/\s+/g, '-')}.html`,
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
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
              Employee Payslip
            </p>
            <h4 className="mt-3 text-3xl font-serif tracking-tight text-foreground">
              Salary Slip
            </h4>
          </div>
          <div className="space-y-1 text-left md:text-right">
            <p className="text-sm text-muted-foreground">
              Period: <span className="font-bold text-foreground">{currentMonthLabel}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Paid On:{' '}
              <span className="font-bold text-foreground">
                {formatDate(selectedPayslipTransaction.paidAt)}
              </span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-b border-border px-6 py-6 md:grid-cols-2">
          <div className="border border-border bg-muted/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
              Employee
            </p>
            <p className="mt-3 text-2xl font-sans font-bold text-foreground">{employee.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {employee.employeeId} - {employee.designation}
            </p>
          </div>
          <div className="border border-border bg-muted/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
              Net Paid
            </p>
            <p className="mt-3 text-2xl font-sans font-bold text-emerald-600">
              {formatCurrency(payslipBreakdown.netAmount)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Method: {selectedPayslipTransaction.paymentMethod ?? 'Not recorded'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          <div className="grid gap-2 px-6 py-4 md:grid-cols-[240px_1fr]">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
              Base Salary
            </span>
            <span className="text-sm text-foreground">
              {formatCurrency(payslipBreakdown.baseSalary)}
            </span>
          </div>
          <div className="grid gap-2 px-6 py-4 md:grid-cols-[240px_1fr]">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
              Bonus
            </span>
            <span className="text-sm text-foreground">
              {formatCurrency(payslipBreakdown.bonusAmount)}
            </span>
          </div>
          <div className="grid gap-2 px-6 py-4 md:grid-cols-[240px_1fr]">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
              Reimbursements
            </span>
            <span className="text-sm text-foreground">
              {formatCurrency(payslipBreakdown.reimbursementAmount)}
            </span>
          </div>
          <div className="grid gap-2 px-6 py-4 md:grid-cols-[240px_1fr]">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
              Deductions / Recoveries
            </span>
            <span className="text-sm text-foreground">
              {formatCurrency(payslipBreakdown.deductionAmount)}
            </span>
          </div>
          <div className="grid gap-2 bg-muted/20 px-6 py-4 md:grid-cols-[240px_1fr]">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
              Net Salary Paid
            </span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(payslipBreakdown.netAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
