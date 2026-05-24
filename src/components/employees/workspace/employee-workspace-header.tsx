import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';

import { getWorkspaceYearOptions, workspaceMonthOptions } from './utils';

type EmployeeWorkspaceHeaderProps = {
  title: ReactNode;
  subtitle: string;
  periodMonth: number;
  periodYear: number;
  onPeriodMonthChange: (value: number) => void;
  onPeriodYearChange: (value: number) => void;
};

export function EmployeeWorkspaceHeader({
  title,
  subtitle,
  periodMonth,
  periodYear,
  onPeriodMonthChange,
  onPeriodYearChange,
}: EmployeeWorkspaceHeaderProps) {
  const yearOptions = getWorkspaceYearOptions();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
          Employee Workspace
        </p>
        {title}
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Month
          </Label>
          <select
            value={periodMonth}
            onChange={(event) => onPeriodMonthChange(Number(event.target.value))}
            className="h-10 rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-widest"
          >
            {workspaceMonthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Year
          </Label>
          <select
            value={periodYear}
            onChange={(event) => onPeriodYearChange(Number(event.target.value))}
            className="h-10 rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-widest"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
