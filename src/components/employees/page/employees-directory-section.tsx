import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Employee } from '@/schemas/employee.schema';

import {
  formatCurrency,
  formatDate,
  statusClass,
  statusLabel,
} from './utils';

export function EmployeesDirectorySection({
  employees,
  onEditEmployee,
  onDeleteEmployee,
}: {
  employees: Employee[];
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
}) {
  if (employees.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-border py-20">
        <p className="text-sm italic text-muted-foreground">
          No employees found with current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-border divide-y divide-border">
      <div className="hidden grid-cols-12 gap-4 bg-muted/30 px-6 py-4 lg:grid">
        <div className="col-span-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Employee</div>
        <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Department</div>
        <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Designation</div>
        <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Joined / Salary</div>
        <div className="col-span-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</div>
        <div className="col-span-2 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Actions</div>
      </div>

      {employees.map((employee) => (
        <div
          key={employee.id}
          className="grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-muted/20 lg:grid-cols-12 lg:items-center lg:gap-4 lg:px-6"
        >
          <div className="min-w-0 lg:col-span-3">
            <p className="truncate font-serif text-base text-foreground">{employee.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{employee.employeeId}</p>
            <p className="mt-1 text-xs text-muted-foreground">{employee.phone}</p>
          </div>
          <div className="text-sm text-muted-foreground lg:col-span-2">{employee.department}</div>
          <div className="text-sm text-muted-foreground lg:col-span-2">{employee.designation}</div>
          <div className="lg:col-span-2">
            <p className="text-sm text-foreground">{formatDate(employee.dateOfJoining)}</p>
            <p className="mt-1 text-sm font-semibold text-primary">{formatCurrency(employee.salary)}</p>
            {employee.salaryDate != null && (
              <p className="mt-0.5 text-[10px] text-muted-foreground/60">Due: {employee.salaryDate}th</p>
            )}
          </div>
          <div className="lg:col-span-1">
            <span
              className={cn(
                'inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                statusClass(employee.status),
              )}
            >
              {statusLabel(employee.status)}
            </span>
          </div>
          <div className="flex items-center justify-start gap-2 lg:col-span-2 lg:justify-end">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-9 w-9 rounded-md"
              onClick={() => onEditEmployee(employee)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-9 w-9 rounded-md text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteEmployee(employee)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
