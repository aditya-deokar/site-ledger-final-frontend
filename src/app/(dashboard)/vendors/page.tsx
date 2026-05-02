'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/api/vendor.hooks';
import { createVendorSchema, CreateVendorInput, Vendor } from '@/schemas/vendor.schema';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportElementToPdf } from '@/lib/pdf-export';
import { vendorService } from '@/services/vendor.service';
import { siteService } from '@/services/site.service';
import type { VendorStatementEntry } from '@/schemas/vendor.schema';
import { RecordPaymentModal } from '@/components/dashboard/record-payment-modal';
import {
  Loader2, Plus, Phone, Mail, Pencil, Trash2, Users, ArrowRight, X, Search, Eye, Filter, Download, FileSpreadsheet, FileText, ArrowUpDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/dashboard/navigator/form-primitives';
import { toast } from 'sonner';

function VendorsListSkeleton() {
  return (
    <div className="border border-border divide-y divide-border">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 lg:p-6 flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="hidden lg:flex flex-[2] gap-12">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

const MATERIAL_SUPPLIER_LABEL = 'Material Supplier';

const normalizeVendorType = (type: string) => {
  const normalizedType = type.trim();
  const normalizedKey = normalizedType.toLowerCase().replace(/\s+/g, ' ');

  if (normalizedKey === 'material supplier' || normalizedKey === 'material suppliers') {
    return MATERIAL_SUPPLIER_LABEL;
  }

  return normalizedType;
};

const getVendorDisplayId = (vendorId: string) => vendorId.slice(-8).toUpperCase();
const vendorInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

const vendorAvatarColor = (name: string) => {
  const palette = [
    'bg-emerald-600',
    'bg-teal-600',
    'bg-cyan-600',
    'bg-orange-500',
    'bg-blue-600',
    'bg-violet-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash << 5) - hash + name.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length];
};

const COMMON_VENDOR_TYPES = ['MATERIALS', 'LABOR', 'CONTRACTOR', 'TRANSPORT', 'ELECTRICAL', 'PLUMBING', 'MASONRY', 'CARPENTRY'];

function buildVendorTypeOptions(vendors: Vendor[]) {
  const types = new Map<string, string>();
  COMMON_VENDOR_TYPES.forEach((type) => types.set(type.toLowerCase(), type));
  vendors.forEach((vendor) => {
    const type = normalizeVendorType(vendor.type);
    if (type) types.set(type.toLowerCase(), type);
  });

  return Array.from(types.values())
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((type) => ({ value: type, label: type }));
}

// â”€â”€ Vendor Form (shared by add & edit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function VendorForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
  vendorTypeOptions,
}: {
  defaultValues?: Partial<CreateVendorInput>;
  onSubmit: (data: CreateVendorInput) => void;
  isPending: boolean;
  submitLabel: string;
  vendorTypeOptions: Array<{ value: string; label: string }>;
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateVendorInput>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      name: '',
      type: '',
      phone: '',
      email: '',
      ...defaultValues,
    },
  });
  const vendorType = watch('type') || '';

  return (
    <>
      <div className="flex-1 overflow-y-auto px-10 pb-10 flex flex-col gap-10">
        <form id="vendor-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 mt-4">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Vendor Name</Label>
            <Input placeholder="Enter vendor name" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('name')} />
            {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Vendor Type</Label>
            <input type="hidden" {...register('type')} />
            <SearchableSelect
              options={vendorTypeOptions}
              value={vendorType}
              onValueChange={(value) => setValue('type', value, { shouldValidate: true })}
              placeholder="Select or type vendor type..."
              searchPlaceholder="Search or create vendor type..."
              emptyText="Type a new vendor type."
              allowCustom
            />
            <p className="text-[10px] text-muted-foreground/60">Reuse an existing type or type a new one.</p>
            {errors.type && <p className="text-[10px] text-destructive">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Phone</Label>
              <Input placeholder="+91" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('phone')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Email</Label>
              <Input placeholder="vendor@email.com" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" {...register('email')} />
              {errors.email && <p className="text-[10px] text-destructive">{errors.email.message}</p>}
            </div>
          </div>
        </form>
      </div>

      <div className="p-10 pt-6 border-t border-border flex items-center justify-between gap-6">
        <SheetClose className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-all px-4 py-2 text-foreground">
          Cancel
        </SheetClose>
        <Button form="vendor-form" type="submit" disabled={isPending} className="h-14 flex-1 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-primary/90 rounded-none gap-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>{submitLabel}</span><ArrowRight className="w-4 h-4" /></>}
        </Button>
      </div>
    </>
  );
}


// â”€â”€ Delete Confirm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DeleteConfirm({
  vendor,
  onClose,
}: {
  vendor: Vendor;
  onClose: () => void;
}) {
  const { mutate: deleteVendor, isPending } = useDeleteVendor({ onSuccess: onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border border-border p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-serif text-foreground mb-2">Remove Vendor</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Are you sure you want to remove <strong>{vendor.name}</strong>? Existing expense records linked to this vendor will retain their data.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => deleteVendor(vendor.id)}
            disabled={isPending}
            variant="destructive"
            className="flex-1 h-11 rounded-none font-bold tracking-widest uppercase text-[10px]"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="h-11 rounded-none font-bold tracking-widest uppercase text-[10px] px-6"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

type VendorHistoryRow = VendorStatementEntry & {
  vendorId: string;
  vendorName: string;
  vendorType: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  transactionKind: 'BILL_ADDED' | 'PAYMENT_MADE';
  amount: number;
};

type DatePreset = 'ALL' | 'TODAY' | '7D' | '30D' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

function formatINR(value: number) {
  return `\u20B9${Math.abs(value).toLocaleString('en-IN')}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function getDateBounds(preset: DatePreset, from?: string, to?: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (preset === 'TODAY') return { from: startOfToday, to: endOfToday };
  if (preset === '7D') return { from: new Date(now.getTime() - 6 * 86400000), to: endOfToday };
  if (preset === '30D') return { from: new Date(now.getTime() - 29 * 86400000), to: endOfToday };
  if (preset === 'THIS_MONTH') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfToday };
  if (preset === 'LAST_MONTH') {
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from: fromDate, to: toDate };
  }
  if (preset === 'CUSTOM' && from && to) return { from: new Date(from), to: new Date(`${to}T23:59:59`) };
  return null;
}

function VendorsHistoryView({
  vendors,
  initialVendorId,
  onBack,
}: {
  vendors: Vendor[];
  initialVendorId?: string | null;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const exportRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(initialVendorId ? [initialVendorId] : []);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedKinds, setSelectedKinds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [referencePresence, setReferencePresence] = useState<'ALL' | 'HAS_REF' | 'MISSING_REF'>('ALL');
  const [sortKey, setSortKey] = useState<'date' | 'vendor' | 'site' | 'kind' | 'amount' | 'status'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [isPdfing, setIsPdfing] = useState(false);
  const [payRow, setPayRow] = useState<VendorHistoryRow | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const statementQueries = useQueries({
    queries: vendors.map((vendor) => ({
      queryKey: ['vendor-statement', vendor.id],
      queryFn: () => vendorService.getVendorStatement(vendor.id),
      enabled: Boolean(vendor.id),
      retry: false,
    })),
  });

  const loading = statementQueries.some((q) => q.isLoading);

  const rows = useMemo<VendorHistoryRow[]>(() => {
    const now = Date.now();
    return vendors.flatMap((vendor, index) => {
      const statement = statementQueries[index]?.data?.data?.statement ?? [];
      return statement.map((entry) => {
        const outstanding = Math.max(entry.balance, 0);
        const status: VendorHistoryRow['paymentStatus'] =
          entry.entryType === 'PAYMENT'
            ? 'PAID'
            : outstanding <= 0
            ? 'PAID'
            : outstanding < Math.max(entry.billAmount, 0)
              ? 'PARTIAL'
              : new Date(entry.date).getTime() < now - 86400000
                ? 'OVERDUE'
                : 'PENDING';
        return {
          ...entry,
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorType: normalizeVendorType(vendor.type),
          paymentStatus: status,
          transactionKind: entry.entryType === 'BILL' ? 'BILL_ADDED' : 'PAYMENT_MADE',
          amount: entry.entryType === 'BILL' ? entry.billAmount : entry.paymentAmount,
        };
      });
    });
  }, [vendors, statementQueries]);

  const sites = useMemo(() => Array.from(new Set(rows.map((row) => row.siteName).filter(Boolean))) as string[], [rows]);
  const vendorTypes = useMemo(() => Array.from(new Set(vendors.map((v) => normalizeVendorType(v.type)))), [vendors]);

  const filtered = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    const dateRange = getDateBounds(datePreset, customFrom, customTo);
    const min = minAmount ? Number(minAmount) : undefined;
    const max = maxAmount ? Number(maxAmount) : undefined;

    return rows.filter((row) => {
      if (selectedVendorIds.length && !selectedVendorIds.includes(row.vendorId)) return false;
      if (selectedSites.length && !selectedSites.includes(row.siteName || '')) return false;
      if (selectedTypes.length && !selectedTypes.includes(row.vendorType)) return false;
      if (selectedKinds.length && !selectedKinds.includes(row.transactionKind)) return false;
      if (selectedStatuses.length && !selectedStatuses.includes(row.paymentStatus)) return false;
      if (referencePresence === 'HAS_REF' && !row.referenceId) return false;
      if (referencePresence === 'MISSING_REF' && row.referenceId) return false;
      if (min !== undefined && row.amount < min) return false;
      if (max !== undefined && row.amount > max) return false;
      if (dateRange) {
        const date = new Date(row.date);
        if (date < dateRange.from || date > dateRange.to) return false;
      }
      if (!searchText) return true;
      const searchable = [
        row.vendorName,
        row.vendorType,
        row.siteName,
        row.description,
        row.reason,
        row.note,
        row.referenceId,
        row.transactionKind,
        row.paymentStatus,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(searchText);
    });
  }, [rows, search, selectedVendorIds, selectedSites, selectedTypes, selectedKinds, selectedStatuses, datePreset, customFrom, customTo, minAmount, maxAmount, referencePresence]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      const factor = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * factor;
      if (sortKey === 'amount') return (a.amount - b.amount) * factor;
      if (sortKey === 'vendor') return a.vendorName.localeCompare(b.vendorName) * factor;
      if (sortKey === 'site') return (a.siteName || '').localeCompare(b.siteName || '') * factor;
      if (sortKey === 'kind') return a.transactionKind.localeCompare(b.transactionKind) * factor;
      return a.paymentStatus.localeCompare(b.paymentStatus) * factor;
    });
    return data;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((prev) => prev === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const handleExcelDownload = () => {
    if (!sorted.length) return toast.error('No rows to export.');
    const header = ['Date', 'Vendor', 'Site', 'Category/Type', 'Kind', 'Amount', 'Status', 'Reference', 'Description'];
    const body = sorted.map((row) => [
      formatDate(row.date),
      row.vendorName,
      row.siteName || '-',
      row.vendorType,
      row.transactionKind.replaceAll('_', ' '),
      row.amount,
      row.paymentStatus,
      row.referenceId || '-',
      row.description || row.reason || row.note || '-',
    ]);
    const html = `<table><thead><tr>${header.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${String(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor-transaction-history.xls';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Excel export downloaded.');
  };

  const handlePdfDownload = async () => {
    if (!exportRef.current) return toast.error('Nothing to export.');
    setIsPdfing(true);
    try {
      await exportElementToPdf(exportRef.current, 'vendor-transaction-history.pdf');
      toast.success('PDF export downloaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export PDF.');
    } finally {
      setIsPdfing(false);
    }
  };

  const handleRecordPayment = async (payment: { amount: number; note?: string }) => {
    if (!payRow?.siteId || !payRow?.expenseId) {
      toast.error('This bill is missing a linked site/expense id, so payment cannot be recorded.');
      return;
    }
    const targetRow = payRow;
    setIsPaying(true);
    try {
      await siteService.updateExpensePayment(targetRow.siteId!, targetRow.expenseId!, {
        amount: payment.amount,
        note: payment.note,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vendor-statement', targetRow.vendorId] }),
        queryClient.invalidateQueries({ queryKey: ['vendors'] }),
        queryClient.invalidateQueries({ queryKey: ['vendorStatement'] }),
      ]);
      await queryClient.refetchQueries({ queryKey: ['vendor-statement', targetRow.vendorId], type: 'active' });
      setPayRow(null);
      toast.success('Payment recorded successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record payment.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 hover:text-foreground">
          Back
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExcelDownload} className="h-10 rounded-none text-[10px] font-bold uppercase tracking-[0.2em]">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={() => void handlePdfDownload()} disabled={isPdfing} className="h-10 rounded-none text-[10px] font-bold uppercase tracking-[0.2em]">
            {isPdfing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} PDF
          </Button>
        </div>
      </div>

      <div ref={exportRef} className="overflow-hidden border border-border bg-background">
        <div className="border-b border-border bg-background px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-serif text-foreground">Vendor Transaction History</h2>
              <p className="mt-1 text-sm text-muted-foreground">{sorted.length} entries found</p>
            </div>
            <div className="flex w-full gap-2 lg:w-auto">
              <div className="relative w-full lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, site, note, ref..." className="h-10 rounded-none border-border bg-background pl-10 text-sm" />
              </div>
              <Button variant="outline" onClick={() => setFilterOpen(true)} className="h-10 rounded-none px-3">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No transaction records found for selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full table-fixed border-collapse">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/60">
                  {[
                    ['date', 'Date'],
                    ['vendor', 'Vendor'],
                    ['site', 'Site'],
                    ['kind', 'Kind'],
                    ['amount', 'Amount'],
                    ['status', 'Status'],
                  ].map(([key, label]) => (
                    <TableHead key={key} className="h-12 border-r border-border px-4 last:border-r-0">
                      <button type="button" onClick={() => toggleSort(key as any)} className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
                        {label} <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="h-12 w-[11%] px-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">Reference</TableHead>
                  <TableHead className="h-12 w-[16%] px-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row, idx) => (
                  <TableRow key={`${row.vendorId}-${row.referenceId}-${idx}`} className={cn('border-b border-border hover:bg-muted/20', idx % 2 === 0 ? 'bg-background' : 'bg-muted/10')}>
                    <TableCell className="border-r border-border px-4 py-3 text-xs">{formatDate(row.date)}</TableCell>
                    <TableCell className="border-r border-border px-4 py-3 text-xs font-semibold">{row.vendorName}</TableCell>
                    <TableCell className="border-r border-border px-4 py-3 text-xs">{row.siteName || '-'}</TableCell>
                    <TableCell className="border-r border-border px-4 py-3 text-xs">
                      <span className={cn(
                        'inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
                        row.transactionKind === 'BILL_ADDED'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                      )}>
                        {row.transactionKind.replaceAll('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className={cn(
                      'border-r border-border px-4 py-3 text-xs font-black tabular-nums',
                      row.transactionKind === 'BILL_ADDED' ? 'text-rose-700' : 'text-emerald-700',
                    )}>
                      {row.transactionKind === 'BILL_ADDED' ? '-' : '+'}{formatINR(row.amount)}
                    </TableCell>
                    <TableCell className="border-r border-border px-4 py-3 text-xs">
                      {row.entryType === 'BILL' && row.paymentStatus !== 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!row.siteId || !row.expenseId) {
                              toast.error('This bill is missing linked details. Please edit/create bill again.');
                              return;
                            }
                            setPayRow(row);
                          }}
                          className={cn(
                            'inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-bold transition-colors',
                            row.paymentStatus === 'PARTIAL'
                              ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'
                              : row.paymentStatus === 'OVERDUE'
                                ? 'border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20'
                                : 'border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20',
                          )}
                          title="View and record payment"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {row.paymentStatus}
                        </button>
                      ) : (
                        <span className={cn(
                          'border px-2 py-1 text-[10px] font-bold',
                          row.paymentStatus === 'PAID'
                            ? 'border-green-500/20 bg-green-500/10 text-green-600'
                            : row.paymentStatus === 'PARTIAL'
                              ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600'
                              : row.paymentStatus === 'OVERDUE'
                                ? 'border-red-500/20 bg-red-500/10 text-red-600'
                                : 'border-red-500/20 bg-red-500/10 text-red-600',
                        )}>
                          {row.paymentStatus}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="truncate px-4 py-3 text-xs">{row.referenceId || '-'}</TableCell>
                    <TableCell className="truncate px-4 py-3 text-xs text-muted-foreground">{row.description || row.reason || row.note || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-y-auto rounded-none">
          <DialogHeader><DialogTitle>Filter Vendor Transactions</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <FilterSection title="Vendor">
              <MultiSelectDropdownField values={vendors.map((v) => ({ value: v.id, label: v.name }))} selected={selectedVendorIds} onChange={setSelectedVendorIds} placeholder="Select vendor(s)" />
            </FilterSection>
            <FilterSection title="Site">
              <MultiSelectDropdownField values={sites.map((s) => ({ value: s, label: s }))} selected={selectedSites} onChange={setSelectedSites} placeholder="Select site(s)" />
            </FilterSection>
            <FilterSection title="Category / Type">
              <MultiSelectDropdownField values={vendorTypes.map((t) => ({ value: t, label: t }))} selected={selectedTypes} onChange={setSelectedTypes} placeholder="Select type(s)" />
            </FilterSection>
            <FilterSection title="Transaction Kind">
              <MultiSelectDropdownField values={[{ value: 'BILL_ADDED', label: 'Bill Added' }, { value: 'PAYMENT_MADE', label: 'Payment Made' }]} selected={selectedKinds} onChange={setSelectedKinds} placeholder="Select kind(s)" />
            </FilterSection>
            <FilterSection title="Payment Status">
              <MultiSelectDropdownField values={[{ value: 'PAID', label: 'Paid' }, { value: 'PARTIAL', label: 'Partial' }, { value: 'PENDING', label: 'Pending' }, { value: 'OVERDUE', label: 'Overdue' }]} selected={selectedStatuses} onChange={setSelectedStatuses} placeholder="Select status(es)" />
            </FilterSection>
            <FilterSection title="Date Range">
              <select value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} className="mt-1 h-10 w-full border border-border bg-background px-2 text-sm">
                <option value="ALL">All</option><option value="TODAY">Today</option><option value="7D">7d</option><option value="30D">30d</option><option value="THIS_MONTH">This Month</option><option value="LAST_MONTH">Last Month</option><option value="CUSTOM">Custom</option>
              </select>
              {datePreset === 'CUSTOM' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              )}
            </FilterSection>
            <FilterSection title="Amount Range">
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Min" />
                <Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Max" />
              </div>
            </FilterSection>
            <FilterSection title="Reference/Invoice Presence">
              <select value={referencePresence} onChange={(e) => setReferencePresence(e.target.value as any)} className="mt-1 h-10 w-full border border-border bg-background px-2 text-sm">
                <option value="ALL">All</option>
                <option value="HAS_REF">Has reference</option>
                <option value="MISSING_REF">Missing reference</option>
              </select>
            </FilterSection>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setSelectedVendorIds([]);
              setSelectedSites([]);
              setSelectedTypes([]);
              setSelectedKinds([]);
              setSelectedStatuses([]);
              setDatePreset('ALL');
              setCustomFrom('');
              setCustomTo('');
              setMinAmount('');
              setMaxAmount('');
              setReferencePresence('ALL');
            }}>Reset</Button>
            <Button onClick={() => setFilterOpen(false)}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      {payRow && (
        <RecordPaymentModal
          title={`Vendor: ${payRow.vendorName}`}
          totalAmount={Math.max(payRow.billAmount, 0)}
          currentlyPaid={Math.max(payRow.billAmount - Math.max(payRow.balance, 0), 0)}
          entityType="expense"
          entityId={payRow.expenseId}
          siteId={payRow.siteId || undefined}
          onSubmit={handleRecordPayment}
          onClose={() => setPayRow(null)}
          isPending={isPaying}
          contextNote={`${payRow.siteName || 'Site'} / ${payRow.description || payRow.reason || 'Vendor bill'}`}
        />
      )}
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-none border border-border bg-muted/10 p-3">
      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/70">{title}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function MultiSelectDropdownField({
  values,
  selected,
  onChange,
  placeholder = 'Select options...',
}: {
  values: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return values;
    return values.filter((option) => option.label.toLowerCase().includes(q));
  }, [query, values]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-10 w-full border border-border bg-background px-3 text-left text-sm text-foreground"
      >
        {selected.length ? `${selected.length} selected` : placeholder}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full border border-border bg-background shadow-xl">
          <div className="border-b border-border p-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="h-9 rounded-none border-border text-sm" />
          </div>
          <div className="max-h-52 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground">No options</p>
            ) : filtered.map((option) => (
              <label key={option.value} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...selected, option.value]);
                    else onChange(selected.filter((value) => value !== option.value));
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export default function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [listFilterOpen, setListFilterOpen] = useState(false);
  const [contactFilter, setContactFilter] = useState<'ALL' | 'HAS_PHONE' | 'HAS_EMAIL' | 'HAS_ANY' | 'NO_CONTACT'>('ALL');
  const { data, isLoading } = useVendors();
  const [addOpen, setAddOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyVendorId, setHistoryVendorId] = useState<string | null>(null);

  const handleSetType = useCallback((t: string | undefined) => setTypeFilter(t), []);
  const handleOpenAdd = useCallback(() => setAddOpen(true), []);
  const handleCloseAdd = useCallback(() => setAddOpen(false), []);
  const handleEdit = useCallback((v: Vendor) => setEditVendor(v), []);
  const handleCloseEdit = useCallback(() => setEditVendor(null), []);
  const handleDelete = useCallback((v: Vendor) => setDeleteVendor(v), []);

  const { mutate: create, isPending: creating } = useCreateVendor({ onSuccess: handleCloseAdd });
  const { mutate: update, isPending: updating } = useUpdateVendor({ onSuccess: handleCloseEdit });

  const allVendors = useMemo(() => data?.data?.vendors ?? [], [data]);
  const vendorTypeOptions = useMemo(() => buildVendorTypeOptions(allVendors), [allVendors]);

  const tabs = useMemo(() => {
    const uniqueTypes = Array.from(
      new Set(
        allVendors
          .map((vendor) => normalizeVendorType(vendor.type))
          .filter((type) => type.length > 0)
      )
    ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));

    return [
      { key: undefined, label: 'All' },
      ...uniqueTypes.map((type) => ({ key: type, label: type })),
    ];
  }, [allVendors]);

  const vendors = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return allVendors.filter((vendor) => {
      const matchesType = !typeFilter || normalizeVendorType(vendor.type) === typeFilter;

      if (!matchesType) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const displayId = getVendorDisplayId(vendor.id).toLowerCase();
      const hasPhone = Boolean(vendor.phone?.trim());
      const hasEmail = Boolean(vendor.email?.trim());
      if (contactFilter === 'HAS_PHONE' && !hasPhone) return false;
      if (contactFilter === 'HAS_EMAIL' && !hasEmail) return false;
      if (contactFilter === 'HAS_ANY' && !(hasPhone || hasEmail)) return false;
      if (contactFilter === 'NO_CONTACT' && (hasPhone || hasEmail)) return false;
      const searchableText = [
        vendor.name,
        vendor.id,
        displayId,
        vendor.type,
        vendor.phone,
        vendor.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    });
  }, [allVendors, searchQuery, typeFilter, contactFilter]);

  const hasActiveFilters = Boolean(typeFilter || searchQuery.trim());
  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-700">

        {!showHistory && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-4xl sm:text-5xl font-serif text-foreground tracking-tight">Vendors</h1>
                <p className="mt-2 text-base text-muted-foreground italic">
                  Manage your company-wide vendor registry.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end lg:w-auto">
                <Button
                  onClick={handleOpenAdd}
                  className="h-11 rounded-none px-5 text-sm font-semibold gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Add Vendor
                </Button>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by vendor name or ID"
                  className="h-11 rounded-none border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                    aria-label="Clear vendor search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button variant="outline" onClick={() => setListFilterOpen(true)} className="h-11 rounded-none px-3">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </div>
        )}

        <Dialog open={listFilterOpen} onOpenChange={setListFilterOpen}>
          <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-y-auto rounded-none">
            <DialogHeader><DialogTitle>Filter Vendors</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 gap-4">
              <FilterSection title="Vendor Type">
                <select
                  value={typeFilter ?? ''}
                  onChange={(e) => handleSetType(e.target.value || undefined)}
                  className="mt-1 h-10 w-full border border-border bg-background px-2 text-sm"
                >
                  <option value="">All</option>
                  {tabs.filter((t) => t.key).map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </FilterSection>
              <FilterSection title="Contact Presence">
                <select
                  value={contactFilter}
                  onChange={(e) => setContactFilter(e.target.value as 'ALL' | 'HAS_PHONE' | 'HAS_EMAIL' | 'HAS_ANY' | 'NO_CONTACT')}
                  className="mt-1 h-10 w-full border border-border bg-background px-2 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="HAS_PHONE">Has phone</option>
                  <option value="HAS_EMAIL">Has email</option>
                  <option value="HAS_ANY">Has any contact</option>
                  <option value="NO_CONTACT">No contact</option>
                </select>
              </FilterSection>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                handleSetType(undefined);
                setContactFilter('ALL');
              }}>
                Reset
              </Button>
              <Button onClick={() => setListFilterOpen(false)}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>

        {showHistory ? (
          <VendorsHistoryView
            vendors={allVendors}
            initialVendorId={historyVendorId}
            onBack={() => {
              setShowHistory(false);
              setHistoryVendorId(null);
            }}
          />
        ) : (
          <>
            {/* Type Tabs */}
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.key ?? 'all'}
                  onClick={() => handleSetType(t.key)}
                  className={cn(
                    'border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap rounded-none',
                    typeFilter === t.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {isLoading ? (
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-8" />
            </div>
            <VendorsListSkeleton />
          </div>
            ) : (
          <>
            {/* Vendor Count */}
            <div className="flex items-center gap-4">
              <Users className="w-5 h-5 text-muted-foreground/60" />
              <span className="text-sm font-medium text-muted-foreground">
                {hasActiveFilters ? 'Vendors found' : 'Vendors total'}
              </span>
              <span className="text-2xl sm:text-3xl font-sans font-bold text-foreground">{vendors.length}</span>
            </div>

            {/* Vendor List */}
            {vendors.length === 0 ? (
              <div className="border border-dashed border-border flex items-center justify-center py-20">
                <p className="text-sm text-muted-foreground italic">
                  {hasActiveFilters ? 'No vendors match your current filters.' : 'No vendors found.'}
                </p>
              </div>
            ) : (
          <div className="overflow-hidden border border-border divide-y divide-border text-left">
            {/* Table Header (Desktop) */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/40 text-left">
              <div className="col-span-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Vendor</div>
              <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Type</div>
              <div className="col-span-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Contact Details</div>
              <div className="col-span-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Actions</div>
            </div>

            {/* Rows */}
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="grid grid-cols-1 gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/20 sm:px-6 lg:grid-cols-12 lg:items-center"
              >
                {/* Name */}
                <div className="lg:col-span-4 flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center text-[11px] font-bold tracking-widest text-white',
                      vendorAvatarColor(vendor.name),
                    )}
                  >
                    {vendorInitials(vendor.name)}
                  </div>
                  <div className="min-w-0">
                    <button
                      onClick={() => {
                        setHistoryVendorId(vendor.id);
                        setShowHistory(true);
                      }}
                      className="truncate text-left font-serif text-base tracking-tight text-foreground hover:text-primary hover:underline"
                    >
                      {vendor.name}
                    </button>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {vendor.phone || vendor.email || getVendorDisplayId(vendor.id)}
                    </p>
                  </div>
                </div>

                {/* Type Badge */}
                <div className="lg:col-span-2">
                  <span className="inline-flex items-center border border-border bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {normalizeVendorType(vendor.type)}
                  </span>
                </div>

                {/* Contact */}
                <div className="lg:col-span-3 flex flex-col items-start gap-2 text-sm text-muted-foreground">
                  {vendor.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {vendor.phone}
                    </span>
                  )}
                  {vendor.email && (
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span className="truncate">{vendor.email}</span>
                    </span>
                  )}
                  {!vendor.phone && !vendor.email && (
                    <span className="italic text-muted-foreground/60">No contact info</span>
                  )}
                </div>

                {/* Actions */}
                <div className="lg:col-span-3 flex flex-wrap items-center justify-start gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="h-9 w-9 rounded-none border-border bg-background text-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setHistoryVendorId(vendor.id);
                      setShowHistory(true);
                    }}
                    title="Open Ledger"
                    aria-label={`Open ledger for ${vendor.name}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-9 w-9 rounded-none text-muted-foreground hover:bg-muted hover:text-primary"
                    onClick={() => handleEdit(vendor)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-9 w-9 rounded-none text-muted-foreground hover:bg-muted hover:text-destructive"
                    onClick={() => handleDelete(vendor)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )}
          </>
        )}
  </div>

      {/* Add Sheet */}
      {addOpen && (
        <Sheet open={addOpen} onOpenChange={() => setAddOpen(false)}>
          <SheetContent className="w-full sm:max-w-[500px] border-l border-border p-0 flex flex-col overflow-hidden bg-background">
            <SheetHeader className="p-10 pb-6 flex-row justify-start items-center space-y-0">
              <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">Add Vendor</SheetTitle>
            </SheetHeader>
            <VendorForm
              onSubmit={(data) => create({ ...data, email: data.email || undefined })}
              isPending={creating}
              submitLabel="Add Vendor"
              vendorTypeOptions={vendorTypeOptions}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Edit Sheet */}
      {editVendor && (
        <Sheet open={!!editVendor} onOpenChange={() => setEditVendor(null)}>
          <SheetContent className="w-full sm:max-w-[500px] border-l border-border p-0 flex flex-col overflow-hidden bg-background">
            <SheetHeader className="p-10 pb-6 flex-row justify-start items-center space-y-0">
              <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">Edit Vendor</SheetTitle>
            </SheetHeader>
            <VendorForm
              defaultValues={{
                name: editVendor.name,
                type: editVendor.type,
                phone: editVendor.phone ?? '',
                email: editVendor.email ?? '',
              }}
              onSubmit={(data) => update({ id: editVendor.id, data: { ...data, email: data.email || undefined } })}
              isPending={updating}
              submitLabel="Update Vendor"
              vendorTypeOptions={vendorTypeOptions}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Delete Confirm */}
      {deleteVendor && (
        <DeleteConfirm vendor={deleteVendor} onClose={() => setDeleteVendor(null)} />
      )}

    </>
  );
}
