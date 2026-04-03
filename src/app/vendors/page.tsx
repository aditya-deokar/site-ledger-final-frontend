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
  Loader2, Plus, Phone, Mail, Pencil, Trash2, Users, ArrowRight, X
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

const TYPE_BADGE_CLASS = 'bg-muted text-muted-foreground border-border';

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

// ── Side Panel ──────────────────────────────────────
function SidePanel({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
        <div className="px-8 pt-8 pb-5 border-b border-border">
          {subtitle && (
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mb-2">{subtitle}</p>
          )}
          <div className="flex items-start justify-between">
            <h2 className="text-3xl font-serif tracking-tight text-foreground">{title}</h2>
            <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-8 py-6 flex-1">{children}</div>
      </div>
    </div>
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
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const { data, isLoading } = useVendors(typeFilter);
  const { data: allVendorsData } = useVendors();
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

  const vendors = useMemo(() => data?.data?.vendors ?? [], [data]);
  const allVendors = useMemo(() => allVendorsData?.data?.vendors ?? vendors, [allVendorsData, vendors]);

  const tabs = useMemo(() => {
    const uniqueTypes = Array.from(
      new Set(allVendors.map((vendor) => vendor.type).filter((type) => type.trim().length > 0))
    ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));

    return [
      { key: undefined, label: 'All' },
      ...uniqueTypes.map((type) => ({ key: type, label: type })),
    ];
  }, [allVendors]);

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-700">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-serif text-foreground tracking-tight">Vendors</h1>
            <p className="mt-2 text-base text-muted-foreground italic">
              Manage your company-wide vendor registry.
            </p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="h-11 text-xs font-bold tracking-widest uppercase gap-2 px-8 flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-1 border-b border-border overflow-x-auto pb-px scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key ?? 'all'}
              onClick={() => handleSetType(t.key)}
              className={cn(
                'px-5 py-3 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap',
                typeFilter === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
              <Users className="w-5 h-5 text-muted-foreground/40" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">
                Vendors Total
              </span>
              <span className="text-2xl sm:text-3xl font-sans font-bold text-foreground">{vendors.length}</span>
            </div>

            {/* Vendor List */}
            {vendors.length === 0 ? (
              <div className="border border-dashed border-border flex items-center justify-center py-20">
                <p className="text-sm text-muted-foreground italic">No vendors found.</p>
              </div>
            ) : (
          <div className="border border-border divide-y divide-border overflow-hidden">
            {/* Table Header (Desktop) */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30">
              <div className="col-span-4 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Vendor</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Type</div>
              <div className="col-span-4 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50">Contact Details</div>
              <div className="col-span-2 text-[11px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Actions</div>
            </div>

            {/* Rows */}
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4 sm:px-6 py-4 hover:bg-muted/20 transition-colors items-center group"
              >
                {/* Name */}
                <div className="lg:col-span-4 flex flex-col gap-1.5">
                  <button onClick={() => setProfileVendorId(vendor.id)} className="font-serif text-base tracking-tight text-primary hover:underline text-left truncate">{vendor.name}</button>
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground/40 mt-0.5">
                    ID: {vendor.id.slice(-8).toUpperCase()}
                  </p>
                </div>

                {/* Type Badge */}
                <div className="lg:col-span-2">
                  <span className={cn(
                    'inline-block px-3 py-1.5 text-[11px] font-bold tracking-widest border whitespace-nowrap',
                    TYPE_BADGE_CLASS
                  )}>
                    {vendor.type}
                  </span>
                </div>

                {/* Contact */}
                <div className="lg:col-span-4 flex flex-col gap-1 text-[11px] text-muted-foreground font-medium">
                  {vendor.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground/30" />
                      {vendor.phone}
                    </span>
                  )}
                  {vendor.email && (
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/30" />
                      <span className="truncate">{vendor.email}</span>
                    </span>
                  )}
                  {!vendor.phone && !vendor.email && (
                    <span className="text-muted-foreground/30 italic">No contact info</span>
                  )}
                </div>

                {/* Actions */}
                <div className="lg:col-span-2 flex justify-end gap-1 pt-3 lg:pt-0 border-t lg:border-none border-border/50 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[9px] font-bold tracking-widest uppercase gap-1 text-primary hover:text-primary mr-1"
                    onClick={() => setProfileVendorId(vendor.id)}
                  >
                    Transactions
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    onClick={() => handleEdit(vendor)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
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
        <VendorProfile vendorId={profileVendorId} vendorName={vendors.find(v => v.id === profileVendorId)?.name} onClose={() => setProfileVendorId(null)} />
      )}
    </DashboardShell>
  );
}
