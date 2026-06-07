import { z } from 'zod';

import {
  createEmployeeTransactionSchema,
  type Employee,
  type EmployeeTransaction,
} from '@/schemas/employee.schema';
import { formatMoney } from '@/lib/money';

export const DEFAULT_SHIFT_START_MINUTES = 10 * 60;
export const DEFAULT_SHIFT_END_MINUTES = 18 * 60;

export const transactionComposerSchema = createEmployeeTransactionSchema.extend({
  markAsPaidNow: z.boolean().default(false),
});

export type TransactionComposerFormValues = z.input<typeof transactionComposerSchema>;
export type TransactionComposerInput = z.output<typeof transactionComposerSchema>;
export type EmployeeTransactionTypeFilter = 'all' | EmployeeTransaction['type'];

export const workspaceMonthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Date(2000, index, 1).toLocaleDateString('en-US', { month: 'short' }),
}));

export function getWorkspaceYearOptions(referenceYear = new Date().getFullYear()) {
  return Array.from({ length: 5 }, (_, index) => referenceYear - 2 + index);
}

export function formatCurrency(value: number) {
  return formatMoney(value);
}

export function formatDate(value?: string | null) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMonthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function toDateInputValue(value: Date) {
  const next = new Date(value);
  return new Date(next.getTime() - (next.getTimezoneOffset() * 60000))
    .toISOString()
    .slice(0, 10);
}

export function getMonthBounds(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function getTransactionComposerDefaultValues(
  employeeId?: string,
  overrides?: Partial<TransactionComposerFormValues>,
): TransactionComposerFormValues {
  return {
    employeeId: employeeId ?? '',
    type: 'advance',
    amount: 0,
    description: '',
    date: toDateInputValue(new Date()),
    paymentMethod: 'cash',
    markAsPaidNow: true,
    ...overrides,
  };
}

export function transactionTypeLabel(type: EmployeeTransaction['type']) {
  switch (type) {
    case 'salary':
      return 'Salary';
    case 'bonus':
      return 'Bonus';
    case 'deduction':
      return 'Deduction';
    case 'advance':
      return 'Advance';
    case 'reimbursement':
      return 'Reimbursement';
    default:
      return type;
  }
}

export function transactionTypeClass(type: EmployeeTransaction['type']) {
  switch (type) {
    case 'salary':
      return 'bg-primary/10 text-primary';
    case 'bonus':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'deduction':
      return 'bg-red-500/10 text-red-600';
    case 'advance':
      return 'bg-amber-500/10 text-amber-600';
    case 'reimbursement':
      return 'bg-blue-500/10 text-blue-600';
    default:
      return 'bg-muted text-foreground';
  }
}

export function transactionStatusClass(status: EmployeeTransaction['status']) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'failed':
      return 'bg-red-500/10 text-red-600';
    case 'pending':
    default:
      return 'bg-amber-500/10 text-amber-600';
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function getUtcMinutes(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return (parsed.getUTCHours() * 60) + parsed.getUTCMinutes();
}

export function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function buildEmployeePayslipHtml(input: {
  employee: Employee;
  periodLabel: string;
  salaryAmount: number;
  salaryDate: string;
  bonusAmount: number;
  reimbursementAmount: number;
  deductionAmount: number;
  netAmount: number;
  paidAt: string | null;
  paymentMethod: string;
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Payslip ${escapeHtml(input.employee.name)} ${escapeHtml(input.periodLabel)}</title>
      <style>
        body {
          font-family: Georgia, "Times New Roman", serif;
          margin: 0;
          padding: 40px;
          background: #f8fafc;
          color: #0f172a;
        }
        .sheet {
          max-width: 840px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 24px;
          margin-bottom: 28px;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 8px;
        }
        h1 {
          margin: 0;
          font-size: 34px;
          font-weight: 600;
        }
        .meta {
          text-align: right;
          font-size: 14px;
          line-height: 1.7;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }
        .panel {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 18px;
        }
        .label {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .value {
          font-size: 22px;
          font-weight: 700;
        }
        .table {
          border: 1px solid #e2e8f0;
          margin-top: 8px;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 20px;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        .row:last-child {
          border-bottom: none;
        }
        .row-total {
          background: #f8fafc;
        }
        .row-label {
          font-size: 12px;
          color: #0f172a;
        }
        .row-value {
          text-align: right;
          font-size: 14px;
          font-weight: 700;
        }
        .footnote {
          margin-top: 18px;
          font-size: 12px;
          color: #64748b;
        }
        @media print {
          body {
            padding: 0;
            background: #ffffff;
          }
          .sheet {
            border: none;
            padding: 0;
            max-width: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div>
            <div class="eyebrow">Employee Payslip</div>
            <h1>Salary Slip</h1>
          </div>
          <div class="meta">
            <div><strong>Period:</strong> ${escapeHtml(input.periodLabel)}</div>
            <div><strong>Paid On:</strong> ${escapeHtml(formatDate(input.paidAt))}</div>
          </div>
        </div>

        <div class="grid">
          <div class="panel">
            <div class="label">Employee</div>
            <div class="value">${escapeHtml(input.employee.name)}</div>
            <div style="margin-top: 10px; font-size: 14px; color: #475569;">
              ${escapeHtml(input.employee.employeeId)}<br />
              ${escapeHtml(input.employee.designation)} - ${escapeHtml(input.employee.department)}
            </div>
          </div>
          <div class="panel">
            <div class="label">Net Payment</div>
            <div class="value">${escapeHtml(formatCurrency(input.netAmount))}</div>
            <div style="margin-top: 10px; font-size: 14px; color: #475569;">
              Method: ${escapeHtml(input.paymentMethod)}<br />
              Salary Due: ${escapeHtml(input.salaryDate)}
            </div>
          </div>
        </div>

        <div class="table">
          <div class="row">
            <div class="row-label">Base Salary</div>
            <div class="row-value">${escapeHtml(formatCurrency(input.salaryAmount))}</div>
          </div>
          <div class="row">
            <div class="row-label">Bonus</div>
            <div class="row-value">${escapeHtml(formatCurrency(input.bonusAmount))}</div>
          </div>
          <div class="row">
            <div class="row-label">Reimbursements</div>
            <div class="row-value">${escapeHtml(formatCurrency(input.reimbursementAmount))}</div>
          </div>
          <div class="row">
            <div class="row-label">Deductions / Recoveries</div>
            <div class="row-value">${escapeHtml(formatCurrency(input.deductionAmount))}</div>
          </div>
          <div class="row row-total">
            <div class="row-label"><strong>Net Salary Paid</strong></div>
            <div class="row-value">${escapeHtml(formatCurrency(input.netAmount))}</div>
          </div>
        </div>

        <p class="footnote">
          This payslip is generated from the recorded employee transactions for the selected period. No duplicate payslip record is stored separately.
        </p>
      </div>
    </body>
    </html>
  `;
}

export function downloadEmployeePayslip(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function printEmployeePayslip(html: string) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
