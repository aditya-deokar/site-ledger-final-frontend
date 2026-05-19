'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, Eye, Loader2, MoreHorizontal, Pencil, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  DashboardEmptyState,
  DashboardField,
  DashboardFilterBar,
  DashboardPage,
  DashboardPageHeader,
  DashboardStatCard,
  DashboardStatsGrid,
  DashboardStatusBadge,
} from '@/components/dashboard/dashboard-primitives';
import { cn } from '@/lib/utils';
import {
  useCreateVendor,
  usePatchVendorStatus,
  useUpdateVendor,
  useVendors,
} from '@/hooks/api/vendor.hooks';
import { useSites } from '@/hooks/api/site.hooks';
import {
  createVendorSchema,
  type CreateVendorInput,
  type Vendor,
  type VendorListQuery,
  type VendorStatus,
} from '@/schemas/vendor.schema';
import { buildVendorWorkspacePath } from '@/lib/vendor-workspace';

function formatINR(value: number) {
  return `Rs. ${value.toLocaleString('en-IN')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function statusTone(status: VendorStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
    case 'INACTIVE':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-700';
    case 'BLOCKED':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
    case 'ARCHIVED':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-700';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

function formatCategoryLabel(value?: string | null) {
  if (!value) return '-';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'suplier') return 'Supplier';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function SummaryCard({
  label,
  value,
  helper,
  tone = 'default',
  onClick,
}: {
  label: string;
  value: string;
  helper: string;
  tone?: 'default' | 'warning';
  onClick?: () => void;
}) {
  return (
    <DashboardStatCard
      label={label}
      value={value}
      description={helper}
      tone={tone === 'warning' ? 'warning' : 'default'}
      onClick={onClick}
      className={tone === 'warning' ? 'bg-amber-50/60 dark:bg-amber-500/10' : 'bg-muted/20'}
    />
  );
}

function VendorEditorDialog({
  vendor,
  open,
  onOpenChange,
}: {
  vendor?: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!vendor;
  const { mutate: createVendor, isPending: isCreating } = useCreateVendor({
    onSuccess: () => {
      toast.success('Vendor created');
      onOpenChange(false);
    },
  });
  const { mutate: updateVendor, isPending: isUpdating } = useUpdateVendor({
    onSuccess: () => {
      toast.success('Vendor updated');
      onOpenChange(false);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateVendorInput>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      name: '',
      type: '',
      contactPersonName: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      pan: '',
      bankAccountName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      paymentTermsDays: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;

    reset({
      name: vendor?.name || '',
      type: vendor?.type || '',
      status: vendor?.status,
      contactPersonName: vendor?.contactPersonName || '',
      phone: vendor?.phone || '',
      email: vendor?.email || '',
      address: vendor?.address || '',
      gstin: vendor?.gstin || '',
      pan: vendor?.pan || '',
      bankAccountName: vendor?.bankAccountName || '',
      bankName: vendor?.bankName || '',
      accountNumber: vendor?.accountNumber || '',
      ifscCode: vendor?.ifscCode || '',
      upiId: vendor?.upiId || '',
      paymentTermsDays: vendor?.paymentTermsDays ?? undefined,
      notes: vendor?.notes || '',
    });
  }, [open, reset, vendor]);

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl rounded-none border-border p-0">
        <DialogHeader>
          <div className="border-b border-border px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/55">Vendor Profile</p>
            <DialogTitle className="mt-2 text-2xl font-serif tracking-tight">
              {isEditing ? `Edit ${vendor?.name}` : 'Add Vendor'}
            </DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep supplier details concise and searchable for bills, payouts, and reconciliation.
            </p>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => {
            if (isEditing && vendor) {
              updateVendor({ id: vendor.id, data });
            } else {
              createVendor(data);
            }
          })}
          className="space-y-5 px-6 pb-6"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <DashboardField label="Vendor Name" error={errors.name?.message}>
              <Input {...register('name')} className="h-10" />
            </DashboardField>
            <DashboardField label="Category" error={errors.type?.message}>
              <Input {...register('type')} className="h-10" placeholder="Supplier, Electrical, Materials" />
            </DashboardField>
            <DashboardField label="Contact Person">
              <Input {...register('contactPersonName')} className="h-10" />
            </DashboardField>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DashboardField label="Phone">
              <Input {...register('phone')} className="h-10" />
            </DashboardField>
            <DashboardField label="Email" error={errors.email?.message}>
              <Input {...register('email')} className="h-10" />
            </DashboardField>
            <DashboardField label="Payment Terms (days)">
              <Input
                type="number"
                min={0}
                className="h-10"
                {...register('paymentTermsDays', {
                  setValueAs: (value) => (value === '' ? undefined : Number(value)),
                })}
              />
            </DashboardField>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DashboardField label="GSTIN">
              <Input {...register('gstin')} className="h-10" />
            </DashboardField>
            <DashboardField label="PAN">
              <Input {...register('pan')} className="h-10" />
            </DashboardField>
            <DashboardField label="UPI ID">
              <Input {...register('upiId')} className="h-10" />
            </DashboardField>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DashboardField label="Bank Name">
              <Input {...register('bankName')} className="h-10" />
            </DashboardField>
            <DashboardField label="Account Number">
              <Input {...register('accountNumber')} className="h-10" />
            </DashboardField>
            <DashboardField label="IFSC Code">
              <Input {...register('ifscCode')} className="h-10" />
            </DashboardField>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardField label="Address">
              <Textarea {...register('address')} className="min-h-20" />
            </DashboardField>
            <DashboardField label="Notes">
              <Textarea {...register('notes')} className="min-h-20" />
            </DashboardField>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" size="control" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="control" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? 'Save Vendor' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'ALL'>('ALL');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [outstandingFilter, setOutstandingFilter] = useState<'ALL' | 'OUTSTANDING_ONLY' | 'CLEAR_ONLY'>('ALL');
  const [documentFilter, setDocumentFilter] = useState<'ALL' | 'HAS_DOCS' | 'MISSING_DOCS'>('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editorVendor, setEditorVendor] = useState<Vendor | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const query: VendorListQuery = {
    search: search.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    siteId: siteFilter === 'ALL' ? undefined : siteFilter,
    hasOutstanding: outstandingFilter === 'ALL' ? undefined : outstandingFilter === 'OUTSTANDING_ONLY',
    hasDocuments: documentFilter === 'ALL' ? undefined : documentFilter === 'HAS_DOCS',
    includeArchived,
    page: 1,
    size: 100,
  };

  const { data: vendorsData, isLoading } = useVendors(query);
  const { data: sitesData } = useSites();
  const { mutate: patchVendorStatus, isPending: isPatchingStatus } = usePatchVendorStatus({
    onSuccess: () => toast.success('Vendor status updated'),
  });

  const vendors = vendorsData?.data?.vendors ?? [];
  const sites = sitesData?.data?.sites ?? [];

  const categoryOptions = useMemo(
    () => Array.from(new Set(vendors.map((vendor) => vendor.type).filter(Boolean))).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })),
    [vendors],
  );

  const totalOutstanding = vendors.reduce((sum, vendor) => sum + vendor.totalOutstanding, 0);
  const overdueVendors = vendors.filter((vendor) => vendor.overdueBillCount > 0).length;
  const assignedVendors = vendors.filter((vendor) => vendor.siteCount > 0).length;
  const activeVendors = vendors.filter((vendor) => vendor.status === 'ACTIVE').length;
  const documentGaps = vendors.filter((vendor) => vendor.documentCount === 0).length;
  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    siteFilter !== 'ALL' ||
    outstandingFilter !== 'ALL' ||
    documentFilter !== 'ALL' ||
    includeArchived;

  function resetFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setSiteFilter('ALL');
    setOutstandingFilter('ALL');
    setDocumentFilter('ALL');
    setIncludeArchived(false);
  }

  return (
    <DashboardPage className="space-y-4 px-3 py-4 lg:px-6">
      <DashboardPageHeader
        eyebrow="Vendor Management"
        title="Company-wide vendor cockpit"
        subtitle="Manage vendor profiles, site assignments, bills, payments, receipts, documents, and due tracking in one place."
        action={(
          <Button
            type="button"
            size="cta"
            onClick={() => {
              setEditorVendor(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        )}
      />

      <DashboardStatsGrid className="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total Vendors" value={String(vendors.length)} helper="Current filtered vendor count" onClick={resetFilters} />
        <SummaryCard label="Active Vendors" value={String(activeVendors)} helper="Ready for new bills" onClick={() => setStatusFilter('ACTIVE')} />
        <SummaryCard label="Assigned Vendors" value={String(assignedVendors)} helper="Mapped to one or more sites" onClick={() => setSiteFilter('ALL')} />
        <SummaryCard
          label="Outstanding"
          value={formatINR(totalOutstanding)}
          helper="Open due across filtered vendors"
          tone={totalOutstanding > 0 ? 'warning' : 'default'}
          onClick={() => setOutstandingFilter('OUTSTANDING_ONLY')}
        />
        <SummaryCard
          label="Overdue Vendors"
          value={String(overdueVendors)}
          helper="Have at least one overdue bill"
          tone={overdueVendors > 0 ? 'warning' : 'default'}
          onClick={() => setOutstandingFilter('OUTSTANDING_ONLY')}
        />
        <SummaryCard
          label="Document Gaps"
          value={String(documentGaps)}
          helper="No KYC or invoice documents yet"
          tone={documentGaps > 0 ? 'warning' : 'default'}
          onClick={() => setDocumentFilter('MISSING_DOCS')}
        />
      </DashboardStatsGrid>

      <DashboardFilterBar
        title="Find and Filter Vendors"
        action={hasActiveFilters ? (
          <Button type="button" size="control" variant="outline" onClick={resetFilters}>
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        ) : undefined}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_13rem_13rem]">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 rounded-none pl-9"
                placeholder="Search vendor, category, contact, tax details"
              />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</Label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as VendorStatus | 'ALL')} className="h-10 w-full border border-border bg-background px-3 text-sm text-foreground">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Assigned Site</Label>
          <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)} className="h-10 w-full border border-border bg-background px-3 text-sm text-foreground">
            <option value="ALL">All sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Billing and Documents</Label>
            <div className="grid grid-cols-2 gap-2">
            <select value={outstandingFilter} onChange={(event) => setOutstandingFilter(event.target.value as typeof outstandingFilter)} className="h-10 border border-border bg-background px-3 text-sm text-foreground">
              <option value="ALL">All dues</option>
              <option value="OUTSTANDING_ONLY">Outstanding</option>
              <option value="CLEAR_ONLY">Cleared</option>
            </select>
            <select value={documentFilter} onChange={(event) => setDocumentFilter(event.target.value as typeof documentFilter)} className="h-10 border border-border bg-background px-3 text-sm text-foreground">
              <option value="ALL">All docs</option>
              <option value="HAS_DOCS">Has docs</option>
              <option value="MISSING_DOCS">Missing docs</option>
            </select>
          </div>
        </div>
          <div className="flex items-end justify-start lg:justify-end">
          <label className="flex h-9 items-center gap-3 border border-border px-3 text-sm text-foreground">
            <Checkbox checked={includeArchived} onCheckedChange={(checked) => setIncludeArchived(Boolean(checked))} aria-label="Include archived vendors" />
            Include archived
          </label>
        </div>
      </div>
      </DashboardFilterBar>

      <div className="flex flex-wrap gap-2">
        {categoryOptions.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSearch(category)}
            className={cn(
              'border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
              search.trim().toLowerCase() === category.toLowerCase()
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="overflow-hidden border border-border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] tracking-[0.18em]">Vendor</TableHead>
              <TableHead className="text-[11px] tracking-[0.18em]">Category</TableHead>
              <TableHead className="text-[11px] tracking-[0.18em]">Status</TableHead>
              <TableHead className="text-[11px] tracking-[0.18em]">Contact</TableHead>
              <TableHead className="text-[11px] tracking-[0.18em]">Sites</TableHead>
              <TableHead className="text-[11px] tracking-[0.18em]">Outstanding</TableHead>
              <TableHead className="text-[11px] tracking-[0.18em]">Overdue</TableHead>
              <TableHead className="text-[11px] tracking-[0.18em]">Last Payment</TableHead>
              <TableHead className="text-right text-[11px] tracking-[0.18em]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16 text-center text-muted-foreground">
                  <div className="inline-flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading vendors...
                  </div>
                </TableCell>
              </TableRow>
            ) : vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-0">
                  <DashboardEmptyState
                    className="border-0 py-16"
                    description="No vendors matched the current filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id} className="h-16">
                  <TableCell className="text-sm">
                    <div>
                      <p className="text-[15px] font-semibold text-foreground">{vendor.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-muted-foreground">{formatCategoryLabel(vendor.type)}</TableCell>
                  <TableCell className="text-sm">
                    <DashboardStatusBadge className={cn('text-[9px] tracking-widest', statusTone(vendor.status))}>
                      {vendor.status}
                    </DashboardStatusBadge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{vendor.phone || vendor.email || '-'}</TableCell>
                  <TableCell className="text-sm">{vendor.siteCount}</TableCell>
                  <TableCell className={cn('text-sm', vendor.totalOutstanding > 0 ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-700')}>
                    {formatINR(vendor.totalOutstanding)}
                  </TableCell>
                  <TableCell className="text-sm">{vendor.overdueBillCount}</TableCell>
                  <TableCell className="text-sm">
                    <div className="space-y-1">
                      <p>{formatDate(vendor.lastPaymentDate)}</p>
                      {vendor.lastPaymentDate ? (
                        <p className="text-xs text-muted-foreground">
                          {Math.max(
                            0,
                            Math.floor(
                              (Date.now() - new Date(vendor.lastPaymentDate).getTime()) /
                                (1000 * 60 * 60 * 24),
                            ),
                          )}{' '}
                          days ago
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="control" variant="outline" onClick={() => router.push(buildVendorWorkspacePath(vendor.id))}>
                        <Eye className="h-4 w-4" />
                        Open
                      </Button>
                      <Button type="button" size="control" variant="outline" onClick={() => { setEditorVendor(vendor); setEditorOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button type="button" size="icon-control" variant="outline" aria-label={`More actions for ${vendor.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-none">
                          <DropdownMenuItem onClick={() => router.push(buildVendorWorkspacePath(vendor.id))}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditorVendor(vendor); setEditorOpen(true); }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Vendor
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isPatchingStatus}
                            variant="destructive"
                            onClick={() => patchVendorStatus({ id: vendor.id, status: vendor.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' })}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            {vendor.status === 'ARCHIVED' ? 'Restore Vendor' : 'Archive Vendor'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <VendorEditorDialog vendor={editorVendor} open={editorOpen} onOpenChange={setEditorOpen} />
    </DashboardPage>
  );
}
