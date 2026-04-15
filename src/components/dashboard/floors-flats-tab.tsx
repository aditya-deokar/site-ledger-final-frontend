"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { bookFlatSchema, BookFlatInput, Floor, Flat, createFloorSchema, CreateFloorInput, createFlatSchema, CreateFlatInput } from "@/schemas/site.schema"
import { CustomerProfile } from "@/components/dashboard/customer-profile"
import {
  useFloors,
  useBookFlat,
  useCreateFloor,
  useCreateFlat,
  useUpdateFloor,
  useDeleteFloor,
  useUpdateFlatDetails,
  useDeleteFlat,
} from "@/hooks/api/site.hooks"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { getApiErrorMessage } from "@/lib/api-error"
import { ChevronDown, ChevronUp, Plus, Loader2, X, BookOpen, LayoutGrid, Pencil, Trash2 } from "lucide-react"

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN")
}

// ── Add Floor Panel ───────────────────────────────────
function getFloorDisplayName(floor: Pick<Floor, "floorName" | "floorNumber">) {
  return floor.floorName || `Floor ${floor.floorNumber}`
}

function getFlatDisplayName(flat: Pick<Flat, "customFlatId" | "flatNumber">) {
  return flat.customFlatId || `Flat ${flat.flatNumber}`
}

const bookFlatWithSelectionSchema = bookFlatSchema.extend({
  floorId: z.string().min(1, "Select a floor"),
  flatId: z.string().min(1, "Select an available unit"),
})

type BookFlatWithSelectionInput = BookFlatInput & {
  floorId: string
  flatId: string
}

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
function EditFloorDialog({
  siteId,
  floor,
  onClose,
}: {
  siteId: string
  floor: Floor
  onClose: () => void
}) {
  const { mutate: updateFloor, isPending, error } = useUpdateFloor(siteId, { onSuccess: onClose })
  const floorDisplayName = getFloorDisplayName(floor)
  const formId = `edit-floor-form-${floor.id}`

  const { register, handleSubmit, formState: { errors } } = useForm<CreateFloorInput>({
    resolver: zodResolver(createFloorSchema),
    defaultValues: { floorName: floor.floorName ?? "" },
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md rounded-none border-border p-0 gap-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-serif tracking-tight">Edit Floor</DialogTitle>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit((data) => updateFloor({ floorId: floor.id, data }))}
          className="px-8 py-6 flex flex-col gap-5"
        >
          {error && (
            <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
              {getApiErrorMessage(error, "Failed to update floor.")}
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

          <div className="border border-border bg-muted/20 p-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Editing</p>
            <p className="mt-2 text-sm font-serif text-foreground">{floorDisplayName}</p>
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              The floor number stays the same. This only updates the visible floor label.
            </p>
          </div>
        </form>

        <div className="px-8 pb-8 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            form={formId}
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Floor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeleteFloorDialog({
  siteId,
  floor,
  onClose,
}: {
  siteId: string
  floor: Floor
  onClose: () => void
}) {
  const { mutate: deleteFloor, isPending, error } = useDeleteFloor(siteId, { onSuccess: onClose })
  const floorDisplayName = getFloorDisplayName(floor)
  const canDelete = floor.flats.length === 0

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <AlertDialogContent className="max-w-lg border-t-4 border-t-red-500 rounded-none p-0 overflow-hidden bg-background">
        <AlertDialogHeader className="p-8 pb-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl font-serif text-center">
              Delete &ldquo;{floorDisplayName}&rdquo;?
            </AlertDialogTitle>
            <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest">
              This removes the floor record from the site structure.
            </p>
          </div>
        </AlertDialogHeader>

        <div className="px-8 pb-6 flex flex-col gap-4">
          <div className={cn(
            "border p-4 text-[11px] leading-relaxed",
            canDelete ? "border-border bg-muted/20 text-muted-foreground" : "border-red-500/20 bg-red-500/5 text-red-600"
          )}>
            {canDelete
              ? "This floor is empty, so it can be deleted safely."
              : `This floor still contains ${floor.flats.length} flat${floor.flats.length === 1 ? "" : "s"}. Delete those flats first, then remove the floor.`}
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
              {getApiErrorMessage(error, "Failed to delete floor.")}
            </div>
          )}
        </div>

        <AlertDialogFooter className="p-8 pt-0 flex gap-4 sm:space-x-4">
          <AlertDialogCancel className="flex-1 rounded-none border-border bg-transparent text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted h-12">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              if (!canDelete) return
              deleteFloor(floor.id)
            }}
            disabled={isPending || !canDelete}
            className="flex-1 rounded-none bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest h-12 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Floor"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function EditFlatDialog({
  siteId,
  flat,
  floorName,
  projectType,
  onClose,
}: {
  siteId: string
  flat: Flat
  floorName: string
  projectType: 'NEW_CONSTRUCTION' | 'REDEVELOPMENT'
  onClose: () => void
}) {
  const { mutate: updateFlat, isPending, error } = useUpdateFlatDetails(siteId, { onSuccess: onClose })
  const flatDisplayName = getFlatDisplayName(flat)
  const formId = `edit-flat-form-${flat.id}`
  const canChangeFlatType = flat.status === "AVAILABLE" && !flat.customer
  const flatTypeLabel = flat.flatType === "EXISTING_OWNER" ? "Existing Owner Flat" : "Customer Flat"

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateFlatInput>({
    resolver: zodResolver(createFlatSchema),
    defaultValues: {
      customFlatId: flat.customFlatId ?? "",
      flatType: flat.flatType,
    },
  })

  const selectedFlatType = watch("flatType")

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md rounded-none border-border p-0 gap-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-serif tracking-tight">Edit Flat</DialogTitle>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit((data) =>
            updateFlat({
              flatId: flat.id,
              data: {
                ...data,
                flatType: canChangeFlatType
                  ? (projectType === "NEW_CONSTRUCTION" ? "CUSTOMER" : data.flatType)
                  : flat.flatType,
              },
            })
          )}
          className="px-8 py-6 flex flex-col gap-5"
        >
          {error && (
            <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
              {getApiErrorMessage(error, "Failed to update flat.")}
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
            <p className="text-[10px] text-muted-foreground/50 mt-1 italic">This ID must remain unique within this site</p>
          </div>

          <input type="hidden" {...register("flatType")} />

          {projectType === "REDEVELOPMENT" && canChangeFlatType && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Flat Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <FlatTypeOption
                  label="Customer Flat"
                  value="CUSTOMER"
                  selected={selectedFlatType === "CUSTOMER"}
                  onSelect={(value) => setValue("flatType", value, { shouldValidate: true })}
                />
                <FlatTypeOption
                  label="Existing Owner Flat"
                  value="EXISTING_OWNER"
                  selected={selectedFlatType === "EXISTING_OWNER"}
                  onSelect={(value) => setValue("flatType", value, { shouldValidate: true })}
                />
              </div>
            </div>
          )}

          {projectType === "REDEVELOPMENT" && !canChangeFlatType && (
            <div className="border border-border bg-muted/20 p-4">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Flat Type</p>
              <p className="mt-2 text-sm font-serif text-foreground">{flatTypeLabel}</p>
              <p className="mt-2 text-[10px] text-muted-foreground/70">
                Flat type is locked once this unit is assigned to a customer or owner.
              </p>
            </div>
          )}

          <div className="border border-border bg-muted/20 p-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Editing</p>
            <p className="mt-2 text-sm font-serif text-foreground">{flatDisplayName}</p>
            <p className="mt-1 text-[10px] text-muted-foreground/70">{floorName}</p>
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              {canChangeFlatType
                ? "You can update the unit ID and flat type before this unit is assigned."
                : "You can still correct the unit ID here, but booking-linked details and flat type stay protected."}
            </p>
          </div>
        </form>

        <div className="px-8 pb-8 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            form={formId}
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Flat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeleteFlatDialog({
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
  const { mutate: deleteFlat, isPending, error } = useDeleteFlat(siteId, { onSuccess: onClose })
  const flatDisplayName = getFlatDisplayName(flat)
  const canDelete = flat.status === "AVAILABLE" && !flat.customer

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <AlertDialogContent className="max-w-lg border-t-4 border-t-red-500 rounded-none p-0 overflow-hidden bg-background">
        <AlertDialogHeader className="p-8 pb-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl font-serif text-center">
              Delete &ldquo;{flatDisplayName}&rdquo;?
            </AlertDialogTitle>
            <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest">
              This removes the flat from {floorName}.
            </p>
          </div>
        </AlertDialogHeader>

        <div className="px-8 pb-6 flex flex-col gap-4">
          <div className={cn(
            "border p-4 text-[11px] leading-relaxed",
            canDelete ? "border-border bg-muted/20 text-muted-foreground" : "border-red-500/20 bg-red-500/5 text-red-600"
          )}>
            {canDelete
              ? "This flat is still available and unassigned, so it can be deleted."
              : "This flat can no longer be deleted because it is already linked to a customer or no longer available."}
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
              {getApiErrorMessage(error, "Failed to delete flat.")}
            </div>
          )}
        </div>

        <AlertDialogFooter className="p-8 pt-0 flex gap-4 sm:space-x-4">
          <AlertDialogCancel className="flex-1 rounded-none border-border bg-transparent text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted h-12">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              if (!canDelete) return
              deleteFlat(flat.id)
            }}
            disabled={isPending || !canDelete}
            className="flex-1 rounded-none bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest h-12 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Flat"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function BookFlatPanel({
  siteId,
  floors,
  initialFlatId,
  onClose,
}: {
  siteId: string
  floors: Floor[]
  initialFlatId?: string
  onClose: () => void
}) {
  const { mutateAsync: updateFlatDetails, isPending: isUpdatingFlat, error: updateFlatError } = useUpdateFlatDetails(siteId)
  const { mutateAsync: bookFlat, isPending: isBooking, error: bookingError } = useBookFlat(siteId, { onSuccess: onClose })
  const bookableFloors = floors.filter((floor) => floor.flats.some((flat) => flat.status === "AVAILABLE"))
  const initialFloorId =
    (initialFlatId
      ? bookableFloors.find((floor) => floor.flats.some((flat) => flat.id === initialFlatId))?.id
      : undefined) ?? bookableFloors[0]?.id ?? ""

  const [selectedFloorId, setSelectedFloorId] = useState(initialFloorId)
  const [selectedFlatId, setSelectedFlatId] = useState(initialFlatId ?? "")
  const [editableFlatId, setEditableFlatId] = useState("")
  const [hasEditedFlatId, setHasEditedFlatId] = useState(false)
  const [flatIdError, setFlatIdError] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookFlatWithSelectionInput>({
    resolver: zodResolver(bookFlatWithSelectionSchema),
    defaultValues: {
      floorId: initialFloorId,
      flatId: initialFlatId ?? "",
      name: "",
      phone: "",
      email: "",
      sellingPrice: 0,
      bookingAmount: 0,
    },
  })

  useEffect(() => {
    if (!selectedFloorId && initialFloorId) {
      setSelectedFloorId(initialFloorId)
      return
    }

    if (selectedFloorId && !bookableFloors.some((floor) => floor.id === selectedFloorId)) {
      setSelectedFloorId(initialFloorId)
    }
  }, [bookableFloors, initialFloorId, selectedFloorId])

  const selectedFloor = bookableFloors.find((floor) => floor.id === selectedFloorId) ?? null
  const availableFlats = selectedFloor?.flats.filter((candidateFlat) => candidateFlat.status === "AVAILABLE") ?? []

  useEffect(() => {
    const preferredFlatId =
      (initialFlatId && availableFlats.some((candidateFlat) => candidateFlat.id === initialFlatId)
        ? initialFlatId
        : undefined) ?? availableFlats[0]?.id ?? ""

    if (!selectedFlatId || !availableFlats.some((candidateFlat) => candidateFlat.id === selectedFlatId)) {
      setSelectedFlatId(preferredFlatId)
    }
  }, [availableFlats, initialFlatId, selectedFlatId])

  const selectedFlat = availableFlats.find((candidateFlat) => candidateFlat.id === selectedFlatId) ?? null

  useEffect(() => {
    setValue("floorId", selectedFloorId, { shouldValidate: true })
  }, [selectedFloorId, setValue])

  useEffect(() => {
    setValue("flatId", selectedFlatId, { shouldValidate: true })
  }, [selectedFlatId, setValue])

  useEffect(() => {
    if (selectedFlat) {
      setEditableFlatId(getFlatDisplayName(selectedFlat))
      setHasEditedFlatId(false)
      setFlatIdError(null)
      return
    }

    setEditableFlatId("")
    setHasEditedFlatId(false)
    setFlatIdError(null)
  }, [selectedFlat])

  const isExistingOwner = selectedFlat?.flatType === "EXISTING_OWNER"
  const sellingPrice = watch("sellingPrice") || 0
  const bookingAmount = watch("bookingAmount") || 0
  const remaining = Number(sellingPrice) - Number(bookingAmount)

  const onSubmit = async (data: BookFlatWithSelectionInput) => {
    if (!selectedFlat || !selectedFloor) return

    const trimmedFlatId = editableFlatId.trim()
    const currentDisplayFlatId = getFlatDisplayName(selectedFlat)

    if (hasEditedFlatId) {
      if (!trimmedFlatId) {
        setFlatIdError("Flat ID cannot be blank after you edit it.")
        return
      }

      if (trimmedFlatId !== currentDisplayFlatId) {
        await updateFlatDetails({
          flatId: selectedFlat.id,
          data: { customFlatId: trimmedFlatId },
        })
      }
    }

    setFlatIdError(null)
    await bookFlat({
      flatId: selectedFlat.id,
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        sellingPrice: data.sellingPrice,
        bookingAmount: data.bookingAmount,
      },
    })
  }

  const selectedFloorName = selectedFloor ? getFloorDisplayName(selectedFloor) : "Select Floor"
  const flatDisplayName = selectedFlat ? getFlatDisplayName(selectedFlat) : "Select Flat"
  const previewFlatDisplayName = editableFlatId.trim() || flatDisplayName
  const isPending = isUpdatingFlat || isBooking

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-border">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mb-2">Current Action</p>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-serif tracking-tight text-foreground">
              Book Flat
            </h2>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 border-border hover:bg-muted"
            >
              Cancel
            </Button>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">
            Select the floor and available unit, adjust the flat ID if needed, and complete the booking details in this same drawer.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="px-8 py-6 flex flex-col gap-6 flex-1">
            <input type="hidden" {...register("floorId")} />
            <input type="hidden" {...register("flatId")} />

            {(updateFlatError || bookingError) && (
              <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
                {getApiErrorMessage(updateFlatError ?? bookingError, "Failed to book flat.")}
              </div>
            )}

            {bookableFloors.length === 0 && (
              <div className="border border-border bg-muted/20 p-4 text-[11px] leading-relaxed text-muted-foreground">
                There are no available units to book right now. Add a floor or flat first, or free up an available flat to continue.
              </div>
            )}

            {bookableFloors.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Unit Selection</p>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Floor</Label>
                  <NativeSelect
                    value={selectedFloorId}
                    onChange={(event) => {
                      setSelectedFloorId(event.target.value)
                      setSelectedFlatId("")
                    }}
                    className="w-full"
                  >
                    {bookableFloors.map((floor) => (
                      <NativeSelectOption key={floor.id} value={floor.id}>
                        {getFloorDisplayName(floor)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {errors.floorId && <p className="text-[10px] text-destructive">{errors.floorId.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Available Unit Slot</Label>
                  <NativeSelect
                    value={selectedFlatId}
                    onChange={(event) => setSelectedFlatId(event.target.value)}
                    className="w-full"
                    disabled={availableFlats.length === 0}
                  >
                    {availableFlats.map((candidateFlat) => (
                      <NativeSelectOption key={candidateFlat.id} value={candidateFlat.id}>
                        {getFlatDisplayName(candidateFlat)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {errors.flatId && <p className="text-[10px] text-destructive">{errors.flatId.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Flat ID</Label>
                  <Input
                    value={editableFlatId}
                    onChange={(event) => {
                      setEditableFlatId(event.target.value)
                      setHasEditedFlatId(true)
                      setFlatIdError(null)
                    }}
                    placeholder="e.g. A-101, Shop-1, G-01"
                    className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                    disabled={!selectedFlat}
                  />
                  {flatIdError && <p className="text-[10px] text-destructive">{flatIdError}</p>}
                  <p className="text-[10px] text-muted-foreground/60">
                    {selectedFlat?.customFlatId
                      ? "This ID is already linked to the selected unit and can be corrected before booking."
                      : `This unit is currently shown as ${flatDisplayName}. Enter a custom ID here if you want to name it during booking.`}
                  </p>
                </div>

                <div className="border border-border bg-muted/20 p-4">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Selected Unit</p>
                  <p className="mt-2 text-sm font-serif text-foreground">{previewFlatDisplayName}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">{selectedFloorName}</p>
                </div>
              </div>
            )}

            {isExistingOwner && (
              <div className="border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="w-fit rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-violet-700">
                  EXISTING OWNER
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Owner-acquisition entries can be saved with <strong className="text-foreground">zero selling price</strong>. If money is received later, add only the new amount from the owner profile.
                </p>
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
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                  {isExistingOwner ? "Settlement Value" : "Selling Price"}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 pl-8 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                    {...register("sellingPrice", { valueAsNumber: true })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/60">
                  {isExistingOwner
                    ? "Use 0 if this flat is only being transferred back to an existing owner."
                    : "This becomes the total agreement value used for later payment tracking."}
                </p>
                {errors.sellingPrice && <p className="text-[10px] text-destructive">{errors.sellingPrice.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                  {isExistingOwner ? "Amount Received Now" : "Booking Amount Received Now"}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 pl-8 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                    {...register("bookingAmount", { valueAsNumber: true })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/60">
                  Future payments can be added later from the profile. You will not need to enter the total amount again.
                </p>
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
              disabled={isPending || !selectedFlat}
              className="w-full h-14 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase rounded-none gap-2"
            >
              {isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><BookOpen className="w-4 h-4" /> {isExistingOwner ? "Create Owner Entry" : "Book Flat"}</>
              }
            </Button>
            <p className="text-[9px] text-center text-muted-foreground/40 uppercase tracking-widest">
              {isExistingOwner
                ? "You can add later payments from the owner profile whenever funds are received."
                : "By proceeding, you generate a temporary booking receipt valid for 72 hours."}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Flat Card ─────────────────────────────────────────
function FlatCard({
  flat,
  onBook,
  onCustomerClick,
  onEdit,
  onDelete,
}: {
  flat: Flat
  onBook: (flat: Flat) => void
  onCustomerClick: (flat: Flat) => void
  onEdit: (flat: Flat) => void
  onDelete: (flat: Flat) => void
}) {
  const flatDisplayName = getFlatDisplayName(flat)
  const isOwnerFlat = flat.flatType === 'EXISTING_OWNER'

  if (flat.status === "AVAILABLE") {
    return (
      <div className="relative border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all min-h-36 group">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(flat)}
            className="w-8 h-8 flex items-center justify-center border border-border bg-background/90 text-muted-foreground/60 transition-colors hover:text-foreground hover:border-primary/40"
            aria-label={`Edit ${flatDisplayName}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(flat)}
            className="w-8 h-8 flex items-center justify-center border border-border bg-background/90 text-muted-foreground/60 transition-colors hover:text-red-500 hover:border-red-500/40"
            aria-label={`Delete ${flatDisplayName}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {isOwnerFlat && (
          <span className="absolute top-4 right-4 bg-violet-500/15 text-violet-700 border border-violet-500/25 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase">
            OWNER
          </span>
        )}
        <button
          type="button"
          onClick={() => onBook(flat)}
          className="w-full h-full p-4 pt-12 flex flex-col items-center justify-center gap-2 text-center"
        >
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
      </div>
    )
  }

  const c = flat.customer
  const pct = c
    ? c.sellingPrice > 0
      ? Math.min(100, (c.amountPaid / c.sellingPrice) * 100)
      : c.remaining <= 0
        ? 100
        : 0
    : 0

  const isSold = flat.status === "SOLD"

  return (
    <div className={cn(
      "relative border p-4 flex flex-col gap-3 min-h-36",
      isSold ? "bg-foreground/5 border-foreground/10" : "border-amber-500/30 bg-amber-500/5"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-lg font-serif text-foreground font-bold">{flatDisplayName}</span>
        <div className="flex items-center gap-2">
          {isOwnerFlat && (
            <span className="bg-violet-500/15 text-violet-700 border border-violet-500/25 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
              OWNER
            </span>
          )}
          <span className={cn(
            "text-[10px] font-bold tracking-widest uppercase px-2.5 py-1",
            isSold ? "bg-foreground/10 text-foreground/70" : "bg-amber-500/20 text-amber-600"
          )}>
            {isSold ? "Sold" : "Booked"}
          </span>
        </div>
      </div>
      {c && (
        <>
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40">
              {isSold ? "Owner" : "Customer"}
            </p>
            <button onClick={() => onCustomerClick(flat)} className="text-base font-serif font-medium text-primary hover:underline truncate text-left">
              {c.name}
            </button>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40">
              {isSold ? "Payment Received" : "Booking Amount"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-serif text-foreground">{formatINR(c.amountPaid)}</span>
              <span className="text-[10px] text-muted-foreground/40">/</span>
              <span className="text-[10px] text-muted-foreground/50">{formatINR(c.sellingPrice)}</span>
              <span className={cn(
                "text-[10px] font-bold ml-auto",
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
  onEditFloor,
  onDeleteFloor,
  onEditFlat,
  onDeleteFlat,
}: {
  floor: Floor
  defaultOpen: boolean
  onBook: (flat: Flat, floorName: string) => void
  onCustomerClick: (flat: Flat, floorName: string) => void
  onAddFlat: (floorId: string, floorName: string) => void
  onEditFloor: (floor: Floor) => void
  onDeleteFloor: (floor: Floor) => void
  onEditFlat: (flat: Flat, floorName: string) => void
  onDeleteFlat: (flat: Flat, floorName: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  const sold = floor.flats.filter(f => f.status === "SOLD").length
  const booked = floor.flats.filter(f => f.status === "BOOKED").length
  const available = floor.flats.filter(f => f.status === "AVAILABLE").length

  const floorDisplayName = getFloorDisplayName(floor)

  return (
    <div className="border border-border">
      {/* Floor Header */}
      <div className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors group">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-4 text-left"
        >
          <h3 className="text-xl font-serif text-foreground tracking-tight">{floorDisplayName}</h3>
          <span className="px-2.5 py-1 bg-muted text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            {floor.flats.length} Flats
          </span>
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest">
            {sold > 0 && <span className="text-foreground/60">{sold} Sold</span>}
            {booked > 0 && <span className="text-amber-600">{booked} Booked</span>}
            {available > 0 && <span className="text-muted-foreground/50">{available} Available</span>}
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEditFloor(floor)}
            className="h-9 px-3 text-[10px] font-bold tracking-widest uppercase hover:bg-muted rounded-none gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDeleteFloor(floor)}
            className="h-9 px-3 text-[10px] font-bold tracking-widest uppercase hover:bg-red-500/10 hover:text-red-500 rounded-none gap-1"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddFlat(floor.id, floorDisplayName)}
            className="h-9 px-3 text-[10px] font-bold tracking-widest uppercase hover:bg-primary hover:text-black rounded-none gap-1"
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
              onEdit={(f) => onEditFlat(f, floorDisplayName)}
              onDelete={(f) => onDeleteFlat(f, floorDisplayName)}
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
  const [booking, setBooking] = useState<{ initialFlatId?: string } | null>(null)
  const [customerView, setCustomerView] = useState<{ flat: Flat; floorName: string } | null>(null)
  const [addingFloor, setAddingFloor] = useState(false)
  const [addingFlat, setAddingFlat] = useState<{ floorId: string; floorName: string } | null>(null)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
  const [deletingFloor, setDeletingFloor] = useState<Floor | null>(null)
  const [editingFlat, setEditingFlat] = useState<{ flat: Flat; floorName: string } | null>(null)
  const [deletingFlat, setDeletingFlat] = useState<{ flat: Flat; floorName: string } | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const floors: Floor[] = data?.data?.floors ?? []
  const hasAvailableFlats = floors.some((floor) => floor.flats.some((flat) => flat.status === "AVAILABLE"))

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-muted-foreground/40" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">Inventory Control</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setBooking({})}
              disabled={!hasAvailableFlats}
              className="h-10 px-4 border-border font-bold text-[10px] tracking-[0.2em] uppercase rounded-none gap-2"
            >
              <BookOpen className="w-4 h-4" /> Book Flat
            </Button>
            <Button
              onClick={() => setAddingFloor(true)}
              className="h-10 px-4 bg-primary text-black font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-primary/90 rounded-none gap-2"
            >
              <Plus className="w-4 h-4" /> Add Floor
            </Button>
          </div>
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
                onBook={(flat) => setBooking({ initialFlatId: flat.id })}
                onCustomerClick={(flat, floorName) => setCustomerView({ flat, floorName })}
                onAddFlat={(floorId, floorName) => setAddingFlat({ floorId, floorName })}
                onEditFloor={(selectedFloor) => setEditingFloor(selectedFloor)}
                onDeleteFloor={(selectedFloor) => setDeletingFloor(selectedFloor)}
                onEditFlat={(flat, floorName) => setEditingFlat({ flat, floorName })}
                onDeleteFlat={(flat, floorName) => setDeletingFlat({ flat, floorName })}
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

      {editingFloor && (
        <EditFloorDialog
          siteId={siteId}
          floor={editingFloor}
          onClose={() => setEditingFloor(null)}
        />
      )}

      {deletingFloor && (
        <DeleteFloorDialog
          siteId={siteId}
          floor={deletingFloor}
          onClose={() => setDeletingFloor(null)}
        />
      )}

      {editingFlat && (
        <EditFlatDialog
          siteId={siteId}
          flat={editingFlat.flat}
          floorName={editingFlat.floorName}
          projectType={projectType}
          onClose={() => setEditingFlat(null)}
        />
      )}

      {deletingFlat && (
        <DeleteFlatDialog
          siteId={siteId}
          flat={deletingFlat.flat}
          floorName={deletingFlat.floorName}
          onClose={() => setDeletingFlat(null)}
        />
      )}

      {booking && (
        <BookFlatPanel
          siteId={siteId}
          floors={floors}
          initialFlatId={booking.initialFlatId}
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
            createdAt: customerView.flat.customer.createdAt,
          }}
          siteId={siteId}
          siteName={siteName}
          onClose={() => setCustomerView(null)}
        />
      )}
    </>
  )
}
