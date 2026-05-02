'use client';

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  ChevronLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import type { CompanyActivityItem } from '@/schemas/company.schema';
import type { CustomerPaymentHistoryItem } from '@/schemas/customer.schema';
import type { EmployeeTransaction } from '@/schemas/employee.schema';
import type { Transaction as InvestorTransaction } from '@/schemas/investor.schema';
import type { SiteReportActivityRow } from '@/schemas/site-report.schema';
import type { VendorStatementEntry } from '@/schemas/vendor.schema';
import { exportElementToPdf } from '@/lib/pdf-export';
import { cn } from '@/lib/utils';
import { companyService } from '@/services/company.service';
import { customerService } from '@/services/customer.service';
import { employeeService } from '@/services/employee.service';
import { investorService } from '@/services/investor.service';
import { siteService } from '@/services/site.service';
import { vendorService } from '@/services/vendor.service';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TransactionHistoryAction } from './types';
import { formatINR, formatShortDate } from './utils';

type SortDirection = 'asc' | 'desc';

type SortableColumn<Row> = {
  key: string;
  label: string;
  className?: string;
  render: (row: Row) => ReactNode;
  getSortValue: (row: Row) => string | number;
  exportValue?: (row: Row) => string | number;
};

type HistoryRow =
  | {
      id: string;
      date: string;
      scope: 'all' | 'company';
      raw: CompanyActivityItem;
    }
  | {
      id: string;
      date: string;
      scope: 'site';
      raw: SiteReportActivityRow;
    }
  | {
      id: string;
      date: string;
      scope: 'investor';
      raw: InvestorTransaction;
    }
  | {
      id: string;
      date: string;
      scope: 'vendor';
      raw: VendorStatementEntry;
    }
  | {
      id: string;
      date: string;
      scope: 'customer';
      raw: CustomerPaymentHistoryItem;
    }
  | {
      id: string;
      date: string;
      scope: 'employee';
      raw: EmployeeTransaction;
    };

type Props = {
  action: TransactionHistoryAction;
  selectedEntity?: any | null;
  onBack: () => void;
};

type StatCard = {
  label: string;
  value: string;
  tone: 'emerald' | 'red' | 'amber' | 'blue' | 'slate';
};

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function SortHeader<Row>({
  column,
  activeKey,
  direction,
  onToggle,
}: {
  column: SortableColumn<Row>;
  activeKey: string;
  direction: SortDirection;
  onToggle: (key: string) => void;
}) {
  const isActive = activeKey === column.key;

  return (
    <button
      type="button"
      onClick={() => onToggle(column.key)}
      className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-slate-600 transition-colors hover:text-slate-900"
    >
      <span>{column.label}</span>
      <ArrowUpDown className={cn('h-3.5 w-3.5', isActive ? 'text-cyan-700' : 'text-slate-400')} />
      {isActive && <span className="sr-only">{direction === 'asc' ? 'sorted ascending' : 'sorted descending'}</span>}
    </button>
  );
}

function toneClasses(tone: StatCard['tone']) {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'red':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'blue':
      return 'border-cyan-200 bg-cyan-50 text-cyan-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-800';
  }
}

function amountClasses(value: number) {
  if (value > 0) return 'text-emerald-700';
  if (value < 0) return 'text-rose-700';
  return 'text-slate-700';
}

function badgeClasses(value: string) {
  const normalized = value.toUpperCase();
  if (normalized.includes('COMPLETED') || normalized.includes('PAID') || normalized.includes('IN') || normalized.includes('PAYMENT')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (normalized.includes('PENDING') || normalized.includes('PARTIAL')) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  if (normalized.includes('OUT') || normalized.includes('DEDUCTION') || normalized.includes('FAILED') || normalized.includes('REFUND')) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return 'border-cyan-200 bg-cyan-50 text-cyan-700';
}

export function TransactionHistoryView({ action, selectedEntity, onBack }: Props) {
  const [sortKey, setSortKey] = useState('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const companyActivityQuery = useQuery({
    queryKey: ['company-activity', action],
    queryFn: () => companyService.getActivity(undefined, 50),
    retry: false,
    enabled: action === 'all-transactions' || action === 'company-transactions',
  });

  const siteActivityQuery = useQuery({
    queryKey: ['site-report-history', selectedEntity?.id],
    queryFn: () => siteService.getSiteReport(selectedEntity.id),
    retry: false,
    enabled: action === 'site-transactions' && !!selectedEntity?.id,
  });

  const investorTransactionsQuery = useQuery({
    queryKey: ['history-investor-transactions', selectedEntity?.id],
    queryFn: () => investorService.getTransactions(selectedEntity.id),
    retry: false,
    enabled: action === 'investor-transactions' && !!selectedEntity?.id,
  });

  const vendorStatementQuery = useQuery({
    queryKey: ['history-vendor-statement', selectedEntity?.id],
    queryFn: () => vendorService.getVendorStatement(selectedEntity.id),
    retry: false,
    enabled: action === 'vendor-transactions' && !!selectedEntity?.id,
  });

  const customerPaymentsQuery = useQuery({
    queryKey: ['history-customer-payments', selectedEntity?.id],
    queryFn: () => customerService.getPayments(selectedEntity.id),
    retry: false,
    enabled: action === 'customer-transactions' && !!selectedEntity?.id,
  });

  const employeeTransactionsQuery = useQuery({
    queryKey: ['history-employee-transactions', selectedEntity?.id],
    queryFn: () => employeeService.getTransactions(selectedEntity.id),
    retry: false,
    enabled: action === 'employee-transactions' && !!selectedEntity?.id,
  });

  const queryState = (
    action === 'all-transactions' || action === 'company-transactions'
      ? companyActivityQuery
      : action === 'site-transactions'
        ? siteActivityQuery
        : action === 'investor-transactions'
          ? investorTransactionsQuery
          : action === 'vendor-transactions'
            ? vendorStatementQuery
            : action === 'customer-transactions'
              ? customerPaymentsQuery
              : employeeTransactionsQuery
  );

  const title = useMemo(() => {
    if (selectedEntity?.name) return selectedEntity.name;

    switch (action) {
      case 'all-transactions':
        return 'All Transactions';
      case 'site-transactions':
        return 'Site Ledger';
      case 'company-transactions':
        return 'Company Ledger';
      case 'investor-transactions':
        return 'Investor Ledger';
      case 'vendor-transactions':
        return 'Vendor Ledger';
      case 'customer-transactions':
        return 'Customer Ledger';
      case 'employee-transactions':
        return 'Employee Ledger';
      default:
        return 'Transaction History';
    }
  }, [action, selectedEntity?.name]);

  const subLabel = useMemo(() => {
    switch (action) {
      case 'all-transactions':
        return 'company-wide';
      case 'site-transactions':
        return 'site';
      case 'company-transactions':
        return 'company';
      case 'investor-transactions':
        return 'investor';
      case 'vendor-transactions':
        return 'vendor';
      case 'customer-transactions':
        return 'customer';
      case 'employee-transactions':
        return 'employee';
      default:
        return 'history';
    }
  }, [action]);

  const rows = useMemo<HistoryRow[]>(() => {
    switch (action) {
      case 'all-transactions':
      case 'company-transactions':
        return (companyActivityQuery.data?.data?.activities ?? []).map((activity) => ({
          id: activity.id,
          date: activity.date,
          scope: action === 'all-transactions' ? 'all' : 'company',
          raw: activity,
        }));
      case 'site-transactions':
        return (siteActivityQuery.data?.data?.report?.recentActivity ?? []).map((activity) => ({
          id: activity.id,
          date: activity.createdAt,
          scope: 'site',
          raw: activity,
        }));
      case 'investor-transactions':
        return (investorTransactionsQuery.data?.data?.transactions ?? []).map((transaction) => ({
          id: transaction.id,
          date: transaction.paymentDate ?? transaction.createdAt,
          scope: 'investor',
          raw: transaction,
        }));
      case 'vendor-transactions':
        return (vendorStatementQuery.data?.data?.statement ?? []).map((entry) => ({
          id: entry.referenceId,
          date: entry.date,
          scope: 'vendor',
          raw: entry,
        }));
      case 'customer-transactions':
        return (customerPaymentsQuery.data?.data?.payments ?? []).map((payment) => ({
          id: payment.id,
          date: payment.createdAt,
          scope: 'customer',
          raw: payment,
        }));
      case 'employee-transactions':
        return (employeeTransactionsQuery.data?.data?.transactions ?? []).map((transaction) => ({
          id: transaction.id,
          date: transaction.paidAt ?? transaction.date,
          scope: 'employee',
          raw: transaction,
        }));
      default:
        return [];
    }
  }, [
    action,
    companyActivityQuery.data?.data?.activities,
    customerPaymentsQuery.data?.data?.payments,
    employeeTransactionsQuery.data?.data?.transactions,
    investorTransactionsQuery.data?.data?.transactions,
    siteActivityQuery.data?.data?.report?.recentActivity,
    vendorStatementQuery.data?.data?.statement,
  ]);

  const columns = useMemo<SortableColumn<HistoryRow>[]>(() => {
    switch (action) {
      case 'all-transactions':
      case 'company-transactions':
        return [
          {
            key: 'date',
            label: 'Date',
            render: (row) => <span className="font-semibold text-slate-700">{formatShortDate((row.raw as CompanyActivityItem).date)}</span>,
            getSortValue: (row) => (row.raw as CompanyActivityItem).date,
            exportValue: (row) => (row.raw as CompanyActivityItem).date,
          },
          {
            key: 'type',
            label: 'Type',
            render: (row) => {
              const value = (row.raw as CompanyActivityItem).type.replaceAll('_', ' ');
              return <span className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider', badgeClasses(value))}>{value}</span>;
            },
            getSortValue: (row) => (row.raw as CompanyActivityItem).type,
            exportValue: (row) => (row.raw as CompanyActivityItem).type,
          },
          {
            key: 'description',
            label: 'Description',
            className: 'min-w-[18rem]',
            render: (row) => <span className="font-medium text-slate-800">{(row.raw as CompanyActivityItem).description}</span>,
            getSortValue: (row) => (row.raw as CompanyActivityItem).description,
            exportValue: (row) => (row.raw as CompanyActivityItem).description,
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => {
              const value = (row.raw as CompanyActivityItem).amount;
              return <span className={cn('font-black tabular-nums', amountClasses(value))}>{formatINR(value)}</span>;
            },
            getSortValue: (row) => (row.raw as CompanyActivityItem).amount,
            exportValue: (row) => (row.raw as CompanyActivityItem).amount,
          },
        ];
      case 'site-transactions':
        return [
          {
            key: 'date',
            label: 'Date',
            render: (row) => <span className="font-semibold text-slate-700">{formatShortDate((row.raw as SiteReportActivityRow).createdAt)}</span>,
            getSortValue: (row) => (row.raw as SiteReportActivityRow).createdAt,
            exportValue: (row) => (row.raw as SiteReportActivityRow).createdAt,
          },
          {
            key: 'kind',
            label: 'Kind',
            render: (row) => {
              const value = (row.raw as SiteReportActivityRow).kind.replaceAll('_', ' ');
              return <span className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider', badgeClasses(value))}>{value}</span>;
            },
            getSortValue: (row) => (row.raw as SiteReportActivityRow).kind,
            exportValue: (row) => (row.raw as SiteReportActivityRow).kind,
          },
          {
            key: 'title',
            label: 'Title',
            className: 'min-w-[16rem]',
            render: (row) => <span className="font-medium text-slate-800">{(row.raw as SiteReportActivityRow).title}</span>,
            getSortValue: (row) => (row.raw as SiteReportActivityRow).title,
            exportValue: (row) => (row.raw as SiteReportActivityRow).title,
          },
          {
            key: 'counterparty',
            label: 'Counterparty',
            render: (row) => <span className="text-slate-600">{(row.raw as SiteReportActivityRow).counterparty ?? '-'}</span>,
            getSortValue: (row) => (row.raw as SiteReportActivityRow).counterparty ?? '',
            exportValue: (row) => (row.raw as SiteReportActivityRow).counterparty ?? '',
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => {
              const activity = row.raw as SiteReportActivityRow;
              const signed = activity.direction === 'IN' ? Math.abs(activity.amount) : -Math.abs(activity.amount);
              return <span className={cn('font-black tabular-nums', amountClasses(signed))}>{signed > 0 ? '+' : '-'}{formatINR(Math.abs(signed))}</span>;
            },
            getSortValue: (row) => {
              const activity = row.raw as SiteReportActivityRow;
              return activity.direction === 'IN' ? Math.abs(activity.amount) : -Math.abs(activity.amount);
            },
            exportValue: (row) => {
              const activity = row.raw as SiteReportActivityRow;
              return `${activity.direction === 'IN' ? '+' : '-'}${activity.amount}`;
            },
          },
          {
            key: 'note',
            label: 'Note',
            className: 'min-w-[12rem]',
            render: (row) => <span className="text-slate-600">{(row.raw as SiteReportActivityRow).note ?? '-'}</span>,
            getSortValue: (row) => (row.raw as SiteReportActivityRow).note ?? '',
            exportValue: (row) => (row.raw as SiteReportActivityRow).note ?? '',
          },
        ];
      case 'investor-transactions':
        return [
          {
            key: 'date',
            label: 'Date',
            render: (row) => {
              const transaction = row.raw as InvestorTransaction;
              return <span className="font-semibold text-slate-700">{formatShortDate(transaction.paymentDate ?? transaction.createdAt)}</span>;
            },
            getSortValue: (row) => {
              const transaction = row.raw as InvestorTransaction;
              return transaction.paymentDate ?? transaction.createdAt;
            },
            exportValue: (row) => {
              const transaction = row.raw as InvestorTransaction;
              return transaction.paymentDate ?? transaction.createdAt;
            },
          },
          {
            key: 'kind',
            label: 'Kind',
            render: (row) => {
              const value = (row.raw as InvestorTransaction).kind.replaceAll('_', ' ');
              return <span className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider', badgeClasses(value))}>{value}</span>;
            },
            getSortValue: (row) => (row.raw as InvestorTransaction).kind,
            exportValue: (row) => (row.raw as InvestorTransaction).kind,
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => {
              const transaction = row.raw as InvestorTransaction;
              const signed = transaction.kind === 'PRINCIPAL_OUT' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
              return <span className={cn('font-black tabular-nums', amountClasses(signed))}>{signed > 0 ? '+' : '-'}{formatINR(Math.abs(signed))}</span>;
            },
            getSortValue: (row) => {
              const transaction = row.raw as InvestorTransaction;
              return transaction.kind === 'PRINCIPAL_OUT' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
            },
            exportValue: (row) => {
              const transaction = row.raw as InvestorTransaction;
              return transaction.kind === 'PRINCIPAL_OUT' ? `-${transaction.amount}` : `+${transaction.amount}`;
            },
          },
          {
            key: 'paid',
            label: 'Paid',
            render: (row) => <span className="font-bold tabular-nums text-emerald-700">{formatINR((row.raw as InvestorTransaction).amountPaid)}</span>,
            getSortValue: (row) => (row.raw as InvestorTransaction).amountPaid,
            exportValue: (row) => (row.raw as InvestorTransaction).amountPaid,
          },
          {
            key: 'remaining',
            label: 'Remaining',
            render: (row) => <span className="font-bold tabular-nums text-amber-700">{formatINR((row.raw as InvestorTransaction).remaining)}</span>,
            getSortValue: (row) => (row.raw as InvestorTransaction).remaining,
            exportValue: (row) => (row.raw as InvestorTransaction).remaining,
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => {
              const value = (row.raw as InvestorTransaction).paymentStatus;
              return <span className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider', badgeClasses(value))}>{value}</span>;
            },
            getSortValue: (row) => (row.raw as InvestorTransaction).paymentStatus,
            exportValue: (row) => (row.raw as InvestorTransaction).paymentStatus,
          },
        ];
      case 'vendor-transactions':
        return [
          {
            key: 'date',
            label: 'Date',
            render: (row) => <span className="font-semibold text-slate-700">{formatShortDate((row.raw as VendorStatementEntry).date)}</span>,
            getSortValue: (row) => (row.raw as VendorStatementEntry).date,
            exportValue: (row) => (row.raw as VendorStatementEntry).date,
          },
          {
            key: 'entryType',
            label: 'Entry',
            render: (row) => {
              const value = (row.raw as VendorStatementEntry).entryType;
              return <span className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider', badgeClasses(value))}>{value}</span>;
            },
            getSortValue: (row) => (row.raw as VendorStatementEntry).entryType,
            exportValue: (row) => (row.raw as VendorStatementEntry).entryType,
          },
          {
            key: 'site',
            label: 'Site',
            render: (row) => <span className="font-medium text-slate-700">{(row.raw as VendorStatementEntry).siteName ?? '-'}</span>,
            getSortValue: (row) => (row.raw as VendorStatementEntry).siteName ?? '',
            exportValue: (row) => (row.raw as VendorStatementEntry).siteName ?? '',
          },
          {
            key: 'bill',
            label: 'Bill',
            render: (row) => {
              const entry = row.raw as VendorStatementEntry;
              return <span className="font-bold tabular-nums text-rose-700">{entry.billAmount ? formatINR(entry.billAmount) : '-'}</span>;
            },
            getSortValue: (row) => (row.raw as VendorStatementEntry).billAmount,
            exportValue: (row) => (row.raw as VendorStatementEntry).billAmount,
          },
          {
            key: 'payment',
            label: 'Payment',
            render: (row) => {
              const entry = row.raw as VendorStatementEntry;
              return <span className="font-bold tabular-nums text-emerald-700">{entry.paymentAmount ? formatINR(entry.paymentAmount) : '-'}</span>;
            },
            getSortValue: (row) => (row.raw as VendorStatementEntry).paymentAmount,
            exportValue: (row) => (row.raw as VendorStatementEntry).paymentAmount,
          },
          {
            key: 'balance',
            label: 'Balance',
            render: (row) => <span className="font-black tabular-nums text-cyan-800">{formatINR((row.raw as VendorStatementEntry).balance)}</span>,
            getSortValue: (row) => (row.raw as VendorStatementEntry).balance,
            exportValue: (row) => (row.raw as VendorStatementEntry).balance,
          },
        ];
      case 'customer-transactions':
        return [
          {
            key: 'date',
            label: 'Date',
            render: (row) => <span className="font-semibold text-slate-700">{formatShortDate((row.raw as CustomerPaymentHistoryItem).createdAt)}</span>,
            getSortValue: (row) => (row.raw as CustomerPaymentHistoryItem).createdAt,
            exportValue: (row) => (row.raw as CustomerPaymentHistoryItem).createdAt,
          },
          {
            key: 'movement',
            label: 'Movement',
            render: (row) => {
              const value = (row.raw as CustomerPaymentHistoryItem).movementType.replaceAll('_', ' ');
              return <span className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider', badgeClasses(value))}>{value}</span>;
            },
            getSortValue: (row) => (row.raw as CustomerPaymentHistoryItem).movementType,
            exportValue: (row) => (row.raw as CustomerPaymentHistoryItem).movementType,
          },
          {
            key: 'mode',
            label: 'Mode',
            render: (row) => <span className="font-medium text-slate-700">{(row.raw as CustomerPaymentHistoryItem).paymentMode ?? '-'}</span>,
            getSortValue: (row) => (row.raw as CustomerPaymentHistoryItem).paymentMode ?? '',
            exportValue: (row) => (row.raw as CustomerPaymentHistoryItem).paymentMode ?? '',
          },
          {
            key: 'reference',
            label: 'Ref',
            render: (row) => <span className="font-mono text-[11px] text-slate-600">{(row.raw as CustomerPaymentHistoryItem).referenceNumber ?? '-'}</span>,
            getSortValue: (row) => (row.raw as CustomerPaymentHistoryItem).referenceNumber ?? '',
            exportValue: (row) => (row.raw as CustomerPaymentHistoryItem).referenceNumber ?? '',
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => {
              const payment = row.raw as CustomerPaymentHistoryItem;
              const signed = payment.direction === 'IN' ? Math.abs(payment.amount) : -Math.abs(payment.amount);
              return <span className={cn('font-black tabular-nums', amountClasses(signed))}>{signed > 0 ? '+' : '-'}{formatINR(Math.abs(signed))}</span>;
            },
            getSortValue: (row) => {
              const payment = row.raw as CustomerPaymentHistoryItem;
              return payment.direction === 'IN' ? Math.abs(payment.amount) : -Math.abs(payment.amount);
            },
            exportValue: (row) => {
              const payment = row.raw as CustomerPaymentHistoryItem;
              return `${payment.direction === 'IN' ? '+' : '-'}${payment.amount}`;
            },
          },
          {
            key: 'note',
            label: 'Note',
            className: 'min-w-[14rem]',
            render: (row) => <span className="text-slate-600">{(row.raw as CustomerPaymentHistoryItem).note ?? '-'}</span>,
            getSortValue: (row) => (row.raw as CustomerPaymentHistoryItem).note ?? '',
            exportValue: (row) => (row.raw as CustomerPaymentHistoryItem).note ?? '',
          },
        ];
      case 'employee-transactions':
        return [
          {
            key: 'date',
            label: 'Date',
            render: (row) => <span className="font-semibold text-slate-700">{formatShortDate((row.raw as EmployeeTransaction).date)}</span>,
            getSortValue: (row) => (row.raw as EmployeeTransaction).date,
            exportValue: (row) => (row.raw as EmployeeTransaction).date,
          },
          {
            key: 'type',
            label: 'Type',
            render: (row) => {
              const value = (row.raw as EmployeeTransaction).type;
              return <span className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider', badgeClasses(value))}>{value}</span>;
            },
            getSortValue: (row) => (row.raw as EmployeeTransaction).type,
            exportValue: (row) => (row.raw as EmployeeTransaction).type,
          },
          {
            key: 'description',
            label: 'Description',
            className: 'min-w-[18rem]',
            render: (row) => <span className="font-medium text-slate-800">{(row.raw as EmployeeTransaction).description}</span>,
            getSortValue: (row) => (row.raw as EmployeeTransaction).description,
            exportValue: (row) => (row.raw as EmployeeTransaction).description,
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => {
              const tx = row.raw as EmployeeTransaction;
              const signed = tx.type === 'deduction' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
              return <span className={cn('font-black tabular-nums', amountClasses(signed))}>{signed > 0 ? '+' : '-'}{formatINR(Math.abs(signed))}</span>;
            },
            getSortValue: (row) => {
              const tx = row.raw as EmployeeTransaction;
              return tx.type === 'deduction' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
            },
            exportValue: (row) => {
              const tx = row.raw as EmployeeTransaction;
              return tx.type === 'deduction' ? `-${tx.amount}` : `+${tx.amount}`;
            },
          },
          {
            key: 'method',
            label: 'Method',
            render: (row) => <span className="text-slate-600">{(row.raw as EmployeeTransaction).paymentMethod ?? '-'}</span>,
            getSortValue: (row) => (row.raw as EmployeeTransaction).paymentMethod ?? '',
            exportValue: (row) => (row.raw as EmployeeTransaction).paymentMethod ?? '',
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => {
              const value = (row.raw as EmployeeTransaction).status;
              return <span className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider', badgeClasses(value))}>{value}</span>;
            },
            getSortValue: (row) => (row.raw as EmployeeTransaction).status,
            exportValue: (row) => (row.raw as EmployeeTransaction).status,
          },
        ];
      default:
        return [];
    }
  }, [action]);

  const sortedRows = useMemo(() => {
    const activeColumn = columns.find((column) => column.key === sortKey) ?? columns[0];
    if (!activeColumn) return rows;

    return [...rows].sort((left, right) => {
      const leftValue = activeColumn.getSortValue(left);
      const rightValue = activeColumn.getSortValue(right);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      return sortDirection === 'asc'
        ? String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' })
        : String(rightValue).localeCompare(String(leftValue), undefined, { sensitivity: 'base' });
    });
  }, [columns, rows, sortDirection, sortKey]);

  const stats = useMemo<StatCard[]>(() => {
    const count = { label: 'Rows', value: String(rows.length), tone: 'slate' as const };

    switch (action) {
      case 'all-transactions':
      case 'company-transactions': {
        const total = rows.reduce((sum, row) => sum + Math.abs((row.raw as CompanyActivityItem).amount), 0);
        return [
          count,
          { label: 'Gross Flow', value: formatINR(total), tone: 'blue' },
        ];
      }
      case 'site-transactions': {
        const inflow = rows.reduce((sum, row) => {
          const item = row.raw as SiteReportActivityRow;
          return sum + (item.direction === 'IN' ? Math.abs(item.amount) : 0);
        }, 0);
        const outflow = rows.reduce((sum, row) => {
          const item = row.raw as SiteReportActivityRow;
          return sum + (item.direction === 'OUT' ? Math.abs(item.amount) : 0);
        }, 0);
        return [
          count,
          { label: 'Inflow', value: formatINR(inflow), tone: 'emerald' },
          { label: 'Outflow', value: formatINR(outflow), tone: 'red' },
          { label: 'Net', value: formatINR(inflow - outflow), tone: inflow - outflow >= 0 ? 'blue' : 'amber' },
        ];
      }
      case 'investor-transactions':
        return [
          count,
          { label: 'Outstanding', value: formatINR(investorTransactionsQuery.data?.data?.outstandingPrincipal ?? 0), tone: 'amber' },
          { label: 'Paid', value: formatINR(rows.reduce((sum, row) => sum + (row.raw as InvestorTransaction).amountPaid, 0)), tone: 'emerald' },
        ];
      case 'vendor-transactions':
        return [
          count,
          { label: 'Paid', value: formatINR(vendorStatementQuery.data?.data?.totalPaid ?? 0), tone: 'emerald' },
          { label: 'Billed', value: formatINR(vendorStatementQuery.data?.data?.totalBilled ?? 0), tone: 'red' },
          { label: 'Closing', value: formatINR(vendorStatementQuery.data?.data?.closingBalance ?? 0), tone: 'blue' },
        ];
      case 'customer-transactions': {
        const inflow = rows.reduce((sum, row) => {
          const item = row.raw as CustomerPaymentHistoryItem;
          return sum + (item.direction === 'IN' ? item.amount : 0);
        }, 0);
        const outflow = rows.reduce((sum, row) => {
          const item = row.raw as CustomerPaymentHistoryItem;
          return sum + (item.direction === 'OUT' ? item.amount : 0);
        }, 0);
        return [
          count,
          { label: 'Collected', value: formatINR(inflow), tone: 'emerald' },
          { label: 'Refunded', value: formatINR(outflow), tone: 'red' },
          { label: 'Net', value: formatINR(inflow - outflow), tone: inflow - outflow >= 0 ? 'blue' : 'amber' },
        ];
      }
      case 'employee-transactions': {
        const paid = employeeTransactionsQuery.data?.data?.summary.totalPaid ?? 0;
        const deducted = employeeTransactionsQuery.data?.data?.summary.totalDeducted ?? 0;
        const pending = employeeTransactionsQuery.data?.data?.summary.pendingAmount ?? 0;
        return [
          count,
          { label: 'Paid', value: formatINR(paid), tone: 'emerald' },
          { label: 'Deducted', value: formatINR(deducted), tone: 'red' },
          { label: 'Pending', value: formatINR(pending), tone: 'amber' },
        ];
      }
      default:
        return [count];
    }
  }, [
    action,
    employeeTransactionsQuery.data?.data?.summary.pendingAmount,
    employeeTransactionsQuery.data?.data?.summary.totalDeducted,
    employeeTransactionsQuery.data?.data?.summary.totalPaid,
    investorTransactionsQuery.data?.data?.outstandingPrincipal,
    rows,
    vendorStatementQuery.data?.data?.closingBalance,
    vendorStatementQuery.data?.data?.totalBilled,
    vendorStatementQuery.data?.data?.totalPaid,
  ]);

  const handleToggleSort = (nextKey: string) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === 'date' ? 'desc' : 'asc');
  };

  const handleExcelDownload = () => {
    if (!sortedRows.length) {
      toast.error('No rows available to export.');
      return;
    }

    const headerHtml = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
    const bodyHtml = sortedRows.map((row) => (
      `<tr>${columns.map((column) => {
        const rawValue = column.exportValue ? column.exportValue(row) : column.getSortValue(row);
        return `<td>${escapeHtml(rawValue)}</td>`;
      }).join('')}</tr>`
    )).join('');

    const workbookHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #e2e8f0; font-weight: 700; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([workbookHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-transactions.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Excel export downloaded.');
  };

  const handlePdfDownload = async () => {
    if (!exportRef.current) {
      toast.error('Nothing to export yet.');
      return;
    }

    setIsExportingPdf(true);
    try {
      await exportElementToPdf(
        exportRef.current,
        `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-transactions.pdf`,
      );
      toast.success('PDF export downloaded.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export PDF.';
      toast.error(message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={handleExcelDownload} className="h-10 rounded-none border-cyan-200 bg-cyan-50 px-4 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-800 hover:bg-cyan-100">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button type="button" variant="outline" onClick={() => void handlePdfDownload()} disabled={isExportingPdf} className="h-10 rounded-none border-rose-200 bg-rose-50 px-4 text-[10px] font-bold uppercase tracking-[0.24em] text-rose-800 hover:bg-rose-100">
            {isExportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            PDF
          </Button>
        </div>
      </div>

      <div
        ref={exportRef}
        className="overflow-hidden border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50 shadow-[0_16px_60px_rgba(15,23,42,0.08)]"
      >
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.12),_transparent_35%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(240,249,255,0.98))] px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.3em] text-cyan-800">
                <Wallet className="h-3.5 w-3.5" />
                {subLabel}
              </div>
              <div>
                <h2 className="text-2xl font-serif text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {sortedRows.length} visible records • sorted by {sortKey.replaceAll('-', ' ')} ({sortDirection})
                </p>
              </div>
            </div>

            <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[22rem] sm:grid-cols-2 lg:max-w-[30rem]">
              {stats.map((stat) => (
                <div key={stat.label} className={cn('border px-3 py-3', toneClasses(stat.tone))}>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.24em] opacity-80">{stat.label}</p>
                  <p className="mt-1 text-base font-black tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {queryState.isLoading ? (
          <div className="flex min-h-72 items-center justify-center bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading transactions...
            </div>
          </div>
        ) : queryState.error ? (
          <div className="border-t border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            We couldn&apos;t load this transaction history right now.
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="border-t border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No transaction records found for this selection.
          </div>
        ) : (
          <div className="bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-slate-600">
                <Download className="h-3.5 w-3.5" />
                Ledger Table
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" /> Inflow</span>
                <span className="inline-flex items-center gap-1"><ArrowDownLeft className="h-3.5 w-3.5 text-rose-600" /> Outflow</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-slate-200 bg-slate-100/90 hover:bg-slate-100/90">
                    {columns.map((column) => (
                      <TableHead key={column.key} className={cn('h-12 border-r border-slate-200 px-4 last:border-r-0', column.className)}>
                        <SortHeader
                          column={column}
                          activeKey={sortKey}
                          direction={sortDirection}
                          onToggle={handleToggleSort}
                        />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        'border-b border-slate-200 hover:bg-cyan-50/60',
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                      )}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={`${row.id}-${column.key}`}
                          className={cn('border-r border-slate-200 px-4 py-3 align-middle text-xs last:border-r-0', column.className)}
                        >
                          {column.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
