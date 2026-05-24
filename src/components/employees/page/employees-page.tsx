'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BriefcaseBusiness,
  Filter,
  Plus,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TransactionHistoryView } from '@/components/dashboard/navigator/command-center/transaction-history-view';
import {
  DashboardFilterBar,
  DashboardPage,
  DashboardPageHeader,
  DashboardStatsGrid,
} from '@/components/dashboard/dashboard-primitives';
import { useCreateEmployee, useEmployees, useUpdateEmployee } from '@/hooks/api/employee.hooks';
import { useSalaryReminders } from '@/hooks/api/salary-reminder.hooks';
import type { Employee } from '@/schemas/employee.schema';

import { AttendanceMatrixSection } from './attendance-matrix-section';
import { DeleteEmployeeConfirm } from './delete-employee-confirm';
import { EmployeeFormSheet } from './employee-form-sheet';
import { EmployeesDirectorySection } from './employees-directory-section';
import { EmployeesSkeleton } from './employees-skeleton';
import { SalaryRemindersSection } from './salary-reminders-section';
import { StatCard } from './stat-card';
import type { EmployeesSection } from './types';
import {
  employeeSectionOptions,
  formatCurrency,
  getEmployeesSectionFromParam,
  toDateInput,
} from './utils';

export function EmployeesPage() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'terminated' | ''>('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [section, setSection] = useState<EmployeesSection>('directory');
  const [addOpen, setAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    setSection(getEmployeesSectionFromParam(searchParams.get('section')));
  }, [searchParams]);

  const filters = useMemo(() => ({
    search: search.trim() || undefined,
    department: department.trim() || undefined,
    status: status || undefined,
  }), [search, department, status]);

  const { data, isLoading } = useEmployees(filters);
  const employees = data?.data?.employees ?? [];
  const summary = data?.data?.summary ?? { active: 0, inactive: 0, terminated: 0 };
  const total = data?.data?.total ?? 0;
  const totalSalary = employees.reduce((sum, employee) => sum + employee.salary, 0);
  const now = new Date();
  const { data: reminderData } = useSalaryReminders({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const unpaidReminderByEmployeeId = useMemo(() => {
    const map = new Map<string, 'pending' | 'overdue'>();
    const reminders = reminderData?.data?.reminders ?? [];

    reminders.forEach((reminder) => {
      if (reminder.status === 'paid') return;
      map.set(reminder.employeeId, reminder.status);
    });

    return map;
  }, [reminderData]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((employee) => employee.department)))
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

  if (isLoading) {
    return <EmployeesSkeleton />;
  }

  return (
    <>
      <DashboardPage className="space-y-8 duration-700">
        <DashboardPageHeader
          eyebrow="Workforce"
          title="Employees"
          subtitle="Manage your team roster, departments, payroll details, attendance, and salary reminders."
          action={(
            <Button onClick={() => setAddOpen(true)} size="cta" className="whitespace-nowrap">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          )}
        />

        <DashboardFilterBar>
        <div className="flex w-full gap-2 lg:w-auto">
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, ID, phone, email"
              className="h-10 rounded-none bg-background pl-10 pr-10 text-sm"
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
          <Button variant="outline" size="control" onClick={() => setFilterOpen(true)}>
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>
        </DashboardFilterBar>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
            {employeeSectionOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSection(option.value)}
                className={[
                  'whitespace-nowrap border-b-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors -mb-px',
                  section === option.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>

        </div>

        <DashboardStatsGrid>
          <StatCard icon={Users} label="Total" value={String(total)} />
          <StatCard icon={BriefcaseBusiness} label="Active" value={String(summary.active)} color="text-emerald-600" />
          <StatCard icon={BriefcaseBusiness} label="Inactive" value={String(summary.inactive)} color="text-amber-600" />
          <StatCard icon={Wallet} label="Visible Payroll" value={formatCurrency(totalSalary)} />
        </DashboardStatsGrid>

        {historyEmployee ? (
          <TransactionHistoryView
            action="employee-transactions"
            selectedEntity={historyEmployee}
            onBack={() => setHistoryEmployee(null)}
          />
        ) : section === 'reminders' ? (
          <SalaryRemindersSection />
        ) : section === 'attendance' ? (
          <AttendanceMatrixSection employees={employees} />
        ) : (
          <EmployeesDirectorySection
            employees={employees}
            unpaidReminderByEmployeeId={unpaidReminderByEmployeeId}
            onViewHistory={setHistoryEmployee}
            onEditEmployee={setEditEmployee}
            onDeleteEmployee={setDeleteEmployee}
          />
        )}
      </DashboardPage>

      {addOpen && (
        <EmployeeFormSheet
          open={addOpen}
          title="Add Employee"
          submitLabel="Create Employee"
          isPending={isCreating}
          error={createError}
          onOpenChange={setAddOpen}
          onSubmit={(values) => createEmployee(values)}
        />
      )}

      {editEmployee && (
        <EmployeeFormSheet
          open={Boolean(editEmployee)}
          title="Edit Employee"
          submitLabel="Update Employee"
          isPending={isUpdating}
          error={updateError}
          defaultValues={{
            name: editEmployee.name,
            email: editEmployee.email ?? '',
            phone: editEmployee.phone,
            address: editEmployee.address,
            designation: editEmployee.designation,
            department: editEmployee.department,
            dateOfJoining: toDateInput(editEmployee.dateOfJoining),
            salary: editEmployee.salary,
            salaryDate: editEmployee.salaryDate ?? undefined,
            status: editEmployee.status,
          }}
          onOpenChange={(open) => {
            if (!open) setEditEmployee(null);
          }}
          onSubmit={(values) => {
            updateEmployee({ id: editEmployee.id, data: values });
          }}
        />
      )}

      {deleteEmployee && (
        <DeleteEmployeeConfirm
          employee={deleteEmployee}
          onClose={() => setDeleteEmployee(null)}
        />
      )}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-y-auto rounded-none">
          <DialogHeader><DialogTitle>Filter Employees</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-none border border-border bg-muted/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Department</p>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="mt-2 h-10 w-full border border-border bg-background px-3 text-sm"
              >
                <option value="">All Departments</option>
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-none border border-border bg-muted/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Status</p>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as 'active' | 'inactive' | 'terminated' | '')}
                className="mt-2 h-10 w-full border border-border bg-background px-3 text-sm"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDepartment(''); setStatus(''); }}>
              Reset
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
