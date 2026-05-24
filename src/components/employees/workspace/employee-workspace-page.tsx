'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { EmployeeWorkspaceContent } from './employee-workspace-content';
import { EmployeeWorkspaceHeader } from './employee-workspace-header';
import { useEmployeeWorkspace } from './use-employee-workspace';

export function EmployeeWorkspacePage({
  employeeId,
}: {
  employeeId: string;
}) {
  const workspace = useEmployeeWorkspace({ employeeId });

  const subtitle = `${workspace.employeeDetails?.employeeId ?? 'Loading ID'} - ${workspace.employeeDetails?.designation ?? 'Loading designation'}`;

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div className="flex flex-col gap-4">
        <Link
          href="/employees"
          className="inline-flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back To Employees
        </Link>
      </div>

      <div className="border border-border bg-background">
        <div className="border-b border-border p-8 pb-5">
          <EmployeeWorkspaceHeader
            title={(
              <h1 className="mt-2 text-4xl font-serif italic tracking-tight text-foreground">
                {workspace.employeeDetails?.name ?? 'Employee'}
              </h1>
            )}
            subtitle={subtitle}
            periodMonth={workspace.periodMonth}
            periodYear={workspace.periodYear}
            onPeriodMonthChange={workspace.setPeriodMonth}
            onPeriodYearChange={workspace.setPeriodYear}
          />
        </div>

        <EmployeeWorkspaceContent workspace={workspace} />
      </div>
    </div>
  );
}
