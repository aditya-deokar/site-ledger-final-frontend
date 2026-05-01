import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { MonthlyAttendanceSummary } from '@/schemas/attendance.schema';
import type {
  Employee,
  EmployeeStats,
  EmployeeTransaction,
  EmployeeTransactionsSummary,
} from '@/schemas/employee.schema';

import { formatCurrency, formatDate } from './utils';

type EmployeeWorkspaceOverviewTabProps = {
  employee: Employee;
  employeeStats?: EmployeeStats;
  attendanceSummary?: MonthlyAttendanceSummary;
  monthlyTransactionSummary?: EmployeeTransactionsSummary;
  advanceOutstanding: number;
  currentMonthLabel: string;
  onOpenTransactionComposer: (
    type: EmployeeTransaction['type'],
    description: string,
  ) => void;
  onOpenPayslip: () => void;
};

function OverviewMetric({
  label,
  value,
  valueClassName = 'text-foreground',
}: {
  label: string;
  value: string | number;
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

export function EmployeeWorkspaceOverviewTab({
  employee,
  employeeStats,
  attendanceSummary,
  monthlyTransactionSummary,
  advanceOutstanding,
  currentMonthLabel,
  onOpenTransactionComposer,
  onOpenPayslip,
}: EmployeeWorkspaceOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric
          label="Monthly Salary"
          value={formatCurrency(employee.salary)}
        />
        <OverviewMetric
          label="Advance Outstanding"
          value={formatCurrency(advanceOutstanding)}
          valueClassName="text-amber-600"
        />
        <OverviewMetric
          label="Attendance Count"
          value={employeeStats?.attendanceCount ?? 0}
        />
        <OverviewMetric
          label="Transactions"
          value={employeeStats?.transactionCount ?? 0}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-border">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-lg font-serif text-foreground">Employee Profile</h3>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            {[
              ['Employee ID', employee.employeeId],
              ['Department', employee.department],
              ['Designation', employee.designation],
              ['Status', employee.status],
              ['Phone', employee.phone],
              ['Email', employee.email ?? '-'],
              ['Joining Date', formatDate(employee.dateOfJoining)],
              ['Salary Due Day', employee.salaryDate ? `${employee.salaryDate}th` : 'Not set'],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-border p-4 sm:border-r even:sm:border-r-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  {label}
                </p>
                <p className="mt-2 text-sm text-foreground">{value}</p>
              </div>
            ))}
            <div className="p-4 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Address
              </p>
              <p className="mt-2 text-sm text-foreground">{employee.address}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-border p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Current Period Snapshot
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{currentMonthLabel} work days</span>
                <span className="font-bold text-foreground">{attendanceSummary?.workDays ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Attendance percentage</span>
                <span className="font-bold text-foreground">
                  {attendanceSummary?.attendancePercentage ?? 0}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Net paid / adjusted</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(monthlyTransactionSummary?.netAmount ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending transaction amount</span>
                <span className="font-bold text-amber-600">
                  {formatCurrency(monthlyTransactionSummary?.pendingAmount ?? 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-border p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Quick Actions
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest"
                onClick={() => onOpenTransactionComposer('advance', `Advance issued for ${currentMonthLabel}`)}
              >
                <ArrowUpRight className="h-3.5 w-3.5" /> Add Advance
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest"
                onClick={() => onOpenTransactionComposer('deduction', `Recovery for ${currentMonthLabel}`)}
              >
                <ArrowDownRight className="h-3.5 w-3.5" /> Add Recovery
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest"
                onClick={() => onOpenTransactionComposer('bonus', `Bonus for ${currentMonthLabel}`)}
              >
                <Wallet className="h-3.5 w-3.5" /> Add Bonus
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest"
                onClick={onOpenPayslip}
              >
                <FileText className="h-3.5 w-3.5" /> Open Payslip
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
