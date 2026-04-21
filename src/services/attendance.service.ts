import api from '@/lib/axios';
import {
  AttendanceHistoryResponse,
  MarkAttendanceInput,
} from '@/schemas/attendance.schema';

export const attendanceService = {
  markAttendance: (data: MarkAttendanceInput) =>
    api.post('/attendance/mark', data),

  getEmployeeAttendance: (
    employeeId: string,
    month?: number,
    year?: number,
  ): Promise<AttendanceHistoryResponse> =>
    api.get(`/attendance/${employeeId}`, {
      params: {
        ...(month ? { month } : {}),
        ...(year ? { year } : {}),
      },
    }),
};
