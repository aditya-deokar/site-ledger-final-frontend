'use client';

import { type ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, CalendarDays, FileText, Layers, Loader2, MapPin, Printer } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSiteReport } from '@/hooks/api/site.hooks';
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap';
import type {
  SiteReport,
  SiteReportActivityRow,
  SiteReportCustomerRow,
  SiteReportExpenseRow,
  SiteReportFlatRow,
  SiteReportInvestorRow,
} from '@/schemas/site-report.schema';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatINR(value: number) {
  return currencyFormatter.format(value || 0);
}

function trimTrailingZeros(value: string) {
  return value.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function formatCompactINR(value: number) {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount);

  if (absolute >= 10000000) {
    return `₹${trimTrailingZeros((amount / 10000000).toFixed(2))} Cr`;
  }

  if (absolute >= 100000) {
    return `₹${trimTrailingZeros((amount / 100000).toFixed(2))} L`;
  }

  return formatINR(amount);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getSummaryValueClass(value: string) {
  if (value.length >= 14) return 'text-[clamp(0.95rem,1.05vw,1.15rem)]';
  if (value.length >= 10) return 'text-[clamp(1.1rem,1.2vw,1.35rem)]';
  return 'text-[clamp(1.3rem,1.45vw,1.6rem)]';
}

function ReportLoading() {
  return (
    <div className="min-h-screen bg-neutral-100 px-6 py-16">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center border border-border bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
            Preparing Report
          </p>
          <p className="text-sm text-muted-foreground">
            Building the latest site snapshot from live project data.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'default',
  hint,
  valueTitle,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'primary' | 'success' | 'danger';
  hint?: string;
  valueTitle?: string;
}) {
  const toneClasses = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-emerald-600',
    danger: 'text-red-500',
  };
  const valueClassName = getSummaryValueClass(value);

  return (
    <div
      className={cn(
        'flex h-full min-w-0 flex-col overflow-hidden border border-border bg-white p-3.5 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-4 print:p-2.5',
        hint ? 'min-h-[102px] print:min-h-[74px]' : 'min-h-[82px] print:min-h-[60px]',
      )}
    >
      <div className="min-w-0">
        <p className="max-w-[14rem] text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">{label}</p>
        <p
          title={valueTitle ?? value}
          className={cn(
            'mt-1.5 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap leading-none tracking-tight [font-variant-numeric:tabular-nums]',
            valueClassName,
            toneClasses[tone],
          )}
        >
          {value}
        </p>
      </div>
      {hint ? <p className="mt-auto pt-1 text-[10px] leading-snug text-muted-foreground/70 print:text-[9px]">{hint}</p> : null}
    </div>
  );
}

function RatioCard({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'primary' | 'success' | 'danger';
}) {
  const toneClasses = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-emerald-600',
    danger: 'text-red-500',
  };

  return (
    <div className="border border-border bg-white p-3.5 print:p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">{label}</p>
      <p className={cn('mt-1.5 text-xl font-semibold tracking-tight print:text-lg', toneClasses[tone])}>{value}</p>
      <p className="mt-1 text-[10px] leading-snug text-muted-foreground/75 print:text-[9px]">{detail}</p>
    </div>
  );
}

function AlertCard({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: 'danger' | 'warning' | 'success';
}) {
  const classes = {
    danger: 'border-red-500/25 bg-red-500/5 text-red-700',
    warning: 'border-amber-500/25 bg-amber-500/5 text-amber-700',
    success: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700',
  };

  return (
    <div className={cn('border p-3.5 print:p-2.5', classes[tone])}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed print:text-[11px]">{detail}</p>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-border bg-white">
      <div className="border-b border-border px-4 py-3.5 print:px-3 print:py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/50">{eyebrow}</p>
        <h2 className="mt-1.5 text-[1.45rem] font-serif tracking-tight text-foreground print:text-[1.15rem]">{title}</h2>
        {subtitle ? <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-muted-foreground/75 print:text-[10px]">{subtitle}</p> : null}
      </div>
      <div className="px-4 py-4 print:px-3 print:py-3">{children}</div>
    </section>
  );
}

function InventoryBar({ report }: { report: SiteReport }) {
  const totalUnits = report.inventorySummary.totalUnits || 1;
  const availableWidth = percent(report.inventorySummary.availableUnits, totalUnits);
  const bookedWidth = percent(report.inventorySummary.bookedUnits, totalUnits);
  const soldWidth = percent(report.inventorySummary.soldUnits, totalUnits);

  return (
    <div className="space-y-3">
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div className="flex h-full">
          <div className="bg-slate-300" style={{ width: `${availableWidth}%` }} />
          <div className="bg-amber-500" style={{ width: `${bookedWidth}%` }} />
          <div className="bg-emerald-500" style={{ width: `${soldWidth}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
        <div className="border border-border bg-muted/30 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Available</p>
          <p className="mt-1.5 text-xl font-semibold text-foreground">{String(report.inventorySummary.availableUnits).padStart(2, '0')}</p>
        </div>
        <div className="border border-amber-500/20 bg-amber-500/5 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700/80">Booked</p>
          <p className="mt-1.5 text-xl font-semibold text-amber-600">{String(report.inventorySummary.bookedUnits).padStart(2, '0')}</p>
        </div>
        <div className="border border-emerald-500/20 bg-emerald-500/5 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700/80">Sold</p>
          <p className="mt-1.5 text-xl font-semibold text-emerald-600">{String(report.inventorySummary.soldUnits).padStart(2, '0')}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const className =
    value === 'SOLD'
      ? 'bg-emerald-500/10 text-emerald-700'
      : value === 'BOOKED'
        ? 'bg-amber-500/10 text-amber-700'
        : 'bg-slate-200 text-slate-700';

  return (
    <span className={cn('inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em]', className)}>
      {value}
    </span>
  );
}

function PaymentPill({ value }: { value: SiteReportExpenseRow['paymentStatus'] }) {
  const className =
    value === 'COMPLETED'
      ? 'bg-emerald-500/10 text-emerald-700'
      : value === 'PARTIAL'
        ? 'bg-amber-500/10 text-amber-700'
        : 'bg-red-500/10 text-red-600';

  return (
    <span className={cn('inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em]', className)}>
      {value}
    </span>
  );
}

function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto border border-border print:overflow-visible">{children}</div>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-border bg-muted/15 px-5 py-10 text-center text-sm text-muted-foreground/75">
      {message}
    </div>
  );
}

function CustomerTable({ rows }: { rows: SiteReportCustomerRow[] }) {
  if (!rows.length) {
    return <EmptyState message="No customers or owners are linked to this site yet." />;
  }

  return (
    <TableShell>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/25">
          <tr className="text-left">
            {['Customer', 'Type', 'Unit', 'Status', 'Agreement', 'Collected', 'Outstanding'].map((heading) => (
              <th key={heading} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground/70">{row.phone || row.email || 'No contact details'}</p>
              </td>
              <td className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/80">
                {row.customerType || 'CUSTOMER'}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{row.flatDisplayName}</p>
                <p className="text-xs text-muted-foreground/70">{row.floorName || '-'}</p>
              </td>
              <td className="px-4 py-3">{row.flatStatus ? <StatusPill value={row.flatStatus} /> : '-'}</td>
              <td className="px-4 py-3 font-medium text-foreground">{formatINR(row.sellingPrice)}</td>
              <td className="px-4 py-3 text-emerald-600">{formatINR(row.amountPaid)}</td>
              <td className="px-4 py-3 text-red-500">{formatINR(row.remaining)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function ExpenseTable({ rows }: { rows: SiteReportExpenseRow[] }) {
  if (!rows.length) {
    return <EmptyState message="No expenses have been recorded for this site yet." />;
  }

  return (
    <TableShell>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/25">
          <tr className="text-left">
            {['Category', 'Reason', 'Vendor', 'Amount', 'Paid', 'Remaining', 'Status'].map((heading) => (
              <th key={heading} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/80">{row.type}</td>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{row.reason || row.description || 'Expense entry'}</p>
                <p className="text-xs text-muted-foreground/70">{formatDate(row.createdAt)}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground/85">{row.vendorName || '-'}</td>
              <td className="px-4 py-3 font-medium text-foreground">{formatINR(row.amount)}</td>
              <td className="px-4 py-3 text-emerald-600">{formatINR(row.amountPaid)}</td>
              <td className="px-4 py-3 text-red-500">{formatINR(row.remaining)}</td>
              <td className="px-4 py-3"><PaymentPill value={row.paymentStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function InvestorTable({ rows }: { rows: SiteReportInvestorRow[] }) {
  if (!rows.length) {
    return <EmptyState message="No equity investors are linked to this site yet." />;
  }

  return (
    <TableShell>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/25">
          <tr className="text-left">
            {['Investor', 'Equity', 'Capital Committed', 'Profit Paid', 'Status'].map((heading) => (
              <th key={heading} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground/70">{row.phone || 'No phone'}</p>
              </td>
              <td className="px-4 py-3 text-foreground">{row.equityPercentage ? `${row.equityPercentage}%` : '-'}</td>
              <td className="px-4 py-3 font-medium text-foreground">{formatINR(row.totalInvested)}</td>
              <td className="px-4 py-3 text-muted-foreground/90">{formatINR(row.totalReturned)}</td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em]',
                  row.isClosed ? 'bg-slate-200 text-slate-700' : 'bg-primary/10 text-primary',
                )}>
                  {row.isClosed ? 'Closed' : 'Active'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function ActivityTable({ rows }: { rows: SiteReportActivityRow[] }) {
  if (!rows.length) {
    return <EmptyState message="No recent site activity is available yet." />;
  }

  return (
    <TableShell>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/25">
          <tr className="text-left">
            {['Activity', 'Counterparty', 'Direction', 'Amount', 'Date'].map((heading) => (
              <th key={heading} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{row.title}</p>
                <p className="text-xs text-muted-foreground/70">{row.note || row.kind}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground/85">{row.counterparty || '-'}</td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em]',
                  row.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-600',
                )}>
                  {row.direction}
                </span>
              </td>
              <td className={cn('px-4 py-3 font-medium', row.direction === 'IN' ? 'text-emerald-600' : 'text-red-500')}>
                {formatINR(row.amount)}
              </td>
              <td className="px-4 py-3 text-muted-foreground/85">{formatDate(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function FundHistoryTable({ rows }: { rows: SiteReport['fundHistory'] }) {
  if (!rows.length) {
    return <EmptyState message="No fund transfers have been recorded for this site yet." />;
  }

  return (
    <TableShell>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/25">
          <tr className="text-left">
            {['Type', 'Amount', 'Running Balance', 'Note', 'Date'].map((heading) => (
              <th key={heading} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em]',
                  row.type === 'ALLOCATION' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-600',
                )}>
                  {row.type}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-foreground">{formatINR(row.amount)}</td>
              <td className="px-4 py-3 text-muted-foreground/90">{formatINR(row.runningBalance)}</td>
              <td className="px-4 py-3 text-muted-foreground/80">{row.note || '-'}</td>
              <td className="px-4 py-3 text-muted-foreground/85">{formatDate(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function FloorRegister({ floors }: { floors: SiteReport['floors'] }) {
  if (!floors.length) {
    return <EmptyState message="No floor or unit structure has been configured for this site yet." />;
  }

  return (
    <div className="space-y-6">
      {floors.map((floor) => (
        <div key={floor.id} className="border border-border">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-serif text-foreground">{floor.displayName}</p>
              <p className="text-xs text-muted-foreground/75">
                {floor.totals.totalUnits} units, {floor.totals.availableUnits} available, {floor.totals.bookedUnits} booked, {floor.totals.soldUnits} sold
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
              <span className="bg-slate-200 px-2 py-1 text-slate-700">{floor.totals.availableUnits} available</span>
              <span className="bg-amber-500/10 px-2 py-1 text-amber-700">{floor.totals.bookedUnits} booked</span>
              <span className="bg-emerald-500/10 px-2 py-1 text-emerald-700">{floor.totals.soldUnits} sold</span>
            </div>
          </div>

          {floor.flats.length ? (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-white">
                  <tr className="text-left">
                    {['Unit', 'Type', 'Status', 'Assigned To', 'Agreement', 'Collected', 'Outstanding'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {floor.flats.map((flat: SiteReportFlatRow) => (
                    <tr key={flat.id}>
                      <td className="px-4 py-3 font-medium text-foreground">{flat.displayName}</td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/80">{flat.flatType}</td>
                      <td className="px-4 py-3"><StatusPill value={flat.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground/85">{flat.customerName || '-'}</td>
                      <td className="px-4 py-3 text-foreground">{flat.sellingPrice !== null ? formatINR(flat.sellingPrice) : '-'}</td>
                      <td className="px-4 py-3 text-emerald-600">{flat.amountPaid !== null ? formatINR(flat.amountPaid) : '-'}</td>
                      <td className="px-4 py-3 text-red-500">{flat.remaining !== null ? formatINR(flat.remaining) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No units added on this floor yet." />
          )}
        </div>
      ))}
    </div>
  );
}

export default function SiteReportPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuthBootstrap();
  const siteId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { data, isLoading, error } = useSiteReport(siteId);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated || isLoading) {
    return <ReportLoading />;
  }

  if (!siteId || !data?.data?.report) {
    return (
      <div className="min-h-screen bg-neutral-100 px-6 py-16">
        <div className="mx-auto max-w-3xl border border-border bg-white p-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/55">Report Unavailable</p>
          <h1 className="mt-3 text-3xl font-serif text-foreground">We could not open this site report.</h1>
          <p className="mt-3 text-sm text-muted-foreground/75">
            {siteId ? (error instanceof Error ? error.message : 'The report data could not be loaded.') : 'A valid site id is required to open the report.'}
          </p>
          <Link
            href={siteId ? `/sites/${siteId}` : '/sites'}
            className={buttonVariants({ className: 'mt-6 rounded-none' })}
          >
            Back to Site
          </Link>
        </div>
      </div>
    );
  }

  const report = data.data.report;
  const collectionEfficiency = percent(
    report.customerSummary.totalCollected,
    report.customerSummary.netSaleValue || report.customerSummary.totalAgreementValue,
  );
  const inventoryAbsorption = percent(
    report.inventorySummary.bookedUnits + report.inventorySummary.soldUnits,
    report.inventorySummary.totalUnits,
  );
  const cashRealization = percent(
    report.financialSummary.customerCollections,
    report.financialSummary.totalAllocatedFund + report.financialSummary.customerCollections,
  );
  const expenseSettlement = percent(
    report.expenseSummary.totalPaid,
    report.expenseSummary.totalRecorded,
  );
  const totalCashIn =
    report.financialSummary.partnerAllocatedFund
    + report.financialSummary.investorAllocatedFund
    + report.financialSummary.customerCollections;
  const totalCashOut =
    report.financialSummary.totalExpensesPaid
    + report.financialSummary.totalWithdrawnFund
    + report.investorSummary.totalReturned;
  const alerts = [
    report.customerSummary.totalOutstanding > 0
      ? {
          title: 'Receivables Watch',
          detail: `${formatINR(report.customerSummary.totalOutstanding)} is still outstanding from customers and owners.`,
          tone: 'warning' as const,
        }
      : null,
    report.expenseSummary.totalOutstanding > 0
      ? {
          title: 'Payables Pending',
          detail: `${formatINR(report.expenseSummary.totalOutstanding)} remains unpaid across ${report.expenseSummary.pendingCount + report.expenseSummary.partialCount} expense items.`,
          tone: 'danger' as const,
        }
      : null,
    report.investorSummary.outstandingPrincipal > 0
      ? {
          title: 'Investor Obligation',
          detail: `${formatINR(report.investorSummary.outstandingPrincipal)} of investor principal is still open on this site.`,
          tone: 'warning' as const,
        }
      : null,
    report.financialSummary.remainingFund >= report.expenseSummary.totalOutstanding
      ? {
          title: 'Liquidity Position',
          detail: 'Current site cash is sufficient to cover the recorded expense outstanding balance.',
          tone: 'success' as const,
        }
      : {
          title: 'Liquidity Position',
          detail: 'Current site cash is below the recorded expense outstanding balance and needs attention.',
          tone: 'danger' as const,
        },
  ].filter(Boolean) as Array<{ title: string; detail: string; tone: 'danger' | 'warning' | 'success' }>;

  return (
    <div className="site-report-print-root min-h-screen bg-[linear-gradient(180deg,#f4f4f0_0%,#eef5f3_35%,#f8faf9_100%)] print:min-h-0 print:bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body {
            background: #ffffff !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .site-report-print-root {
            min-height: 0 !important;
            background: #ffffff !important;
          }

          .site-report-print-root .overflow-x-auto,
          .site-report-print-root .overflow-hidden {
            overflow: visible !important;
          }

          .site-report-print-root table {
            width: 100% !important;
            page-break-inside: auto;
          }

          .site-report-print-root thead {
            display: table-header-group;
          }

          .site-report-print-root tr,
          .site-report-print-root img,
          .site-report-print-root svg {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="sticky top-0 z-20 border-b border-border/80 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/sites/${report.site.id}`}
              className={buttonVariants({ variant: 'outline', className: 'rounded-none gap-1.5' })}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Site
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/55">Complete Site Report</p>
              <p className="text-sm text-muted-foreground/80">Snapshot generated on {formatDate(report.site.generatedAt)}</p>
            </div>
          </div>
          <Button onClick={() => window.print()} className="self-start rounded-none gap-2">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-6 print:max-w-none print:gap-3 print:px-0 print:py-0">
        <section className="overflow-hidden border border-border bg-white shadow-[0_12px_34px_rgba(15,23,42,0.04)] print:break-inside-avoid print:shadow-none">
          <div className="grid gap-0 lg:grid-cols-[1.4fr_0.9fr] print:grid-cols-[1.35fr_0.9fr]">
            <div className="border-b border-border px-5 py-5 lg:border-b-0 lg:border-r print:px-3 print:py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-muted-foreground/55">SiteLedger Report</p>
              <h1 className="mt-2.5 text-3xl font-serif tracking-tight text-foreground sm:text-4xl print:mt-1.5 print:text-[2rem]">{report.site.name}</h1>
              <p className="mt-2.5 max-w-3xl text-[15px] leading-relaxed text-muted-foreground/75 print:mt-1.5 print:text-[11px]">
                A single view of project health across capital, receivables, expenses, inventory, investors, and floor-wise unit movement.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 print:mt-3 print:gap-2">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">Address</p>
                    <p className="mt-1 text-sm text-foreground print:text-[11px]">{report.site.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">Project Type</p>
                    <p className="mt-1 text-sm text-foreground print:text-[11px]">{report.site.projectType.replaceAll('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Layers className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">Structure</p>
                    <p className="mt-1 text-sm text-foreground print:text-[11px]">{report.site.totalFloors} floors / {report.site.totalFlats} units</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">Project Start</p>
                    <p className="mt-1 text-sm text-foreground print:text-[11px]">{formatDate(report.site.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[linear-gradient(180deg,rgba(15,23,42,0.015)_0%,rgba(20,184,166,0.03)_100%)] px-5 py-5 print:px-3 print:py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-muted-foreground/55">Executive Summary</p>
              <div className="mt-4 grid grid-cols-2 gap-3 print:mt-3 print:gap-2">
                <SummaryCard
                  label="Remaining Fund"
                  value={formatCompactINR(report.financialSummary.remainingFund)}
                  valueTitle={formatINR(report.financialSummary.remainingFund)}
                  tone="primary"
                />
                <SummaryCard
                  label="Projected Profit"
                  value={formatCompactINR(report.financialSummary.totalProfit)}
                  valueTitle={formatINR(report.financialSummary.totalProfit)}
                  tone="success"
                />
                <SummaryCard label="Booked Units" value={String(report.inventorySummary.bookedUnits).padStart(2, '0')} />
                <SummaryCard
                  label="Outstanding Due"
                  value={formatCompactINR(report.customerSummary.totalOutstanding)}
                  valueTitle={formatINR(report.customerSummary.totalOutstanding)}
                  tone="danger"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 print:grid-cols-4 print:gap-2 print:break-inside-avoid">
          <SummaryCard
            label="Allocated Capital"
            value={formatCompactINR(report.financialSummary.totalAllocatedFund)}
            valueTitle={formatINR(report.financialSummary.totalAllocatedFund)}
            hint="Partner and investor capital currently assigned to this project."
          />
          <SummaryCard
            label="Customer Collections"
            value={formatCompactINR(report.financialSummary.customerCollections)}
            valueTitle={formatINR(report.financialSummary.customerCollections)}
            tone="success"
            hint="Total money collected from bookings and follow-up customer payments."
          />
          <SummaryCard
            label="Expense Burn"
            value={formatCompactINR(report.financialSummary.totalExpensesPaid)}
            valueTitle={formatINR(report.financialSummary.totalExpensesPaid)}
            tone="danger"
            hint="Actual paid expense outflow from the site wallet."
          />
          <SummaryCard label="Inventory Sold" value={String(report.inventorySummary.soldUnits).padStart(2, '0')} tone="primary" hint="Units fully paid and marked sold/registered." />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] print:grid-cols-2 print:gap-3">
          <Section eyebrow="Management Lens" title="Performance Ratios" subtitle="These ratios separate projected value from realized cash, and make it easier to judge execution quality rather than only raw totals.">
            <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
              <RatioCard
                label="Collection Efficiency"
                value={formatPercent(collectionEfficiency)}
                detail={`${formatINR(report.customerSummary.totalCollected)} collected against ${formatINR(report.customerSummary.netSaleValue || report.customerSummary.totalAgreementValue)} of sale value.`}
                tone={collectionEfficiency >= 70 ? 'success' : collectionEfficiency >= 40 ? 'primary' : 'danger'}
              />
              <RatioCard
                label="Inventory Absorption"
                value={formatPercent(inventoryAbsorption)}
                detail={`${report.inventorySummary.bookedUnits + report.inventorySummary.soldUnits} of ${report.inventorySummary.totalUnits} units are booked or sold.`}
                tone={inventoryAbsorption >= 70 ? 'success' : inventoryAbsorption >= 40 ? 'primary' : 'danger'}
              />
              <RatioCard
                label="Cash Realization Mix"
                value={formatPercent(cashRealization)}
                detail="Share of total site cash inflow coming from customer collections instead of capital allocation."
                tone={cashRealization >= 50 ? 'success' : cashRealization >= 25 ? 'primary' : 'danger'}
              />
              <RatioCard
                label="Expense Settlement"
                value={formatPercent(expenseSettlement)}
                detail={`${formatINR(report.expenseSummary.totalPaid)} paid against ${formatINR(report.expenseSummary.totalRecorded)} of recorded expense.`}
                tone={expenseSettlement >= 80 ? 'success' : expenseSettlement >= 50 ? 'primary' : 'danger'}
              />
            </div>
          </Section>

          <Section eyebrow="Attention Areas" title="Risk and Exceptions" subtitle="A professional project report should highlight what needs intervention, not only what has already happened.">
            <div className="grid gap-3 print:gap-2">
              {alerts.map((alert) => (
                <AlertCard key={alert.title} title={alert.title} detail={alert.detail} tone={alert.tone} />
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] print:grid-cols-[1.2fr_0.8fr] print:gap-3">
          <Section eyebrow="Project Health" title="Financial Position" subtitle="Read this first to understand how much capital has gone in, how much has been spent, what is still collectible, and how agreement value differs from profit-bearing sale value.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-2">
               <SummaryCard label="Partner Fund" value={formatCompactINR(report.financialSummary.partnerAllocatedFund)} valueTitle={formatINR(report.financialSummary.partnerAllocatedFund)} />
               <SummaryCard label="Investor Fund" value={formatCompactINR(report.financialSummary.investorAllocatedFund)} valueTitle={formatINR(report.financialSummary.investorAllocatedFund)} />
               <SummaryCard label="Withdrawn Back" value={formatCompactINR(report.financialSummary.totalWithdrawnFund)} valueTitle={formatINR(report.financialSummary.totalWithdrawnFund)} />
               <SummaryCard label="Agreement Total" value={formatCompactINR(report.financialSummary.totalAgreementValue)} valueTitle={formatINR(report.financialSummary.totalAgreementValue)} />
               <SummaryCard label="Net Sale Value" value={formatCompactINR(report.financialSummary.netSaleValue)} valueTitle={formatINR(report.financialSummary.netSaleValue)} tone="success" />
               <SummaryCard label="Tax / GST" value={formatCompactINR(report.financialSummary.totalTaxAmount)} valueTitle={formatINR(report.financialSummary.totalTaxAmount)} />
               <SummaryCard label="Discounts / Credits" value={formatCompactINR(report.financialSummary.totalDiscounts)} valueTitle={formatINR(report.financialSummary.totalDiscounts)} />
               <SummaryCard label="Recorded Expenses" value={formatCompactINR(report.financialSummary.totalExpensesRecorded)} valueTitle={formatINR(report.financialSummary.totalExpensesRecorded)} tone="danger" />
               <SummaryCard label="Expense Outstanding" value={formatCompactINR(report.financialSummary.totalExpensesOutstanding)} valueTitle={formatINR(report.financialSummary.totalExpensesOutstanding)} tone="danger" />
               <SummaryCard label="Projected Revenue" value={formatCompactINR(report.financialSummary.totalProjectedRevenue)} valueTitle={formatINR(report.financialSummary.totalProjectedRevenue)} tone="success" />
            </div>
          </Section>

          <Section eyebrow="Stock Position" title="Inventory Snapshot" subtitle="A quick count of what is free to sell, what is booked, and what has already closed.">
            <InventoryBar report={report} />
            {report.site.projectType === 'REDEVELOPMENT' ? (
               <div className="mt-5 grid grid-cols-2 gap-3 print:mt-3 print:gap-2">
                <div className="border border-border bg-muted/20 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">Customer Flats</p>
                  <p className="mt-1.5 text-xl font-semibold text-foreground">{report.inventorySummary.customerFlats}</p>
                </div>
                <div className="border border-border bg-violet-500/5 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700/80">Owner Flats</p>
                  <p className="mt-1.5 text-xl font-semibold text-violet-700">{report.inventorySummary.ownerFlats}</p>
                </div>
              </div>
            ) : null}
          </Section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-2 print:gap-3">
          <Section eyebrow="Cash Bridge" title="Sources of Cash" subtitle="Where the site wallet has been funded from so far. This is the best way to separate promoter capital from project-generated cash.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-2">
               <SummaryCard label="Partner Capital In" value={formatCompactINR(report.financialSummary.partnerAllocatedFund)} valueTitle={formatINR(report.financialSummary.partnerAllocatedFund)} />
               <SummaryCard label="Investor Capital In" value={formatCompactINR(report.financialSummary.investorAllocatedFund)} valueTitle={formatINR(report.financialSummary.investorAllocatedFund)} />
               <SummaryCard label="Customer Collections In" value={formatCompactINR(report.financialSummary.customerCollections)} valueTitle={formatINR(report.financialSummary.customerCollections)} tone="success" />
               <SummaryCard label="Total Cash In" value={formatCompactINR(totalCashIn)} valueTitle={formatINR(totalCashIn)} tone="primary" />
            </div>
          </Section>

          <Section eyebrow="Cash Bridge" title="Uses of Cash" subtitle="How site cash has been consumed or moved out. This helps management understand whether collections are being converted into liquidity or absorbed elsewhere.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-2">
               <SummaryCard label="Expenses Paid" value={formatCompactINR(report.financialSummary.totalExpensesPaid)} valueTitle={formatINR(report.financialSummary.totalExpensesPaid)} tone="danger" />
               <SummaryCard label="Pulled Back" value={formatCompactINR(report.financialSummary.totalWithdrawnFund)} valueTitle={formatINR(report.financialSummary.totalWithdrawnFund)} />
               <SummaryCard label="Investor Payouts" value={formatCompactINR(report.investorSummary.totalReturned)} valueTitle={formatINR(report.investorSummary.totalReturned)} />
               <SummaryCard label="Total Cash Out" value={formatCompactINR(totalCashOut)} valueTitle={formatINR(totalCashOut)} tone="danger" />
               <SummaryCard label="Net Cash Position" value={formatCompactINR(report.financialSummary.remainingFund)} valueTitle={formatINR(report.financialSummary.remainingFund)} tone="primary" />
            </div>
          </Section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-2 print:gap-3">
          <Section eyebrow="Receivables" title="Customer and Booking Summary" subtitle="Agreement totals, taxes, discounts, booking collected so far, and the amount still outstanding across all booked and sold units.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4 print:gap-2">
              <SummaryCard label="Customers" value={String(report.customerSummary.totalCustomers).padStart(2, '0')} />
              <SummaryCard label="Booked" value={String(report.customerSummary.bookedCustomers).padStart(2, '0')} />
              <SummaryCard label="Sold" value={String(report.customerSummary.soldCustomers).padStart(2, '0')} tone="success" />
              <SummaryCard label="Existing Owners" value={String(report.customerSummary.existingOwners).padStart(2, '0')} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:mt-3 print:grid-cols-3 print:gap-2">
               <SummaryCard label="Agreement Total" value={formatCompactINR(report.customerSummary.totalAgreementValue)} valueTitle={formatINR(report.customerSummary.totalAgreementValue)} />
               <SummaryCard label="Net Sale Value" value={formatCompactINR(report.customerSummary.netSaleValue)} valueTitle={formatINR(report.customerSummary.netSaleValue)} tone="success" />
               <SummaryCard label="Tax / GST" value={formatCompactINR(report.customerSummary.totalTaxAmount)} valueTitle={formatINR(report.customerSummary.totalTaxAmount)} />
               <SummaryCard label="Discounts / Credits" value={formatCompactINR(report.customerSummary.totalDiscounts)} valueTitle={formatINR(report.customerSummary.totalDiscounts)} />
               <SummaryCard label="Collected" value={formatCompactINR(report.customerSummary.totalCollected)} valueTitle={formatINR(report.customerSummary.totalCollected)} tone="success" />
               <SummaryCard label="Outstanding" value={formatCompactINR(report.customerSummary.totalOutstanding)} valueTitle={formatINR(report.customerSummary.totalOutstanding)} tone="danger" />
            </div>
          </Section>

          <Section eyebrow="Expense Control" title="Expense Summary" subtitle="Visibility into how much is recorded, what is already paid, and which expenses still need action.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4 print:gap-2">
              <SummaryCard label="Expense Items" value={String(report.expenseSummary.totalExpenseItems).padStart(2, '0')} />
              <SummaryCard label="General" value={String(report.expenseSummary.generalExpenseItems).padStart(2, '0')} />
              <SummaryCard label="Vendor" value={String(report.expenseSummary.vendorExpenseItems).padStart(2, '0')} />
               <SummaryCard label="Outstanding" value={formatCompactINR(report.expenseSummary.totalOutstanding)} valueTitle={formatINR(report.expenseSummary.totalOutstanding)} tone="danger" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 print:mt-3 print:grid-cols-3 print:gap-2">
              <SummaryCard label="Pending" value={String(report.expenseSummary.pendingCount).padStart(2, '0')} tone="danger" />
              <SummaryCard label="Partial" value={String(report.expenseSummary.partialCount).padStart(2, '0')} />
              <SummaryCard label="Completed" value={String(report.expenseSummary.completedCount).padStart(2, '0')} tone="success" />
            </div>
          </Section>
        </div>

        <Section eyebrow="Detailed Register" title="Customer Register" subtitle="Every assigned unit in one readable list, including who owns it, the agreement value, what is already received, and what remains due.">
          <CustomerTable rows={report.customers} />
        </Section>

        {report.existingOwners.length ? (
          <Section eyebrow="Redevelopment" title="Existing Owner Register" subtitle="Owner-linked units tracked separately for redevelopment projects.">
            <CustomerTable rows={report.existingOwners} />
          </Section>
        ) : null}

        <Section eyebrow="Construction Structure" title="Floor and Flat Register" subtitle="Floor-wise inventory with unit-by-unit status, assignment, and collection visibility.">
          <FloorRegister floors={report.floors} />
        </Section>

        <Section eyebrow="Spend Analysis" title="Expense Register" subtitle="Detailed expense list with vendor information, payment progress, and remaining payable amount.">
          <ExpenseTable rows={report.expenses} />
        </Section>

        <Section eyebrow="Equity View" title="Investor Register" subtitle="Site-linked equity investors, capital committed to the project, and profit share paid out so far.">
          <InvestorTable rows={report.investors} />
        </Section>

        <Section eyebrow="Capital Movement" title="Fund History" subtitle="Transfers between company and site, with running balance to show how site liquidity changed over time.">
          <FundHistoryTable rows={report.fundHistory} />
        </Section>

        <Section eyebrow="Recent Movement" title="Recent Activity" subtitle="Latest inflows and outflows affecting the site wallet, including customer payments, fund movements, expenses, and investor activity.">
          <ActivityTable rows={report.recentActivity} />
        </Section>

        <div className="border border-border bg-white p-4 print:mt-4 print:p-3">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/55">Report Note</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground/80">
                This report is a live snapshot generated from the current SiteLedger records. Financial totals, bookings, expenses, and investor data reflect the state of the system at the generation time shown above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
