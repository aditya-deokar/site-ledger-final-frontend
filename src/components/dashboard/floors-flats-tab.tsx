"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { bookFlatSchema, BookFlatInput, Floor, Flat, createFloorSchema, CreateFloorInput, createFlatSchema, CreateFlatInput } from "@/schemas/site.schema"
import { Customer } from "@/schemas/customer.schema"
import { CustomerProfile } from "@/components/dashboard/customer-profile"
import { useFloors, useBookFlat, useCreateFloor, useCreateFlat } from "@/hooks/api/site.hooks"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, Plus, Loader2, X, BookOpen, LayoutGrid } from "lucide-react"

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN")
}

// ── Add Floor Panel ───────────────────────────────────
function AddFloorPanel({
  siteId,
  onClose,
}: {
  siteId: string
  onClose: () => void
}) {
  const { mutate: createFloor, isPending, error } = useCreateFloor(siteId, { onSuccess: onClose })

  const { register, handleSubmit, formState: { errors } } = useForm<CreateFloorInput>({
    resolver: zodResolver(createFloorSchema),
    defaultValues: { floorName: '' },
  })

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="px-8 pt-8 pb-5 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-serif tracking-tight text-foreground">Add New Floor</h2>
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mt-1">Manual Site Expansion</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => createFloor(data))} className="flex flex-col flex-1">
          <div className="px-8 py-6 flex flex-col gap-6 flex-1">
            {error && (
              <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
                {typeof error === "string" ? error : "Failed to add floor"}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Floor Name</Label>
              <Input
                placeholder="e.g. Ground Floor, 1st Floor, Basement"
                className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                {...register("floorName")}
              />
              {errors.floorName && <p className="text-[10px] text-destructive">{errors.floorName.message}</p>}
            </div>
          </div>
          <div className="px-8 py-6 border-t border-border">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase rounded-none gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Floor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add Flat Panel ────────────────────────────────────
function AddFlatPanel({
  siteId,
  floorId,
  floorName,
  projectType,
  onClose,
}: {
  siteId: string
  floorId: string
  floorName: string
  projectType: 'NEW_CONSTRUCTION' | 'REDEVELOPMENT'
  onClose: () => void
}) {
  const { mutate: createFlat, isPending, error } = useCreateFlat(siteId, { onSuccess: onClose })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateFlatInput>({
    resolver: zodResolver(createFlatSchema),
    defaultValues: { customFlatId: '', flatType: 'CUSTOMER' },
  })

  const selectedFlatType = watch('flatType')

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="px-8 pt-8 pb-5 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-serif tracking-tight text-foreground">Add New Flat</h2>
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mt-1">Adding to {floorName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) =>
            createFlat({
              floorId,
              data: {
                ...data,
                // NEW_CONSTRUCTION always forces customer flats (no visible selector).
                flatType: projectType === 'NEW_CONSTRUCTION' ? 'CUSTOMER' : data.flatType,
              },
            })
          )}
          className="flex flex-col flex-1"
        >
          <div className="px-8 py-6 flex flex-col gap-6 flex-1">
            {error && (
              <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
                {typeof error === "string" ? error : "Failed to add flat"}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Custom Flat ID</Label>
              <Input
                placeholder="e.g. A-101, Shop-1, G-01"
                className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                {...register("customFlatId")}
              />
              {errors.customFlatId && <p className="text-[10px] text-destructive">{errors.customFlatId.message}</p>}
              <p className="text-[10px] text-muted-foreground/50 mt-1 italic">This ID must be unique within this site</p>
            </div>

            {/* Ensure flatType is always part of submitted payload */}
            <input type="hidden" {...register('flatType')} />

            {/* Flat Type Selector (Only for Redevelopment sites) */}
            {projectType === 'REDEVELOPMENT' && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">FLAT TYPE</Label>
                <div className="grid grid-cols-2 gap-3">
                  <FlatTypeOption
                    label="Customer Flat"
                    value="CUSTOMER"
                    selected={selectedFlatType === 'CUSTOMER'}
                    onSelect={(v) => setValue('flatType', v, { shouldValidate: true })}
                  />
                  <FlatTypeOption
                    label="Existing Owner Flat"
                    value="EXISTING_OWNER"
                    selected={selectedFlatType === 'EXISTING_OWNER'}
                    onSelect={(v) => setValue('flatType', v, { shouldValidate: true })}
                  />
                </div>

                {selectedFlatType === 'EXISTING_OWNER' && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1 italic">
                    This flat will be reserved for an existing owner of the old building.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="px-8 py-6 border-t border-border">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase rounded-none gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Flat"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FlatTypeOption({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string
  value: 'CUSTOMER' | 'EXISTING_OWNER'
  selected: boolean
  onSelect: (v: 'CUSTOMER' | 'EXISTING_OWNER') => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={[
        'border p-4 flex flex-col items-center gap-2 transition-colors text-left',
        selected ? 'border-primary/60 bg-primary/10' : 'border-border bg-muted/10 hover:bg-muted/20',
      ].join(' ')}
    >
      <p className="text-[10px] font-bold tracking-widest uppercase">{label}</p>
    </button>
  )
}

// ── Book Flat Panel ───────────────────────────────────
function BookFlatPanel({
  siteId,
  flat,
  floorName,
  onClose,
}: {
  siteId: string
  flat: Flat
  floorName: string
  onClose: () => void
}) {
  const { mutate: bookFlat, isPending, error } = useBookFlat(siteId, { onSuccess: onClose })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<BookFlatInput>({
    resolver: zodResolver(bookFlatSchema),
    defaultValues: { name: '', phone: '', email: '', sellingPrice: 0, bookingAmount: 0 },
  })

  const sellingPrice = watch("sellingPrice") || 0
  const bookingAmount = watch("bookingAmount") || 0
  const remaining = Number(sellingPrice) - Number(bookingAmount)

  const onSubmit = (data: BookFlatInput) => {
    bookFlat({ flatId: flat.id, data: { ...data, email: data.email || undefined } })
  }

  const flatDisplayName = flat.customFlatId || `Flat ${flat.flatNumber}`

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-border">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mb-2">Current Action</p>
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-serif tracking-tight text-foreground">
              Book {flatDisplayName} · {floorName}
            </h2>
            <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>
          
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="px-8 py-6 flex flex-col gap-6 flex-1">
            {error && (
              <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
                {typeof error === "string" ? error : "Failed to book flat"}
              </div>
            )}

            {flat.flatType === 'EXISTING_OWNER' && (
              <div className="bg-violet-500/10 border border-violet-500/20 text-violet-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase w-fit">
                EXISTING OWNER
              </div>
            )}

            {/* Customer Details */}
            <div className="flex flex-col gap-4">
              <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Customer Details</p>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Full Name</Label>
                <Input
                  placeholder="Enter name"
                  className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                  {...register("name")}
                />
                {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Phone</Label>
                  <Input
                    placeholder="+91"
                    className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                    {...register("phone")}
                  />
                  {errors.phone && <p className="text-[10px] text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Email</Label>
                  <Input
                    placeholder="example@mail.com"
                    className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                    {...register("email")}
                  />
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="flex flex-col gap-4">
              <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Payment Breakdown</p>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Selling Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 pl-8 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                    {...register("sellingPrice", { valueAsNumber: true })}
                  />
                </div>
                {errors.sellingPrice && <p className="text-[10px] text-destructive">{errors.sellingPrice.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Booking Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 pl-8 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                    {...register("bookingAmount", { valueAsNumber: true })}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="border border-border divide-y divide-border mt-2">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Price</span>
                  <span className="text-sm font-serif text-foreground">{formatINR(Number(sellingPrice))}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Booking Deduction</span>
                  <span className="text-sm font-serif text-red-500">− {formatINR(Number(bookingAmount))}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 bg-muted/30">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Remaining</span>
                  <span className="text-lg font-serif text-primary">{formatINR(Math.max(0, remaining))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-border flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase rounded-none gap-2"
            >
              {isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><BookOpen className="w-4 h-4" /> Book Flat</>
              }
            </Button>
            <p className="text-[9px] text-center text-muted-foreground/40 uppercase tracking-widest">
              By proceeding, you generate a temporary booking receipt valid for 72 hours.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Flat Card ─────────────────────────────────────────
function FlatCard({ flat, onBook, onCustomerClick }: { flat: Flat; onBook: (flat: Flat) => void; onCustomerClick: (flat: Flat) => void }) {
  const flatDisplayName = flat.customFlatId || `Flat ${flat.flatNumber}`
  const isOwnerFlat = flat.flatType === 'EXISTING_OWNER'

  if (flat.status === "AVAILABLE") {
    return (
      <button
        onClick={() => onBook(flat)}
        className="relative border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all p-4 flex flex-col items-center justify-center gap-2 min-h-36 group"
      >
        {isOwnerFlat && (
          <span className="absolute top-4 right-4 bg-violet-500/15 text-violet-700 border border-violet-500/25 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase">
            OWNER
          </span>
        )}
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40 group-hover:text-primary transition-colors">
          {flatDisplayName} &nbsp; Available
        </p>
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/20 group-hover:border-primary/40 flex items-center justify-center transition-colors">
          <Plus className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        </div>
        <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/30 group-hover:text-primary/60 transition-colors">
          Book This Flat
        </p>
      </button>
    )
  }

  const c = flat.customer
  const pct = c && c.sellingPrice > 0 ? Math.min(100, (c.amountPaid / c.sellingPrice) * 100) : 0

  const isSold = flat.status === "SOLD"

  return (
    <div className={cn(
      "relative border p-4 flex flex-col gap-3 min-h-36",
      isSold ? "bg-foreground/5 border-foreground/10" : "border-amber-500/30 bg-amber-500/5"
    )}>
      {isOwnerFlat && (
        <span className="absolute top-4 right-4 bg-violet-500/15 text-violet-700 border border-violet-500/25 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase">
          OWNER
        </span>
      )}
      <div className="flex items-center justify-between">
        <span className="text-base font-serif text-foreground font-bold">{flatDisplayName}</span>
        <span className={cn(
          "text-[9px] font-bold tracking-widest uppercase px-2 py-0.5",
          isSold ? "bg-foreground/10 text-foreground/70" : "bg-amber-500/20 text-amber-600"
        )}>
          {isSold ? "Sold" : "Booked"}
        </span>
      </div>
      {c && (
        <>
          <div>
            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">
              {isSold ? "Owner" : "Customer"}
            </p>
            <button onClick={() => onCustomerClick(flat)} className="text-sm font-serif text-primary hover:underline truncate text-left">
              {c.name}
            </button>
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">
              {isSold ? "Payment Received" : "Booking Amount"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-serif text-foreground">{formatINR(c.amountPaid)}</span>
              <span className="text-[9px] text-muted-foreground/40">/</span>
              <span className="text-[9px] text-muted-foreground/50">{formatINR(c.sellingPrice)}</span>
              <span className={cn(
                "text-[9px] font-bold ml-auto",
                isSold ? "text-emerald-600" : "text-amber-600"
              )}>
                {pct.toFixed(0)}%
              </span>
            </div>
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", isSold ? "bg-emerald-500" : "bg-amber-500")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Floor Row ─────────────────────────────────────────
function FloorRow({
  floor,
  defaultOpen,
  onBook,
  onCustomerClick,
  onAddFlat,
}: {
  floor: Floor
  defaultOpen: boolean
  onBook: (flat: Flat, floorName: string) => void
  onCustomerClick: (flat: Flat, floorName: string) => void
  onAddFlat: (floorId: string, floorName: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  const sold = floor.flats.filter(f => f.status === "SOLD").length
  const booked = floor.flats.filter(f => f.status === "BOOKED").length
  const available = floor.flats.filter(f => f.status === "AVAILABLE").length

  const floorDisplayName = floor.floorName || `Floor ${floor.floorNumber}`

  return (
    <div className="border border-border">
      {/* Floor Header */}
      <div className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors group">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-4 text-left"
        >
          <h3 className="text-lg font-serif text-foreground tracking-tight">{floorDisplayName}</h3>
          <span className="px-2 py-0.5 bg-muted text-[9px] font-bold tracking-widest uppercase text-muted-foreground">
            {floor.flats.length} Flats
          </span>
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
            {sold > 0 && <span className="text-foreground/60">{sold} Sold</span>}
            {booked > 0 && <span className="text-amber-600">{booked} Booked</span>}
            {available > 0 && <span className="text-muted-foreground/50">{available} Available</span>}
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddFlat(floor.id, floorDisplayName)}
            className="h-8 px-2 text-[9px] font-bold tracking-widest uppercase hover:bg-primary hover:text-black rounded-none gap-1"
          >
            <Plus className="w-3 h-3" /> Add Flat
          </Button>
          <button onClick={() => setOpen(o => !o)} className="p-2">
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground/40" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/40" />}
          </button>
        </div>
      </div>

      {/* Flat Grid */}
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-6 pb-6 pt-2">
          {floor.flats.map(flat => (
            <FlatCard
              key={flat.id}
              flat={flat}
              onBook={(f) => onBook(f, floorDisplayName)}
              onCustomerClick={(f) => onCustomerClick(f, floorDisplayName)}
            />
          ))}
          {floor.flats.length === 0 && (
            <button
              onClick={() => onAddFlat(floor.id, floorDisplayName)}
              className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all p-4 flex flex-col items-center justify-center gap-2 min-h-36 group"
            >
              <Plus className="w-6 h-6 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40 group-hover:text-primary transition-colors">
                Add First Flat
              </p>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────
export function FloorsFlatsTab({
  siteId,
  siteName,
  projectType,
}: {
  siteId: string
  siteName?: string
  projectType: 'NEW_CONSTRUCTION' | 'REDEVELOPMENT'
}) {
  const { data, isLoading } = useFloors(siteId)
  const [booking, setBooking] = useState<{ flat: Flat; floorName: string } | null>(null)
  const [customerView, setCustomerView] = useState<{ flat: Flat; floorName: string } | null>(null)
  const [addingFloor, setAddingFloor] = useState(false)
  const [addingFlat, setAddingFlat] = useState<{ floorId: string; floorName: string } | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const floors: Floor[] = data?.data?.floors ?? []

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-muted-foreground/40" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">Inventory Control</span>
          </div>
          <Button
            onClick={() => setAddingFloor(true)}
            className="h-10 px-4 bg-primary text-black font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-primary/90 rounded-none gap-2"
          >
            <Plus className="w-4 h-4" /> Add Floor
          </Button>
        </div>

        {floors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border bg-muted/10 gap-4">
            <p className="text-sm text-muted-foreground italic uppercase tracking-widest opacity-50">No floors defined for this site</p>
            <Button
              variant="outline"
              onClick={() => setAddingFloor(true)}
              className="rounded-none border-primary/30 text-primary hover:bg-primary hover:text-black"
            >
              Initialize First Floor
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {floors.map((floor, i) => (
              <FloorRow
                key={floor.id}
                floor={floor}
                defaultOpen={i === 0}
                onBook={(flat, floorName) => setBooking({ flat, floorName })}
                onCustomerClick={(flat, floorName) => setCustomerView({ flat, floorName })}
                onAddFlat={(floorId, floorName) => setAddingFlat({ floorId, floorName })}
              />
            ))}
          </div>
        )}
      </div>

      {addingFloor && (
        <AddFloorPanel
          siteId={siteId}
          onClose={() => setAddingFloor(false)}
        />
      )}

      {addingFlat && (
        <AddFlatPanel
          siteId={siteId}
          floorId={addingFlat.floorId}
          floorName={addingFlat.floorName}
          projectType={projectType}
          onClose={() => setAddingFlat(null)}
        />
      )}

      {booking && (
        <BookFlatPanel
          siteId={siteId}
          flat={booking.flat}
          floorName={booking.floorName}
          onClose={() => setBooking(null)}
        />
      )}

      {customerView && customerView.flat.customer && (
        <CustomerProfile
          customer={{
            id: customerView.flat.customer.id,
            name: customerView.flat.customer.name,
            phone: customerView.flat.customer.phone ?? null,
            email: customerView.flat.customer.email ?? null,
            sellingPrice: customerView.flat.customer.sellingPrice,
            bookingAmount: customerView.flat.customer.bookingAmount,
            amountPaid: customerView.flat.customer.amountPaid,
            remaining: customerView.flat.customer.remaining,
            flatId: customerView.flat.id,
            flatNumber: customerView.flat.flatNumber || 0,
            customFlatId: customerView.flat.customFlatId || undefined,
            floorNumber: floors.find(f => f.flats.some(fl => fl.id === customerView.flat.id))?.floorNumber || 0,
            floorName: customerView.floorName,
            flatStatus: customerView.flat.status,
            createdAt: "",
          }}
          siteId={siteId}
          siteName={siteName}
          onClose={() => setCustomerView(null)}
        />
      )}
    </>
  )
}
