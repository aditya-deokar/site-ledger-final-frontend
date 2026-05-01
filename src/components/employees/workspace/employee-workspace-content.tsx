import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { EmployeeWorkspaceController } from './use-employee-workspace';
import { EmployeeWorkspaceAttendanceTab } from './employee-workspace-attendance-tab';
import { EmployeeWorkspaceOverviewTab } from './employee-workspace-overview-tab';
import { EmployeeWorkspacePayslipTab } from './employee-workspace-payslip-tab';
import { EmployeeWorkspaceSkeleton } from './employee-workspace-skeleton';
import { EmployeeWorkspaceTransactionsTab } from './employee-workspace-transactions-tab';

type EmployeeWorkspaceContentProps = {
  workspace: EmployeeWorkspaceController;
  tabsClassName?: string;
  bodyClassName?: string;
};

export function EmployeeWorkspaceContent({
  workspace,
  tabsClassName,
  bodyClassName = 'px-8 py-6',
}: EmployeeWorkspaceContentProps) {
  const { employeeDetails } = workspace;

  if (workspace.isLoading || !employeeDetails) {
    return <EmployeeWorkspaceSkeleton />;
  }

  return (
    <Tabs
      value={workspace.activeTab}
      onValueChange={(value) => workspace.setActiveTab(value as typeof workspace.activeTab)}
      className={tabsClassName}
    >
      <div className="border-b border-border px-8 py-3">
        <TabsList variant="line" className="gap-3">
          <TabsTrigger
            value="overview"
            className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest"
          >
            Attendance
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest"
          >
            Transactions
          </TabsTrigger>
          <TabsTrigger
            value="payslip"
            className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest"
          >
            Payslip
          </TabsTrigger>
        </TabsList>
      </div>

      <div className={bodyClassName}>
        <TabsContent value="overview">
          <EmployeeWorkspaceOverviewTab
            employee={employeeDetails}
            employeeStats={workspace.employeeStats}
            attendanceSummary={workspace.attendanceSummary}
            monthlyTransactionSummary={workspace.monthlyTransactionSummary}
            advanceOutstanding={workspace.advanceOutstanding}
            currentMonthLabel={workspace.currentMonthLabel}
            onOpenTransactionComposer={workspace.openTransactionComposer}
            onOpenPayslip={workspace.openPayslipTab}
          />
        </TabsContent>

        <TabsContent value="attendance">
          <EmployeeWorkspaceAttendanceTab
            attendanceSummary={workspace.attendanceSummary}
            attendanceRows={workspace.attendanceRows}
            attendanceInsights={workspace.attendanceInsights}
            currentMonthLabel={workspace.currentMonthLabel}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <EmployeeWorkspaceTransactionsTab
            form={workspace.form}
            currentMonthLabel={workspace.currentMonthLabel}
            monthlyTransactionSummary={workspace.monthlyTransactionSummary}
            advanceOutstanding={workspace.advanceOutstanding}
            filteredTransactions={workspace.filteredTransactions}
            transactionTypeFilter={workspace.transactionTypeFilter}
            onTransactionTypeFilterChange={workspace.setTransactionTypeFilter}
            onSubmit={workspace.handleCreateTransaction}
            onMarkTransactionPaid={workspace.markTransactionPaid}
            onViewPayslip={workspace.viewTransactionPayslip}
            isUpdatingTransaction={workspace.isUpdatingTransaction}
            isSavingTransaction={workspace.isSavingTransaction}
            saveTransactionError={workspace.saveTransactionError}
          />
        </TabsContent>

        <TabsContent value="payslip">
          <EmployeeWorkspacePayslipTab
            employee={employeeDetails}
            currentMonthLabel={workspace.currentMonthLabel}
            selectedPayslipTransaction={workspace.selectedPayslipTransaction}
            payslipHtml={workspace.payslipHtml}
            payslipBreakdown={workspace.payslipBreakdown}
            onOpenTransactions={workspace.openTransactionsTab}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
