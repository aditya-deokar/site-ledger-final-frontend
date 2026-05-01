'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Employee } from '@/schemas/employee.schema';

import { EmployeeWorkspaceContent } from './employee-workspace-content';
import { EmployeeWorkspaceHeader } from './employee-workspace-header';
import { useEmployeeWorkspace } from './use-employee-workspace';

export function EmployeeWorkspaceSheet({
  employee,
  open,
  onClose,
}: {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}) {
  const workspace = useEmployeeWorkspace({
    employeeId: employee?.id,
    initialEmployee: employee,
  });

  const subtitle = `${workspace.employeeDetails?.employeeId ?? employee?.employeeId ?? 'Loading ID'} - ${workspace.employeeDetails?.designation ?? employee?.designation ?? 'Loading designation'}`;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent className="flex w-full flex-col border-l border-border bg-background p-0 sm:max-w-[1180px]">
        <SheetHeader className="border-b border-border p-8 pb-5">
          <EmployeeWorkspaceHeader
            title={(
              <SheetTitle className="mt-2 text-3xl font-serif italic tracking-tight text-foreground">
                {workspace.employeeDetails?.name ?? employee?.name ?? 'Employee'}
              </SheetTitle>
            )}
            subtitle={subtitle}
            periodMonth={workspace.periodMonth}
            periodYear={workspace.periodYear}
            onPeriodMonthChange={workspace.setPeriodMonth}
            onPeriodYearChange={workspace.setPeriodYear}
          />
        </SheetHeader>

        <EmployeeWorkspaceContent
          workspace={workspace}
          tabsClassName="flex-1 overflow-hidden"
          bodyClassName="flex-1 overflow-y-auto px-8 py-6"
        />
      </SheetContent>
    </Sheet>
  );
}
