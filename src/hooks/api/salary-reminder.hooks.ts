import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MarkReminderPaidInput,
  salaryReminderService,
} from '@/services/salary-reminder.service';

export const useSalaryReminders = (filters?: {
  year?: number;
  month?: number;
  status?: 'pending' | 'paid' | 'overdue';
}) => {
  return useQuery({
    queryKey: ['salaryReminders', filters?.year, filters?.month, filters?.status],
    queryFn: () => salaryReminderService.getReminders(filters),
    retry: false,
  });
};

export const useMarkReminderPaid = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MarkReminderPaidInput }) =>
      salaryReminderService.markReminderPaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryReminders'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      options?.onSuccess?.();
    },
  });
};
