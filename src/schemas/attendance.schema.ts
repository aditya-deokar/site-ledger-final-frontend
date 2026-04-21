export type AttendanceStatus = 'present' | 'absent' | 'half_day';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  reasonOfAbsenteeism: string | null;
  markedBy: string;
  createdAt: string;
}

export interface MonthlyAttendanceSummary {
  employeeId: string;
  month: number;
  year: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  workDays: number;
  attendancePercentage: number;
}

export interface AttendanceHistoryResponse {
  ok: boolean;
  data: {
    attendance: AttendanceRecord[];
    summary: MonthlyAttendanceSummary;
  };
}

export interface MarkAttendanceInput {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  reasonOfAbsenteeism?: string;
}
