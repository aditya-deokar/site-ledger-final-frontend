'use client';

import { useParams } from 'next/navigation';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { EmployeeWorkspacePage } from '@/components/employees/employee-workspace-page';

export default function EmployeeWorkspaceRoute() {
  const params = useParams<{ id: string }>();
  const employeeId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!employeeId) {
    return (
      <DashboardShell>
        <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground italic">
          Employee workspace could not be opened because the employee id is missing.
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <EmployeeWorkspacePage employeeId={employeeId} />
    </DashboardShell>
  );
}
