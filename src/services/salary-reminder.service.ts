import api from '@/lib/axios';

export interface SalaryReminder {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  salaryAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  reminderSent: boolean;
  paidAt: string | null;
  transactionId: string | null;
  createdAt: string;
}

export interface SalaryRemindersSummary {
  totalPending: number;
  totalAmount: number;
  overdueCount: number;
}

export interface SalaryRemindersResponse {
  ok: boolean;
  data: {
    reminders: SalaryReminder[];
    summary: SalaryRemindersSummary;
  };
}

export interface MarkReminderPaidInput {
  paidAt?: string;
  transactionId?: string;
}

export const salaryReminderService = {
  getReminders: (filters?: {
    year?: number;
    month?: number;
    status?: 'pending' | 'paid' | 'overdue';
  }): Promise<SalaryRemindersResponse> =>
    api.get('/employees/salary-reminders', { params: filters }),

  markReminderPaid: (
    id: string,
    data: MarkReminderPaidInput,
  ): Promise<{ ok: boolean; data: { reminder: SalaryReminder } }> =>
    api.put(`/employees/salary-reminders/${id}/paid`, data),
};
