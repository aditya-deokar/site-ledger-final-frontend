import type { SalaryReminder } from '@/services/salary-reminder.service';

export type EmployeeStatus = 'active' | 'inactive' | 'terminated';
export type EmployeesSection = 'directory' | 'attendance' | 'reminders';
export type ReminderStatusFilter = SalaryReminder['status'] | undefined;

export type ReminderActionState = {
  kind: 'pay';
  reminderId: string;
  amount: number;
  employeeName: string;
  periodLabel: string;
};
