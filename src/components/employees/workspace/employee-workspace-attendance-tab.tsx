import { cn } from '@/lib/utils';
import type {
  AttendanceRecord,
  MonthlyAttendanceSummary,
} from '@/schemas/attendance.schema';

import { formatDate, formatDateTime, formatMinutes } from './utils';

type EmployeeWorkspaceAttendanceTabProps = {
  attendanceSummary?: MonthlyAttendanceSummary;
  attendanceRows: AttendanceRecord[];
  attendanceInsights: {
    lateDays: number;
    overtimeMinutes: number;
    sickLeaveDays: number;
    casualLeaveDays: number;
    unpaidLeaveDays: number;
  };
  currentMonthLabel: string;
};

function AttendanceMetric({
  label,
  value,
  valueClassName = 'text-foreground',
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="border border-border p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {label}
      </p>
      <p className={`mt-3 text-2xl font-sans font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

export function EmployeeWorkspaceAttendanceTab({
  attendanceSummary,
  attendanceRows,
  attendanceInsights,
  currentMonthLabel,
}: EmployeeWorkspaceAttendanceTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AttendanceMetric
          label="Present"
          value={attendanceSummary?.presentDays ?? 0}
          valueClassName="text-emerald-600"
        />
        <AttendanceMetric
          label="Absent"
          value={attendanceSummary?.absentDays ?? 0}
          valueClassName="text-red-600"
        />
        <AttendanceMetric
          label="Half Days"
          value={attendanceSummary?.halfDays ?? 0}
          valueClassName="text-amber-600"
        />
        <AttendanceMetric
          label="Late Marks"
          value={attendanceInsights.lateDays}
        />
        <AttendanceMetric
          label="Overtime"
          value={formatMinutes(attendanceInsights.overtimeMinutes)}
        />
      </div>

      <div className="border border-border bg-muted/10 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Leave Tracking
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <AttendanceMetric
            label="Sick Leave"
            value={attendanceInsights.sickLeaveDays}
          />
          <AttendanceMetric
            label="Casual Leave"
            value={attendanceInsights.casualLeaveDays}
          />
          <AttendanceMetric
            label="Unpaid Leave"
            value={attendanceInsights.unpaidLeaveDays}
          />
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Late and overtime analytics use a default 10:00 AM to 6:00 PM shift whenever check-in
          and check-out times are recorded.
        </p>
      </div>

      <div className="overflow-hidden border border-border">
        <div className="border-b border-border bg-muted/20 px-5 py-4">
          <h3 className="text-lg font-serif text-foreground">{currentMonthLabel} Attendance</h3>
        </div>

        {attendanceRows.length === 0 ? (
          <div className="p-10 text-sm italic text-muted-foreground">
            No attendance recorded for this period yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {attendanceRows.map((record) => (
              <div
                key={record.id}
                className="grid gap-3 px-5 py-4 lg:grid-cols-[160px_140px_1fr_1fr] lg:items-start"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Date
                  </p>
                  <p className="mt-2 text-sm text-foreground">{formatDate(record.date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Status
                  </p>
                  <span
                    className={cn(
                      'mt-2 inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                      record.status === 'present'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : record.status === 'half_day'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-red-500/10 text-red-600',
                    )}
                  >
                    {record.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Shift Times
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    In: {formatDateTime(record.checkInTime)}
                    <br />
                    Out: {formatDateTime(record.checkOutTime)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Notes
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {record.reasonOfAbsenteeism ?? 'No note recorded'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
