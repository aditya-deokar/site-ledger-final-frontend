'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import {
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Search,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
      className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground"
    >
      <span>{column.label}</span>
      <ArrowUpDown className={cn('h-3.5 w-3.5', isActive ? 'text-primary' : 'text-muted-foreground/60')} />
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
      return 'border-primary/20 bg-primary/10 text-primary';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

function amountClasses(value: number) {
  if (value > 0) return 'text-emerald-700';
  if (value < 0) return 'text-rose-700';
  return 'text-foreground';
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
  return 'border-primary/20 bg-primary/10 text-primary';
}


export function TransactionHistoryView({ action, selectedEntity, onBack }: Props) {
  const [sortKey, setSortKey] = useState('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('');
  const [siteKindFilter, setSiteKindFilter] = useState('');
  const [siteDirectionFilter, setSiteDirectionFilter] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedEntity?.id && action !== 'all-transactions') {
      toast.error('No entity selected. Redirecting...');
      onBack();
    }
  }, [action, selectedEntity?.id, onBack]);

  const { ref: loadMoreRef, inView } = useInView();

  const companyActivityQuery = useInfiniteQuery({
    queryKey: ['company-activity', action],
    queryFn: ({ pageParam }) => companyService.getActivity(pageParam as string | undefined, 50),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data?.nextCursor || undefined,
    enabled: action === 'all-transactions',
  });

  const siteActivityQuery = useInfiniteQuery({
    queryKey: ['site-report-history', selectedEntity?.id],
    queryFn: ({ pageParam }) => siteService.getSiteReport(selectedEntity.id, pageParam as number, 50),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.data?.recentActivity?.length === 50 || lastPage.data?.report?.recentActivity?.length === 50) ? allPages.length : undefined,
    enabled: action === 'site-transactions' && !!selectedEntity?.id,
  });

  const investorTransactionsQuery = useInfiniteQuery({
    queryKey: ['history-investor-transactions', selectedEntity?.id],
    queryFn: ({ pageParam }) => investorService.getTransactions(selectedEntity.id, pageParam as number, 50),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.data?.transactions?.length === 50 ? allPages.length : undefined,
    enabled: action === 'investor-transactions' && !!selectedEntity?.id,
  });

  const vendorStatementQuery = useInfiniteQuery({
    queryKey: ['history-vendor-statement', selectedEntity?.id],
    queryFn: ({ pageParam }) => vendorService.getVendorStatement(selectedEntity.id, pageParam as number, 50),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.data?.statement?.length === 50 ? allPages.length : undefined,
    enabled: action === 'vendor-transactions' && !!selectedEntity?.id,
  });

  const customerPaymentsQuery = useInfiniteQuery({
    queryKey: ['history-customer-payments', selectedEntity?.id],
    queryFn: ({ pageParam }) => customerService.getPayments(selectedEntity.id, pageParam as number, 50),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.data?.payments?.length === 50 ? allPages.length : undefined,
    enabled: action === 'customer-transactions' && !!selectedEntity?.id,
  });

  const employeeTransactionsQuery = useInfiniteQuery({
    queryKey: ['history-employee-transactions', selectedEntity?.id],
    queryFn: ({ pageParam }) => employeeService.getTransactions(selectedEntity.id, undefined, pageParam as number, 50),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.data?.transactions?.length === 50 ? allPages.length : undefined,
    enabled: action === 'employee-transactions' && !!selectedEntity?.id,
  });

  const queryState = (
    action === 'all-transactions'
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

  useEffect(() => {
    if (inView && queryState.hasNextPage && !queryState.isFetchingNextPage) {
      queryState.fetchNextPage();
    }
  }, [inView, queryState.hasNextPage, queryState.isFetchingNextPage, queryState]);

  const title = useMemo(() => {
    if (action === 'site-transactions') return 'Transaction History';
    if (selectedEntity?.name) return selectedEntity.name;

    switch (action) {
      case 'all-transactions':
        return 'All Transactions';
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
        return (companyActivityQuery.data?.pages.flatMap(p => p.data?.activities ?? []) ?? []).map((activity) => ({
          id: activity.id,
          date: activity.date,
          scope: 'all',
          raw: activity,
        }));
      case 'site-transactions':
        return (siteActivityQuery.data?.pages.flatMap(p => p.data?.recentActivity ?? p.data?.report?.recentActivity ?? []) ?? []).map((activity) => ({
          id: activity.id,
          date: activity.createdAt,
          scope: 'site',
          raw: activity,
        }));
      case 'investor-transactions':
        return (investorTransactionsQuery.data?.pages.flatMap(p => p.data?.transactions ?? []) ?? []).map((transaction) => ({
          id: transaction.id,
          date: transaction.paymentDate ?? transaction.createdAt,
          scope: 'investor',
          raw: transaction,
        }));
      case 'vendor-transactions':
        return (vendorStatementQuery.data?.pages.flatMap(p => p.data?.statement ?? []) ?? []).map((entry, index) => ({
          id: entry.referenceId || `vs-${entry.date}-${entry.balance}-${index}`,
          date: entry.date,
          scope: 'vendor',
          raw: entry,
        }));
      case 'customer-transactions':
        return (customerPaymentsQuery.data?.pages.flatMap(p => p.data?.payments ?? []) ?? []).map((payment) => ({
          id: payment.id,
          date: payment.createdAt,
          scope: 'customer',
          raw: payment,
        }));
      case 'employee-transactions':
        return (employeeTransactionsQuery.data?.pages.flatMap(p => p.data?.transactions ?? []) ?? []).map((transaction) => ({
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
    companyActivityQuery.data?.pages,
    siteActivityQuery.data?.pages,
    investorTransactionsQuery.data?.pages,
    vendorStatementQuery.data?.pages,
    customerPaymentsQuery.data?.pages,
    employeeTransactionsQuery.data?.pages,
  ]);

  const columns = useMemo<SortableColumn<HistoryRow>[]>(() => {
    switch (action) {
      case 'all-transactions':
        return [
          {
            key: 'date',
            label: 'Date',
            render: (row) => <span className="font-semibold text-foreground">{formatShortDate((row.raw as CompanyActivityItem).date)}</span>,
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
            render: (row) => <span className="font-medium text-foreground">{(row.raw as CompanyActivityItem).description}</span>,
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
            render: (row) => <span className="font-semibold text-foreground">{formatShortDate((row.raw as SiteReportActivityRow).createdAt)}</span>,
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
            render: (row) => <span className="font-medium text-foreground">{(row.raw as SiteReportActivityRow).title}</span>,
            getSortValue: (row) => (row.raw as SiteReportActivityRow).title,
            exportValue: (row) => (row.raw as SiteReportActivityRow).title,
          },
          {
            key: 'counterparty',
            label: 'Counterparty',
            render: (row) => <span className="text-muted-foreground">{(row.raw as SiteReportActivityRow).counterparty ?? '-'}</span>,
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
            render: (row) => <span className="text-muted-foreground">{(row.raw as SiteReportActivityRow).note ?? '-'}</span>,
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
              return <span className="font-semibold text-foreground">{formatShortDate(transaction.paymentDate ?? transaction.createdAt)}</span>;
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
            render: (row) => <span className="font-semibold text-foreground">{formatShortDate((row.raw as VendorStatementEntry).date)}</span>,
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
            render: (row) => <span className="font-medium text-foreground">{(row.raw as VendorStatementEntry).siteName ?? '-'}</span>,
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
            render: (row) => <span className="font-black tabular-nums text-primary">{formatINR((row.raw as VendorStatementEntry).balance)}</span>,
            getSortValue: (row) => (row.raw as VendorStatementEntry).balance,
            exportValue: (row) => (row.raw as VendorStatementEntry).balance,
          },
        ];
      case 'customer-transactions':
        return [
          {
            key: 'date',
            label: 'Date',
            render: (row) => <span className="font-semibold text-foreground">{formatShortDate((row.raw as CustomerPaymentHistoryItem).createdAt)}</span>,
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
            render: (row) => <span className="font-medium text-foreground">{(row.raw as CustomerPaymentHistoryItem).paymentMode ?? '-'}</span>,
            getSortValue: (row) => (row.raw as CustomerPaymentHistoryItem).paymentMode ?? '',
            exportValue: (row) => (row.raw as CustomerPaymentHistoryItem).paymentMode ?? '',
          },
          {
            key: 'reference',
            label: 'Ref',
            render: (row) => <span className="font-mono text-[11px] text-muted-foreground">{(row.raw as CustomerPaymentHistoryItem).referenceNumber ?? '-'}</span>,
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
            render: (row) => <span className="text-muted-foreground">{(row.raw as CustomerPaymentHistoryItem).note ?? '-'}</span>,
            getSortValue: (row) => (row.raw as CustomerPaymentHistoryItem).note ?? '',
            exportValue: (row) => (row.raw as CustomerPaymentHistoryItem).note ?? '',
          },
        ];
      case 'employee-transactions':
        return [
          {
            key: 'date',
            label: 'Date',
            render: (row) => <span className="font-semibold text-foreground">{formatShortDate((row.raw as EmployeeTransaction).date)}</span>,
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
            render: (row) => <span className="font-medium text-foreground">{(row.raw as EmployeeTransaction).description}</span>,
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
            render: (row) => <span className="text-muted-foreground">{(row.raw as EmployeeTransaction).paymentMethod ?? '-'}</span>,
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

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      if (action === 'site-transactions') {
        const tx = row.raw as SiteReportActivityRow;
        if (siteKindFilter && tx.kind !== siteKindFilter) return false;
        if (siteDirectionFilter && tx.direction !== siteDirectionFilter) return false;
      }

      if (action === 'employee-transactions') {
        const tx = row.raw as EmployeeTransaction;
        if (employeeTypeFilter && tx.type !== employeeTypeFilter) return false;
        if (employeeStatusFilter && tx.status !== employeeStatusFilter) return false;
      }

      if (!q) return true;
      const haystack = columns.map((column) => {
        const rawValue = column.exportValue ? column.exportValue(row) : column.getSortValue(row);
        return String(rawValue ?? '');
      }).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, searchText, action, employeeTypeFilter, employeeStatusFilter, siteKindFilter, siteDirectionFilter, columns]);

  const sortedRows = useMemo(() => {
    const activeColumn = columns.find((column) => column.key === sortKey) ?? columns[0];
    if (!activeColumn) return filteredRows;

    return [...filteredRows].sort((left, right) => {
      const leftValue = activeColumn.getSortValue(left);
      const rightValue = activeColumn.getSortValue(right);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      return sortDirection === 'asc'
        ? String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' })
        : String(rightValue).localeCompare(String(leftValue), undefined, { sensitivity: 'base' });
    });
  }, [columns, filteredRows, sortDirection, sortKey]);

  const siteKindOptions = useMemo(() => {
    if (action !== 'site-transactions') return [] as string[];
    return Array.from(new Set(rows.map((row) => (row.raw as SiteReportActivityRow).kind))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [action, rows]);

  const stats = useMemo<StatCard[]>(() => {
    switch (action) {
      case 'all-transactions': {
        const summary = companyActivityQuery.data?.pages[0]?.data?.summary;
        if (!summary) return [];
        return [
          { label: 'Gross Flow', value: formatINR(summary.grossFlow), tone: 'blue' },
          { label: 'Total Inflow', value: formatINR(summary.totalInflow), tone: 'emerald' },
          { label: 'Total Outflow', value: formatINR(summary.totalOutflow), tone: 'red' },
        ];
      }
      case 'site-transactions': {
        const summary = siteActivityQuery.data?.pages[0]?.data?.summary;
        if (!summary) return [];
        return [
          { label: 'Inflow', value: formatINR(summary.totalInflow), tone: 'emerald' },
          { label: 'Outflow', value: formatINR(summary.totalOutflow), tone: 'red' },
          { label: 'Net', value: formatINR(summary.totalInflow - summary.totalOutflow), tone: summary.totalInflow - summary.totalOutflow >= 0 ? 'blue' : 'amber' },
        ];
      }
      case 'investor-transactions': {
        const summary = investorTransactionsQuery.data?.pages[0]?.data?.summary;
        if (!summary) return [];
        return [
          { label: 'Outstanding', value: formatINR(summary.outstandingPrincipal), tone: 'amber' },
          { label: 'Paid', value: formatINR(summary.totalPaid), tone: 'emerald' },
        ];
      }
      case 'vendor-transactions': {
        const page0 = vendorStatementQuery.data?.pages[0]?.data;
        if (!page0) return [];
        return [
          { label: 'Paid', value: formatINR(page0.totalPaid ?? 0), tone: 'emerald' },
          { label: 'Billed', value: formatINR(page0.totalBilled ?? 0), tone: 'red' },
          { label: 'Outstanding', value: formatINR(page0.closingBalance ?? 0), tone: 'amber' },
        ];
      }
      case 'customer-transactions': {
        const summary = customerPaymentsQuery.data?.pages[0]?.data?.summary;
        if (!summary) return [];
        return [
          { label: 'Collected', value: formatINR(summary.totalCollected), tone: 'emerald' },
          { label: 'Refunded', value: formatINR(summary.totalRefunded), tone: 'red' },
          { label: 'Net', value: formatINR(summary.netAmount), tone: summary.netAmount >= 0 ? 'blue' : 'amber' },
        ];
      }
      case 'employee-transactions': {
        const summary = employeeTransactionsQuery.data?.pages[0]?.data?.summary;
        if (!summary) return [];
        return [
          { label: 'Paid', value: formatINR(summary.totalPaid), tone: 'emerald' },
          { label: 'Deducted', value: formatINR(summary.totalDeducted), tone: 'red' },
          { label: 'Pending', value: formatINR(summary.pendingAmount), tone: 'amber' },
        ];
      }
      default:
        return [];
    }
  }, [
    action,
    companyActivityQuery.data?.pages,
    siteActivityQuery.data?.pages,
    investorTransactionsQuery.data?.pages,
    vendorStatementQuery.data?.pages,
    customerPaymentsQuery.data?.pages,
    employeeTransactionsQuery.data?.pages,
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
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <div className="relative w-full min-w-[220px] lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search transactions..."
              className="h-10 rounded-none border-border bg-background pl-10 text-sm"
            />
          </div>
          <Button variant="outline" onClick={() => setFilterOpen(true)} className="h-10 rounded-none px-3">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button type="button" variant="outline" onClick={handleExcelDownload} className="h-10 rounded-none border-border bg-background px-4 text-[10px] font-bold uppercase tracking-[0.24em] text-foreground hover:bg-muted">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button type="button" variant="outline" onClick={() => void handlePdfDownload()} disabled={isExportingPdf} className="h-10 rounded-none border-border bg-background px-4 text-[10px] font-bold uppercase tracking-[0.24em] text-foreground hover:bg-muted">
            {isExportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            PDF
          </Button>
        </div>
      </div>

      <div ref={exportRef} className="overflow-hidden border border-border bg-background">
        {(action !== 'site-transactions' || stats.length > 0) && (
          <div className="border-b border-border bg-background px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              {action !== 'site-transactions' && (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.3em] text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5" />
                    {subLabel}
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-foreground">{title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sortedRows.length} entries found
                    </p>
                  </div>
                </div>
              )}
              {stats.length > 0 && (
                <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-4 lg:justify-end">
                  {stats.map((stat) => (
                    <div key={stat.label} className={cn('min-w-0 border px-3 py-2', toneClasses(stat.tone))}>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.24em] opacity-80">{stat.label}</p>
                      <p className="mt-0.5 text-base font-black tabular-nums">{stat.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {queryState.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading transactions...</p>
          </div>
        ) : queryState.error ? (
          <div className="border-t border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            We couldn&apos;t load this transaction history right now.
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="border-t border-border bg-background p-10 text-center text-sm text-muted-foreground">
            No transaction records found for this selection.
          </div>
        ) : (
          <div className="bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/60 hover:bg-muted/60">
                    {columns.map((column) => (
                      <TableHead key={column.key} className={cn('h-12 border-r border-border px-4 last:border-r-0', column.className)}>
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
                        'border-b border-border hover:bg-muted/30',
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                      )}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={`${row.id}-${column.key}`}
                          className={cn('border-r border-border px-4 py-2.5 align-middle text-xs last:border-r-0', column.className)}
                        >
                          {column.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow ref={loadMoreRef}>
                    <TableCell colSpan={columns.length} className="py-2.5 text-center">
                      {queryState.isFetchingNextPage ? (
                        <span className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more...
                        </span>
                      ) : queryState.hasNextPage ? (
                        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Scroll for more</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">End of history</span>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-y-auto rounded-none">
          <DialogHeader><DialogTitle>Filter Transactions</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            {action === 'employee-transactions' && (
              <>
                <div className="rounded-none border border-border bg-muted/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Transaction Type</p>
                  <select value={employeeTypeFilter} onChange={(e) => setEmployeeTypeFilter(e.target.value)} className="mt-2 h-10 w-full border border-border bg-background px-2 text-sm">
                    <option value="">All</option>
                    <option value="salary">Salary</option>
                    <option value="bonus">Bonus</option>
                    <option value="deduction">Deduction</option>
                    <option value="advance">Advance</option>
                    <option value="reimbursement">Reimbursement</option>
                  </select>
                </div>
                <div className="rounded-none border border-border bg-muted/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Status</p>
                  <select value={employeeStatusFilter} onChange={(e) => setEmployeeStatusFilter(e.target.value)} className="mt-2 h-10 w-full border border-border bg-background px-2 text-sm">
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </>
            )}
            {action === 'site-transactions' && (
              <>
                <div className="rounded-none border border-border bg-muted/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Transaction Kind</p>
                  <select value={siteKindFilter} onChange={(e) => setSiteKindFilter(e.target.value)} className="mt-2 h-10 w-full border border-border bg-background px-2 text-sm">
                    <option value="">All</option>
                    {siteKindOptions.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-none border border-border bg-muted/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Direction</p>
                  <select value={siteDirectionFilter} onChange={(e) => setSiteDirectionFilter(e.target.value)} className="mt-2 h-10 w-full border border-border bg-background px-2 text-sm">
                    <option value="">All</option>
                    <option value="IN">Inflow (IN)</option>
                    <option value="OUT">Outflow (OUT)</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setEmployeeTypeFilter('');
              setEmployeeStatusFilter('');
              setSiteKindFilter('');
              setSiteDirectionFilter('');
            }}>
              Reset
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
