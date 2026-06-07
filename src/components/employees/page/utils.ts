import type { AttendanceStatus } from '@/schemas/attendance.schema';

import { formatMoney } from '@/lib/money';

import type { EmployeeStatus, EmployeesSection } from './types';

export const employeeSectionOptions: Array<{
  value: EmployeesSection;
  label: string;
}> = [
  { value: 'directory', label: 'Employee Directory' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'reminders', label: 'Salary Reminders' },
];

export function getEmployeesSectionFromParam(sectionParam: string | null): EmployeesSection {
  if (sectionParam === 'attendance') return 'attendance';
  if (sectionParam === 'reminders') return 'reminders';
  return 'directory';
}

export function formatCurrency(value: number) {
  return formatMoney(value);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatReminderDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function getMonthName(month: number) {
  return new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function statusClass(status: EmployeeStatus) {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-600';
  if (status === 'inactive') return 'bg-amber-500/10 text-amber-600';
  return 'bg-red-500/10 text-red-500';
}

export function statusLabel(status: EmployeeStatus) {
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  return 'Terminated';
}

export function attendanceCellStyle(status?: AttendanceStatus) {
  if (status === 'present') return 'text-emerald-600 bg-emerald-500/10';
  if (status === 'absent') return 'text-red-500 bg-red-500/10';
  if (status === 'half_day') return 'text-amber-600 bg-amber-500/10';
  return 'text-muted-foreground/40 bg-background';
}

export function attendanceCellSymbol(status?: AttendanceStatus) {
  if (status === 'present') return 'P';
  if (status === 'absent') return 'A';
  if (status === 'half_day') return 'H';
  return '.';
}

export function getReminderStatusColor(status: string) {
  if (status === 'paid') return 'bg-emerald-500/10 text-emerald-600';
  if (status === 'overdue') return 'bg-red-500/10 text-red-600';
  return 'bg-amber-500/10 text-amber-600';
}
