import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { MarkAttendanceInput } from '@/schemas/attendance.schema';
import { employeeKeys } from './employee.hooks';

export const attendanceKeys = {
  all: ['employeeAttendance'] as const,
  employee: (employeeId?: string, month?: number, year?: number) => [
    'employeeAttendance',
    employeeId ?? '',
    month ?? '',
    year ?? '',
  ] as const,
  byEmployee: (employeeId?: string) => ['employeeAttendance', employeeId ?? ''] as const,
  today: ['todayAttendance'] as const,
} as const;

export const useEmployeeAttendance = (
  employeeId?: string,
  month?: number,
  year?: number,
) => {
  return useQuery({
    queryKey: attendanceKeys.employee(employeeId, month, year),
    queryFn: () => attendanceService.getEmployeeAttendance(employeeId!, month, year),
    retry: false,
    enabled: Boolean(employeeId),
  });
};

export const useTodayAttendance = () => {
  return useQuery({
    queryKey: attendanceKeys.today,
    queryFn: () => attendanceService.getTodayAttendance(),
    retry: false,
  });
};

export const useMarkAttendance = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MarkAttendanceInput) => attendanceService.markAttendance(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.byEmployee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.employeeId) });
      options?.onSuccess?.();
    },
  });
};
