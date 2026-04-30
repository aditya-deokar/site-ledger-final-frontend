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

function getSummaryValueClass(value: string) {
  if (value.length >= 14) return 'text-[clamp(1.05rem,1.25vw,1.35rem)]';
  if (value.length >= 10) return 'text-[clamp(1.25rem,1.5vw,1.65rem)]';
  return 'text-[clamp(1.55rem,1.9vw,2rem)]';
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
}: {
  label: string;
  value: string;
  tone?: 'default' | 'primary' | 'success' | 'danger';
  hint?: string;
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
        'flex h-full min-w-0 flex-col overflow-hidden border border-border bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-5',
        hint ? 'min-h-[124px]' : 'min-h-[96px]',
      )}
    >
      <div className="min-w-0">
        <p className="max-w-[14rem] text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">{label}</p>
        <p
          className={cn(
            'mt-2 min-w-0 whitespace-normal break-words leading-[1.05] tracking-tight [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere]',
            valueClassName,
            toneClasses[tone],
          )}
        >
          {value}
        </p>
      </div>
      {hint ? <p className="mt-auto pt-2 text-[11px] leading-snug text-muted-foreground/70">{hint}</p> : null}
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
      <div className="border-b border-border px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/50">{eyebrow}</p>
        <h2 className="mt-2 text-[1.65rem] font-serif tracking-tight text-foreground">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground/75">{subtitle}</p> : null}
      </div>
      <div className="px-5 py-5">{children}</div>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
  return <div className="overflow-x-auto border border-border">{children}</div>;
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
            <div className="overflow-x-auto">
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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f4f0_0%,#eef5f3_35%,#f8faf9_100%)]">
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

      <div className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <section className="overflow-hidden border border-border bg-white shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
          <div className="grid gap-0 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="border-b border-border px-5 py-5 lg:border-b-0 lg:border-r">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-muted-foreground/55">SiteLedger Report</p>
              <h1 className="mt-2.5 text-3xl font-serif tracking-tight text-foreground sm:text-4xl">{report.site.name}</h1>
              <p className="mt-2.5 max-w-3xl text-[15px] leading-relaxed text-muted-foreground/75">
                A single view of project health across capital, receivables, expenses, inventory, investors, and floor-wise unit movement.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">Address</p>
                    <p className="mt-1 text-sm text-foreground">{report.site.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">Project Type</p>
                    <p className="mt-1 text-sm text-foreground">{report.site.projectType.replaceAll('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Layers className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">Structure</p>
                    <p className="mt-1 text-sm text-foreground">{report.site.totalFloors} floors / {report.site.totalFlats} units</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/55">Project Start</p>
                    <p className="mt-1 text-sm text-foreground">{formatDate(report.site.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[linear-gradient(180deg,rgba(15,23,42,0.015)_0%,rgba(20,184,166,0.03)_100%)] px-5 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-muted-foreground/55">Executive Summary</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <SummaryCard label="Remaining Fund" value={formatINR(report.financialSummary.remainingFund)} tone="primary" />
                <SummaryCard label="Projected Profit" value={formatINR(report.financialSummary.totalProfit)} tone="success" />
                <SummaryCard label="Booked Units" value={String(report.inventorySummary.bookedUnits).padStart(2, '0')} />
                <SummaryCard label="Outstanding Due" value={formatINR(report.customerSummary.totalOutstanding)} tone="danger" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Allocated Capital" value={formatINR(report.financialSummary.totalAllocatedFund)} hint="Partner and investor capital currently assigned to this project." />
          <SummaryCard label="Customer Collections" value={formatINR(report.financialSummary.customerCollections)} tone="success" hint="Total money collected from bookings and follow-up customer payments." />
          <SummaryCard label="Expense Burn" value={formatINR(report.financialSummary.totalExpensesPaid)} tone="danger" hint="Actual paid expense outflow from the site wallet." />
          <SummaryCard label="Inventory Sold" value={String(report.inventorySummary.soldUnits).padStart(2, '0')} tone="primary" hint="Units fully paid and marked sold/registered." />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Section eyebrow="Project Health" title="Financial Position" subtitle="Read this first to understand how much capital has gone in, how much has been spent, what is still collectible, and how agreement value differs from profit-bearing sale value.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <SummaryCard label="Partner Fund" value={formatINR(report.financialSummary.partnerAllocatedFund)} />
              <SummaryCard label="Investor Fund" value={formatINR(report.financialSummary.investorAllocatedFund)} />
              <SummaryCard label="Withdrawn Back" value={formatINR(report.financialSummary.totalWithdrawnFund)} />
              <SummaryCard label="Agreement Total" value={formatINR(report.financialSummary.totalAgreementValue)} />
              <SummaryCard label="Net Sale Value" value={formatINR(report.financialSummary.netSaleValue)} tone="success" />
              <SummaryCard label="Tax / GST" value={formatINR(report.financialSummary.totalTaxAmount)} />
              <SummaryCard label="Discounts / Credits" value={formatINR(report.financialSummary.totalDiscounts)} />
              <SummaryCard label="Recorded Expenses" value={formatINR(report.financialSummary.totalExpensesRecorded)} tone="danger" />
              <SummaryCard label="Expense Outstanding" value={formatINR(report.financialSummary.totalExpensesOutstanding)} tone="danger" />
              <SummaryCard label="Projected Revenue" value={formatINR(report.financialSummary.totalProjectedRevenue)} tone="success" />
            </div>
          </Section>

          <Section eyebrow="Stock Position" title="Inventory Snapshot" subtitle="A quick count of what is free to sell, what is booked, and what has already closed.">
            <InventoryBar report={report} />
            {report.site.projectType === 'REDEVELOPMENT' ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
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

        <div className="grid gap-6 xl:grid-cols-2">
          <Section eyebrow="Receivables" title="Customer and Booking Summary" subtitle="Agreement totals, taxes, discounts, booking collected so far, and the amount still outstanding across all booked and sold units.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Customers" value={String(report.customerSummary.totalCustomers).padStart(2, '0')} />
              <SummaryCard label="Booked" value={String(report.customerSummary.bookedCustomers).padStart(2, '0')} />
              <SummaryCard label="Sold" value={String(report.customerSummary.soldCustomers).padStart(2, '0')} tone="success" />
              <SummaryCard label="Existing Owners" value={String(report.customerSummary.existingOwners).padStart(2, '0')} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryCard label="Agreement Total" value={formatINR(report.customerSummary.totalAgreementValue)} />
              <SummaryCard label="Net Sale Value" value={formatINR(report.customerSummary.netSaleValue)} tone="success" />
              <SummaryCard label="Tax / GST" value={formatINR(report.customerSummary.totalTaxAmount)} />
              <SummaryCard label="Discounts / Credits" value={formatINR(report.customerSummary.totalDiscounts)} />
              <SummaryCard label="Collected" value={formatINR(report.customerSummary.totalCollected)} tone="success" />
              <SummaryCard label="Outstanding" value={formatINR(report.customerSummary.totalOutstanding)} tone="danger" />
            </div>
          </Section>

          <Section eyebrow="Expense Control" title="Expense Summary" subtitle="Visibility into how much is recorded, what is already paid, and which expenses still need action.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Expense Items" value={String(report.expenseSummary.totalExpenseItems).padStart(2, '0')} />
              <SummaryCard label="General" value={String(report.expenseSummary.generalExpenseItems).padStart(2, '0')} />
              <SummaryCard label="Vendor" value={String(report.expenseSummary.vendorExpenseItems).padStart(2, '0')} />
              <SummaryCard label="Outstanding" value={formatINR(report.expenseSummary.totalOutstanding)} tone="danger" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
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

        <div className="grid gap-6 xl:grid-cols-2">
          <Section eyebrow="Capital Movement" title="Fund History" subtitle="Transfers between company and site, with running balance to show how site liquidity changed over time.">
            <FundHistoryTable rows={report.fundHistory} />
          </Section>

          <Section eyebrow="Recent Movement" title="Recent Activity" subtitle="Latest inflows and outflows affecting the site wallet, including customer payments, fund movements, expenses, and investor activity.">
            <ActivityTable rows={report.recentActivity} />
          </Section>
        </div>

        <div className="border border-border bg-white p-4 print:mt-10">
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
