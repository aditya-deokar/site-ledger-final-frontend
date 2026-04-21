import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { MarkAttendanceInput } from '@/schemas/attendance.schema';

export const useMarkAttendance = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkAttendanceInput) => attendanceService.markAttendance(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employeeAttendance', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      options?.onSuccess?.();
    },
  });
};
