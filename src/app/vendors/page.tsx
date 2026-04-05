'use client';

import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { VendorProfile } from '@/components/dashboard/vendor-profile';
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/api/vendor.hooks';
import { createVendorSchema, CreateVendorInput, Vendor } from '@/schemas/vendor.schema';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Loader2, Plus, Phone, Mail, Pencil, Trash2, Users, ArrowRight, X, Search, BookOpen
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

// ── Vendor Form (shared by add & edit) ──────────────
function VendorForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
}: {
  defaultValues?: Partial<CreateVendorInput>;
  onSubmit: (data: CreateVendorInput) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateVendorInput>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      name: '',
      type: '',
      phone: '',
      email: '',
      ...defaultValues,
    },
  });

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
            <Input
              placeholder="e.g. Electrician, Carpenter, Mason"
              className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground"
              {...register('type')}
            />
            <p className="text-[10px] text-muted-foreground/60">Enter any vendor type for your business</p>
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


// ── Delete Confirm ─────────────────────────────────
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


export default function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const { data, isLoading } = useVendors();
  const [addOpen, setAddOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);
  const [profileVendorId, setProfileVendorId] = useState<string | null>(null);

  const handleSetType = useCallback((t: string | undefined) => setTypeFilter(t), []);
  const handleOpenAdd = useCallback(() => setAddOpen(true), []);
  const handleCloseAdd = useCallback(() => setAddOpen(false), []);
  const handleEdit = useCallback((v: Vendor) => setEditVendor(v), []);
  const handleCloseEdit = useCallback(() => setEditVendor(null), []);
  const handleDelete = useCallback((v: Vendor) => setDeleteVendor(v), []);

  const { mutate: create, isPending: creating } = useCreateVendor({ onSuccess: handleCloseAdd });
  const { mutate: update, isPending: updating } = useUpdateVendor({ onSuccess: handleCloseEdit });

  const allVendors = useMemo(() => data?.data?.vendors ?? [], [data]);

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

      return (
        vendor.name.toLowerCase().includes(normalizedSearchQuery) ||
        vendor.id.toLowerCase().includes(normalizedSearchQuery) ||
        displayId.includes(normalizedSearchQuery)
      );
    });
  }, [allVendors, searchQuery, typeFilter]);

  const hasActiveFilters = Boolean(typeFilter || searchQuery.trim());
  const selectedVendor = useMemo(
    () => allVendors.find((vendor) => vendor.id === profileVendorId) ?? null,
    [allVendors, profileVendorId]
  );

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl font-serif text-foreground tracking-tight">Vendors</h1>
            <p className="mt-2 text-base text-muted-foreground italic">
              Manage your company-wide vendor registry.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by vendor name or ID"
                className="h-11 rounded-full border-slate-200 bg-background pl-10 pr-10 text-sm text-slate-700 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-slate-700"
                  aria-label="Clear vendor search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleOpenAdd}
              className="h-11 rounded-full px-5 text-sm font-semibold gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Vendor
            </Button>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key ?? 'all'}
              onClick={() => handleSetType(t.key)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                typeFilter === t.key
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-500 hover:bg-slate-100 hover:text-slate-900'
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
              <Users className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-500">
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
          <div className="overflow-hidden rounded-xl border border-border divide-y divide-border text-left">
            {/* Table Header (Desktop) */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/80 text-left">
              <div className="col-span-4 text-sm font-semibold text-gray-500">Vendor</div>
              <div className="col-span-2 text-sm font-semibold text-gray-500">Type</div>
              <div className="col-span-3 text-sm font-semibold text-gray-500">Contact details</div>
              <div className="col-span-3 text-sm font-semibold text-gray-500">Actions</div>
            </div>

            {/* Rows */}
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="grid grid-cols-1 gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/20 sm:px-6 lg:grid-cols-12 lg:items-center"
              >
                {/* Name */}
                <div className="lg:col-span-4 flex flex-col items-start gap-1">
                  <button
                    onClick={() => setProfileVendorId(vendor.id)}
                    className="truncate text-left font-serif text-base tracking-tight text-primary hover:underline"
                  >
                    {vendor.name}
                  </button>
                  <p className="text-xs text-gray-400">
                    {getVendorDisplayId(vendor.id)}
                  </p>
                </div>

                {/* Type Badge */}
                <div className="lg:col-span-2">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-700">
                    {normalizeVendorType(vendor.type)}
                  </span>
                </div>

                {/* Contact */}
                <div className="lg:col-span-3 flex flex-col items-start gap-2 text-sm text-slate-600">
                  {vendor.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {vendor.phone}
                    </span>
                  )}
                  {vendor.email && (
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{vendor.email}</span>
                    </span>
                  )}
                  {!vendor.phone && !vendor.email && (
                    <span className="italic text-slate-400">No contact info</span>
                  )}
                </div>

                {/* Actions */}
                <div className="lg:col-span-3 flex flex-wrap items-center justify-start gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-md px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => setProfileVendorId(vendor.id)}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Ledger
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-9 w-9 rounded-md text-slate-500 hover:bg-slate-100 hover:text-primary"
                    onClick={() => handleEdit(vendor)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-9 w-9 rounded-md text-slate-500 hover:bg-slate-100 hover:text-destructive"
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
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Delete Confirm */}
      {deleteVendor && (
        <DeleteConfirm vendor={deleteVendor} onClose={() => setDeleteVendor(null)} />
      )}

      {/* Vendor Transactions */}
      {profileVendorId && (
        <VendorProfile
          vendorId={profileVendorId}
          vendorName={selectedVendor?.name}
          onClose={() => setProfileVendorId(null)}
        />
      )}
    </DashboardShell>
  );
}
