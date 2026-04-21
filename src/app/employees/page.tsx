'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueries } from '@tanstack/react-query';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Users,
  Wallet,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Check,
  X as XIcon,
  Circle,
  CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  createEmployeeSchema,
  CreateEmployeeInput,
  Employee,
} from '@/schemas/employee.schema';
import type { AttendanceStatus } from '@/schemas/attendance.schema';
import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useUpdateEmployee,
} from '@/hooks/api/employee.hooks';
import { useMarkAttendance } from '@/hooks/api/attendance.hooks';
import { attendanceService } from '@/services/attendance.service';

type EmployeeStatus = 'active' | 'inactive' | 'terminated';
type EmployeesSection = 'directory' | 'attendance';

function formatCurrency(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function statusClass(status: EmployeeStatus) {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-600';
  if (status === 'inactive') return 'bg-amber-500/10 text-amber-600';
  return 'bg-red-500/10 text-red-500';
}

function statusLabel(status: EmployeeStatus) {
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  return 'Terminated';
}

function EmployeesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-60" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-border p-5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="border border-border divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 lg:p-6 flex items-center gap-4">
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeForm({
  defaultValues,
  onSubmit,
  isPending,
  errorMessage,
  submitLabel,
}: {
  defaultValues?: Partial<CreateEmployeeInput>;
  onSubmit: (values: CreateEmployeeInput) => void;
  isPending: boolean;
  errorMessage?: string;
  submitLabel: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      designation: '',
      department: '',
      dateOfJoining: new Date().toISOString().slice(0, 10),
      salary: 0,
      status: 'active',
      ...defaultValues,
    },
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <form id="employee-form" onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Name</Label>
              <Input {...register('name')} className="h-11 rounded-none bg-muted border-none text-sm" />
              {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Designation</Label>
              <Input {...register('designation')} className="h-11 rounded-none bg-muted border-none text-sm" />
              {errors.designation && <p className="text-[10px] text-destructive">{errors.designation.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Department</Label>
              <Input {...register('department')} className="h-11 rounded-none bg-muted border-none text-sm" />
              {errors.department && <p className="text-[10px] text-destructive">{errors.department.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Phone</Label>
              <Input {...register('phone')} className="h-11 rounded-none bg-muted border-none text-sm" />
              {errors.phone && <p className="text-[10px] text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Email</Label>
              <Input {...register('email')} className="h-11 rounded-none bg-muted border-none text-sm" />
              {errors.email && <p className="text-[10px] text-destructive">{errors.email.message}</p>}
            </div>
            <div />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Address</Label>
            <Input {...register('address')} className="h-11 rounded-none bg-muted border-none text-sm" />
            {errors.address && <p className="text-[10px] text-destructive">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Date Of Joining</Label>
              <Input type="date" {...register('dateOfJoining')} className="h-11 rounded-none bg-muted border-none text-sm" />
              {errors.dateOfJoining && <p className="text-[10px] text-destructive">{errors.dateOfJoining.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Salary</Label>
              <Input type="number" min={0} step="0.01" {...register('salary', { valueAsNumber: true })} className="h-11 rounded-none bg-muted border-none text-sm" />
              {errors.salary && <p className="text-[10px] text-destructive">{errors.salary.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Status</Label>
              <select {...register('status')} className="h-11 w-full rounded-none bg-muted border-none px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </form>
      </div>

      <div className="p-8 pt-4 border-t border-border flex items-center justify-between gap-4">
        <SheetClose className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
          Cancel
        </SheetClose>
        <Button form="employee-form" type="submit" disabled={isPending} className="h-11 rounded-none px-8 text-[10px] font-bold uppercase tracking-widest gap-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
        </Button>
      </div>
    </>
  );
}

function DeleteConfirm({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const { mutate, isPending, error } = useDeleteEmployee({ onSuccess: onClose });
  const apiError = (error as { error?: string } | null)?.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm border border-border bg-background p-6 space-y-4">
        <h3 className="text-lg font-serif text-foreground">Delete Employee</h3>
        <p className="text-sm text-muted-foreground">
          Remove <strong>{employee.name}</strong> from active records?
        </p>
        {apiError && <p className="text-xs text-destructive">{apiError}</p>}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="h-10 rounded-none flex-1 text-[10px] font-bold uppercase tracking-widest"
            disabled={isPending}
            onClick={() => mutate(employee.id)}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function attendanceCellStyle(status?: AttendanceStatus) {
  if (status === 'present') return 'text-emerald-600 bg-emerald-500/10';
  if (status === 'absent') return 'text-red-500 bg-red-500/10';
  if (status === 'half_day') return 'text-amber-600 bg-amber-500/10';
  return 'text-muted-foreground/40 bg-background';
}

function attendanceCellSymbol(status?: AttendanceStatus) {
  if (status === 'present') return '✓';
  if (status === 'absent') return '✕';
  if (status === 'half_day') return '◐';
  return '•';
}

function AttendanceMatrixSection({ employees }: { employees: Employee[] }) {
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
      queryKey: ['employeeAttendance', employee.id, year, month],
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
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="relative">
            <CalendarDays className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              type="month"
              value={monthInputValue}
              onChange={(event) => {
                const [nextYear, nextMonth] = event.target.value.split('-').map((value) => Number.parseInt(value, 10));
                if (Number.isFinite(nextYear) && Number.isFinite(nextMonth)) {
                  setActiveMonth(new Date(Date.UTC(nextYear, nextMonth - 1, 1)));
                }
              }}
              className="h-9 rounded-none pl-8 text-xs font-bold tracking-widest uppercase"
            />
          </div>
          <Button
            variant="outline"
            className="h-9 rounded-none px-3"
            onClick={() => setActiveMonth((value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1)))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Mark Mode</span>
        <Button
          type="button"
          variant={markMode === 'present' ? 'default' : 'outline'}
          className="h-8 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest gap-1.5"
          onClick={() => setMarkMode('present')}
        >
          <Check className="w-3.5 h-3.5" /> Present
        </Button>
        <Button
          type="button"
          variant={markMode === 'absent' ? 'default' : 'outline'}
          className="h-8 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest gap-1.5"
          onClick={() => setMarkMode('absent')}
        >
          <XIcon className="w-3.5 h-3.5" /> Absent
        </Button>
        <Button
          type="button"
          variant={markMode === 'half_day' ? 'default' : 'outline'}
          className="h-8 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest gap-1.5"
          onClick={() => setMarkMode('half_day')}
        >
          <Circle className="w-3.5 h-3.5" /> Half Day
        </Button>
      </div>

      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        Showing {format(activeMonth, 'MMMM yyyy')}
        {isFetchingAttendance ? ' • Syncing...' : ''}
      </div>

      {employees.length === 0 ? (
        <div className="border border-dashed border-border py-12 text-center text-sm text-muted-foreground italic">
          No employees available for attendance.
        </div>
      ) : isLoadingAttendance ? (
        <div className="border border-border py-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
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
                <th className="bg-muted border-b border-r border-border px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  Employee
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="bg-muted border-b border-r border-border px-0.5 py-1 text-center text-[9px] font-bold uppercase tracking-tight text-muted-foreground/70"
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
                  <td className="bg-background border-r border-b border-border px-2 py-2">
                    <p className="text-sm font-semibold text-foreground truncate">{employee.name}</p>
                    <p className="text-[10px] text-muted-foreground">{employee.employeeId}</p>
                  </td>
                  {days.map((day) => {
                    const status = attendanceLookup.get(employee.id)?.get(day);
                    const cellKey = `${employee.id}-${year}-${month}-${day}`;
                    const isCellPending = pendingCell === cellKey;

                    return (
                      <td key={day} className="border-r border-b border-border p-0">
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
                          {isCellPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : attendanceCellSymbol(status)}
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
        <span className="inline-flex items-center gap-1"><span className="text-emerald-600">✓</span> Present</span>
        <span className="inline-flex items-center gap-1"><span className="text-red-500">✕</span> Absent</span>
        <span className="inline-flex items-center gap-1"><span className="text-amber-600">◐</span> Half Day</span>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState<EmployeesSection>('directory');
  const [addOpen, setAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSection(params.get('section') === 'attendance' ? 'attendance' : 'directory');
  }, []);

  const filters = useMemo(() => ({
    search: search.trim() || undefined,
    department: department.trim() || undefined,
  }), [search, department]);

  const { data, isLoading } = useEmployees(filters);
  const employees = data?.data?.employees ?? [];
  const summary = data?.data?.summary ?? { active: 0, inactive: 0, terminated: 0 };
  const total = data?.data?.total ?? 0;
  const totalSalary = employees.reduce((sum, employee) => sum + employee.salary, 0);

  const departments = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => employee.department)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [employees],
  );

  const handleCloseAdd = useCallback(() => setAddOpen(false), []);
  const handleCloseEdit = useCallback(() => setEditEmployee(null), []);

  const {
    mutate: createEmployee,
    isPending: isCreating,
    error: createError,
  } = useCreateEmployee({ onSuccess: handleCloseAdd });

  const {
    mutate: updateEmployee,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateEmployee({ onSuccess: handleCloseEdit });

  const createErrorMessage = (createError as { error?: string } | null)?.error;
  const updateErrorMessage = (updateError as { error?: string } | null)?.error;

  if (isLoading) {
    return (
      <DashboardShell>
        <EmployeesSkeleton />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl font-serif text-foreground tracking-tight">Employees</h1>
            <p className="mt-2 text-base text-muted-foreground italic">
              Manage your team roster, departments, and payroll details.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, ID, phone, email"
                className="h-11 rounded-none bg-background pl-10 pr-10 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                  aria-label="Clear employee search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={() => setAddOpen(true)}
              className="h-11 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 border-b border-border overflow-x-auto pb-px">
            {(['directory', 'attendance'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setSection(value)}
                className={cn(
                  'px-5 py-3 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap',
                  section === value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {value === 'directory' ? 'Employee Directory' : 'Attendance'}
              </button>
            ))}
          </div>

          <div className="w-full lg:w-64">
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="h-10 w-full rounded-none border border-border bg-background px-3 text-xs font-bold uppercase tracking-widest text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Departments</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total" value={String(total)} />
          <StatCard icon={BriefcaseBusiness} label="Active" value={String(summary.active)} color="text-emerald-600" />
          <StatCard icon={BriefcaseBusiness} label="Inactive" value={String(summary.inactive)} color="text-amber-600" />
          <StatCard icon={Wallet} label="Visible Payroll" value={formatCurrency(totalSalary)} />
        </div>

        {section === 'attendance' ? (
          <AttendanceMatrixSection employees={employees} />
        ) : employees.length === 0 ? (
          <div className="border border-dashed border-border flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground italic">
              No employees found with current filters.
            </p>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border overflow-hidden">
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30">
              <div className="col-span-3 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Employee</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Department</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Designation</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Joined / Salary</div>
              <div className="col-span-1 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Status</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Actions</div>
            </div>

            {employees.map((employee) => (
              <div
                key={employee.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-4 lg:px-6 py-4 lg:items-center hover:bg-muted/20 transition-colors"
              >
                <div className="lg:col-span-3 min-w-0">
                  <p className="font-serif text-base text-foreground truncate">{employee.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{employee.employeeId}</p>
                  <p className="text-xs text-muted-foreground mt-1">{employee.phone}</p>
                </div>
                <div className="lg:col-span-2 text-sm text-muted-foreground">{employee.department}</div>
                <div className="lg:col-span-2 text-sm text-muted-foreground">{employee.designation}</div>
                <div className="lg:col-span-2">
                  <p className="text-sm text-foreground">{formatDate(employee.dateOfJoining)}</p>
                  <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(employee.salary)}</p>
                </div>
                <div className="lg:col-span-1">
                  <span className={cn('inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', statusClass(employee.status))}>
                    {statusLabel(employee.status)}
                  </span>
                </div>
                <div className="lg:col-span-2 flex items-center justify-start lg:justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-9 w-9 rounded-md"
                    onClick={() =>
                      setEditEmployee({
                        ...employee,
                        dateOfJoining: toDateInput(employee.dateOfJoining),
                      })
                    }
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-9 w-9 rounded-md text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteEmployee(employee)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetContent className="w-full sm:max-w-[640px] border-l border-border p-0 flex flex-col bg-background">
            <SheetHeader className="p-8 pb-4">
              <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">
                Add Employee
              </SheetTitle>
            </SheetHeader>
            <EmployeeForm
              submitLabel="Create Employee"
              isPending={isCreating}
              errorMessage={createErrorMessage}
              onSubmit={(values) => createEmployee(values)}
            />
          </SheetContent>
        </Sheet>
      )}

      {editEmployee && (
        <Sheet open={Boolean(editEmployee)} onOpenChange={() => setEditEmployee(null)}>
          <SheetContent className="w-full sm:max-w-[640px] border-l border-border p-0 flex flex-col bg-background">
            <SheetHeader className="p-8 pb-4">
              <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">
                Edit Employee
              </SheetTitle>
            </SheetHeader>
            <EmployeeForm
              submitLabel="Update Employee"
              isPending={isUpdating}
              errorMessage={updateErrorMessage}
              defaultValues={{
                name: editEmployee.name,
                email: editEmployee.email ?? '',
                phone: editEmployee.phone,
                address: editEmployee.address,
                designation: editEmployee.designation,
                department: editEmployee.department,
                dateOfJoining: editEmployee.dateOfJoining,
                salary: editEmployee.salary,
                status: editEmployee.status,
              }}
              onSubmit={(values) => updateEmployee({ id: editEmployee.id, data: values })}
            />
          </SheetContent>
        </Sheet>
      )}

      {deleteEmployee && (
        <DeleteConfirm employee={deleteEmployee} onClose={() => setDeleteEmployee(null)} />
      )}
    </DashboardShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="border border-border p-5 min-w-0">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground/50" />
        <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/40 truncate">{label}</p>
      </div>
      <p className={cn('text-2xl sm:text-3xl font-sans font-bold tracking-tight mt-2 truncate', color ?? 'text-foreground')}>
        {value}
      </p>
    </div>
  );
}
