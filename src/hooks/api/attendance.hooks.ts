import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { MarkAttendanceInput } from '@/schemas/attendance.schema';

export const useEmployeeAttendance = (
  employeeId?: string,
  month?: number,
  year?: number,
) => {
  return useQuery({
    queryKey: ['employeeAttendance', employeeId ?? '', month ?? '', year ?? ''],
    queryFn: () => attendanceService.getEmployeeAttendance(employeeId!, month, year),
    retry: false,
    enabled: Boolean(employeeId),
  });
};

export const useTodayAttendance = () => {
  return useQuery({
    queryKey: ['todayAttendance'],
    queryFn: () => attendanceService.getTodayAttendance(),
    retry: false,
  });
};

export const useMarkAttendance = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkAttendanceInput) => attendanceService.markAttendance(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employeeAttendance', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      options?.onSuccess?.();
    },
  });
};
