'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  X as XIcon,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMarkAttendance, attendanceKeys } from '@/hooks/api/attendance.hooks';
import type { AttendanceStatus } from '@/schemas/attendance.schema';
import type { Employee } from '@/schemas/employee.schema';
import { attendanceService } from '@/services/attendance.service';

import {
  attendanceCellStyle,
  attendanceCellSymbol,
  getDaysInMonth,
} from './utils';

export function AttendanceMatrixSection({ employees }: { employees: Employee[] }) {
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const [markMode, setMarkMode] = useState<AttendanceStatus>('present');
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const year = activeMonth.getUTCFullYear();
  const month = activeMonth.getUTCMonth() + 1;
  const totalDays = getDaysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, index) => index + 1), [totalDays]);

  const attendanceQueries = useQueries({
    queries: employees.map((employee) => ({
      queryKey: attendanceKeys.employee(employee.id, month, year),
      queryFn: () => attendanceService.getEmployeeAttendance(employee.id, month, year),
      retry: false,
      enabled: employees.length > 0,
    })),
  });

  const isLoadingAttendance = attendanceQueries.some((query) => query.isLoading);
  const isFetchingAttendance = attendanceQueries.some((query) => query.isFetching);

  const attendanceLookup = useMemo(() => {
    const lookup = new Map<string, Map<number, AttendanceStatus>>();

    employees.forEach((employee, index) => {
      const rowMap = new Map<number, AttendanceStatus>();
      const records = attendanceQueries[index]?.data?.data?.attendance ?? [];
      records.forEach((record) => {
        const dayOfMonth = new Date(record.date).getUTCDate();
        rowMap.set(dayOfMonth, record.status);
      });
      lookup.set(employee.id, rowMap);
    });

    return lookup;
  }, [employees, attendanceQueries]);

  const { mutate: markAttendance, isPending: isMarking } = useMarkAttendance();

  const onCellClick = useCallback((employeeId: string, day: number) => {
    const cellKey = `${employeeId}-${year}-${month}-${day}`;
    const date = new Date(Date.UTC(year, month - 1, day)).toISOString();

    setPendingCell(cellKey);
    markAttendance(
      { employeeId, date, status: markMode },
      {
        onSettled: () => {
          setPendingCell((value) => (value === cellKey ? null : value));
        },
      },
    );
  }, [markAttendance, markMode, month, year]);

  const monthInputValue = `${year}-${String(month).padStart(2, '0')}`;

  return (
    <div className="space-y-4 border border-border p-4 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-serif text-foreground">Attendance</h2>
          <p className="text-xs text-muted-foreground">
            Employees on Y-axis and days on X-axis. Select a mark mode, then click cells.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-none px-3"
            onClick={() => setActiveMonth((value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() - 1, 1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="relative">
            <CalendarDays className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              type="month"
              value={monthInputValue}
              onChange={(event) => {
                const [nextYear, nextMonth] = event.target.value.split('-').map((value) => Number.parseInt(value, 10));
                if (Number.isFinite(nextYear) && Number.isFinite(nextMonth)) {
                  setActiveMonth(new Date(Date.UTC(nextYear, nextMonth - 1, 1)));
                }
              }}
              className="h-9 rounded-none pl-8 text-xs font-bold uppercase tracking-widest"
            />
          </div>
          <Button
            variant="outline"
            className="h-9 rounded-none px-3"
            onClick={() => setActiveMonth((value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Mark Mode
        </span>
        <Button
          type="button"
          variant={markMode === 'present' ? 'default' : 'outline'}
          className="h-8 gap-1.5 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest"
          onClick={() => setMarkMode('present')}
        >
          <Check className="h-3.5 w-3.5" /> Present
        </Button>
        <Button
          type="button"
          variant={markMode === 'absent' ? 'default' : 'outline'}
          className="h-8 gap-1.5 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest"
          onClick={() => setMarkMode('absent')}
        >
          <XIcon className="h-3.5 w-3.5" /> Absent
        </Button>
        <Button
          type="button"
          variant={markMode === 'half_day' ? 'default' : 'outline'}
          className="h-8 gap-1.5 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest"
          onClick={() => setMarkMode('half_day')}
        >
          <Circle className="h-3.5 w-3.5" /> Half Day
        </Button>
      </div>

      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        Showing {format(activeMonth, 'MMMM yyyy')}
        {isFetchingAttendance ? ' - Syncing...' : ''}
      </div>

      {employees.length === 0 ? (
        <div className="border border-dashed border-border py-12 text-center text-sm italic text-muted-foreground">
          No employees available for attendance.
        </div>
      ) : isLoadingAttendance ? (
        <div className="flex items-center justify-center border border-border py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border border-border">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: '180px' }} />
              {days.map((day) => (
                <col key={`col-${day}`} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-r border-border bg-muted px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  Employee
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="border-b border-r border-border bg-muted px-0.5 py-1 text-center text-[9px] font-bold uppercase tracking-tight text-muted-foreground/70"
                  >
                    <div className="leading-none">
                      <div>{String(day).padStart(2, '0')}</div>
                      <div className="mt-0.5 text-[8px] font-medium normal-case tracking-normal text-muted-foreground/50">
                        {format(new Date(Date.UTC(year, month - 1, day)), 'EEEEE')}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="border-b border-r border-border bg-background px-2 py-2">
                    <p className="truncate text-sm font-semibold text-foreground">{employee.name}</p>
                    <p className="text-[10px] text-muted-foreground">{employee.employeeId}</p>
                  </td>
                  {days.map((day) => {
                    const status = attendanceLookup.get(employee.id)?.get(day);
                    const cellKey = `${employee.id}-${year}-${month}-${day}`;
                    const isCellPending = pendingCell === cellKey;

                    return (
                      <td key={day} className="border-b border-r border-border p-0">
                        <button
                          type="button"
                          disabled={isMarking}
                          onClick={() => onCellClick(employee.id, day)}
                          className={cn(
                            'h-8 w-full text-[11px] font-bold transition-colors',
                            attendanceCellStyle(status),
                            'hover:brightness-95 disabled:opacity-70',
                          )}
                          title={`${employee.name} - ${day}/${month}/${year}`}
                        >
                          {isCellPending ? (
                            <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                          ) : (
                            attendanceCellSymbol(status)
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        <span className="inline-flex items-center gap-1"><span className="text-emerald-600">P</span> Present</span>
        <span className="inline-flex items-center gap-1"><span className="text-red-500">A</span> Absent</span>
        <span className="inline-flex items-center gap-1"><span className="text-amber-600">H</span> Half Day</span>
      </div>
    </div>
  );
}
