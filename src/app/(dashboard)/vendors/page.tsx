'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, Eye, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { VendorProfile } from '@/components/dashboard/vendor-profile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
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

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="border border-border bg-muted/20 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</p>
      <p className="mt-2 text-3xl font-serif text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
    </div>
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
      openingBalanceAmount: 0,
      openingBalanceDate: '',
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
      openingBalanceAmount: vendor?.openingBalanceAmount ?? 0,
      openingBalanceDate: vendor?.openingBalanceDate ? vendor.openingBalanceDate.slice(0, 10) : '',
    });
  }, [open, reset, vendor]);

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit Vendor: ${vendor?.name}` : 'Add Vendor'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => {
            const payload = {
              ...data,
              openingBalanceDate: data.openingBalanceDate ? `${data.openingBalanceDate}T00:00:00.000Z` : '',
            };

            if (isEditing && vendor) {
              updateVendor({ id: vendor.id, data: payload });
            } else {
              createVendor(payload);
            }
          })}
          className="space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Vendor Name</Label>
              <Input {...register('name')} className="rounded-none" />
              {errors.name && <p className="text-sm text-rose-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input {...register('type')} className="rounded-none" placeholder="Free text category" />
              {errors.type && <p className="text-sm text-rose-600">{errors.type.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input {...register('contactPersonName')} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register('phone')} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input {...register('email')} className="rounded-none" />
              {errors.email && <p className="text-sm text-rose-600">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea {...register('address')} className="min-h-24 rounded-none" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input {...register('gstin')} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label>PAN</Label>
              <Input {...register('pan')} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms (days)</Label>
              <Input
                type="number"
                min={0}
                className="rounded-none"
                {...register('paymentTermsDays', {
                  setValueAs: (value) => (value === '' ? undefined : Number(value)),
                })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="rounded-none"
                {...register('openingBalanceAmount', {
                  setValueAs: (value) => (value === '' ? 0 : Number(value)),
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Opening Balance Date</Label>
              <Input type="date" {...register('openingBalanceDate')} className="rounded-none" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input {...register('bankName')} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label>Bank Account Name</Label>
              <Input {...register('bankAccountName')} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input {...register('accountNumber')} className="rounded-none" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>IFSC Code</Label>
              <Input {...register('ifscCode')} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label>UPI ID</Label>
              <Input {...register('upiId')} className="rounded-none" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...register('notes')} className="min-h-24 rounded-none" />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-none" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-none" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? 'Save Vendor' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'ALL'>('ALL');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [outstandingFilter, setOutstandingFilter] = useState<'ALL' | 'OUTSTANDING_ONLY' | 'CLEAR_ONLY'>('ALL');
  const [documentFilter, setDocumentFilter] = useState<'ALL' | 'HAS_DOCS' | 'MISSING_DOCS'>('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editorVendor, setEditorVendor] = useState<Vendor | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [profileVendor, setProfileVendor] = useState<Vendor | null>(null);

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

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-primary">Vendor Management</p>
          <h1 className="mt-2 text-4xl font-serif text-foreground">Company-wide vendor cockpit</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Manage vendor profiles, site assignments, bills, payments, receipts, documents, and due tracking in one place.
          </p>
        </div>
        <Button
          type="button"
          className="h-11 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest"
          onClick={() => {
            setEditorVendor(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Total Vendors" value={String(vendors.length)} helper="Current filtered vendor count" />
        <SummaryCard label="Active Vendors" value={String(activeVendors)} helper="Ready for new bills" />
        <SummaryCard label="Assigned Vendors" value={String(assignedVendors)} helper="Mapped to one or more sites" />
        <SummaryCard label="Outstanding" value={formatINR(totalOutstanding)} helper="Open due across filtered vendors" />
        <SummaryCard label="Overdue Vendors" value={String(overdueVendors)} helper="Have at least one overdue bill" />
        <SummaryCard label="Document Gaps" value={String(documentGaps)} helper="No KYC or invoice documents yet" />
      </div>

      <div className="grid gap-4 border border-border bg-card p-4 lg:grid-cols-[minmax(0,1.5fr)_13rem_13rem_13rem_auto]">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-none pl-9"
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

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Filters</Label>
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

        <div className="flex items-end justify-end">
          <label className="flex items-center gap-3 border border-border px-4 py-2 text-sm text-foreground">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
            Include archived
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categoryOptions.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSearch(category)}
            className="border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {category}
          </button>
        ))}
      </div>

      <div className="overflow-hidden border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Sites</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Overdue</TableHead>
              <TableHead>Last Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell colSpan={9} className="py-16 text-center text-muted-foreground">
                  No vendors matched the current filters.
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground">{vendor.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{vendor.contactPersonName || vendor.phone || vendor.email || 'No contact details'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">{vendor.type}</TableCell>
                  <TableCell>
                    <span className={cn('border px-2 py-1 text-[9px] font-bold uppercase tracking-widest', statusTone(vendor.status))}>
                      {vendor.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{vendor.phone || vendor.email || '-'}</TableCell>
                  <TableCell>{vendor.siteCount}</TableCell>
                  <TableCell className={vendor.totalOutstanding > 0 ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-700'}>
                    {formatINR(vendor.totalOutstanding)}
                  </TableCell>
                  <TableCell>{vendor.overdueBillCount}</TableCell>
                  <TableCell>{formatDate(vendor.lastPaymentDate)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" className="h-9 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest" onClick={() => setProfileVendor(vendor)}>
                        <Eye className="mr-1 h-4 w-4" />
                        Open
                      </Button>
                      <Button type="button" variant="outline" className="h-9 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest" onClick={() => { setEditorVendor(vendor); setEditorOpen(true); }}>
                        <Pencil className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPatchingStatus}
                        className="h-9 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest"
                        onClick={() => patchVendorStatus({ id: vendor.id, status: vendor.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' })}
                      >
                        <Archive className="mr-1 h-4 w-4" />
                        {vendor.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <VendorEditorDialog vendor={editorVendor} open={editorOpen} onOpenChange={setEditorOpen} />

      {profileVendor && (
        <VendorProfile
          vendorId={profileVendor.id}
          vendorName={profileVendor.name}
          onClose={() => setProfileVendor(null)}
        />
      )}
    </div>
  );
}
