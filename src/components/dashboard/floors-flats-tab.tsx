"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { bookFlatSchema, BookFlatInput, Floor, Flat, Wing, createFloorSchema, CreateFloorInput, createFlatSchema, CreateFlatInput, updateFlatDetailsSchema, UpdateFlatDetailsInput } from "@/schemas/site.schema"
import {
  useFloors,
  useWings,
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
function getBookingReferenceLabel(paymentMode?: BookFlatInput["paymentMode"]) {
  switch (paymentMode) {
    case "CHEQUE":
      return "Cheque Number"
    case "BANK_TRANSFER":
      return "Bank Transfer Ref / UTR"
    case "UPI":
      return "UPI Transaction ID"
    default:
      return "Reference Number"
  }
}

function getFloorDisplayName(floor: Pick<Floor, "floorName" | "floorNumber">) {
  if (floor.floorName) return floor.floorName;
  if (floor.floorNumber === 0) return "Ground Floor";
  return `Floor ${floor.floorNumber}`;
}

function getFlatDisplayName(flat: Pick<Flat, "customFlatId" | "flatNumber">) {
  return flat.customFlatId || `Flat ${flat.flatNumber}`
}

function getFlatTypeLabel(flatType: Flat["flatType"]) {
  return flatType === "EXISTING_OWNER" ? "Existing Owner" : "Customer"
}

type WingOption = Pick<Wing, "id" | "name">
const UNASSIGNED_WING_FILTER_ID = "__UNASSIGNED__"
const COMMON_UNIT_TYPES = ['1RK', '1BHK', '2BHK', '2.5BHK', '3BHK', '4BHK', 'DUPLEX', 'PENTHOUSE'] as const
const UNIT_TYPE_PICK_OPTIONS = [...COMMON_UNIT_TYPES, 'CUSTOM'] as const

const bookFlatWithSelectionSchema = bookFlatSchema.extend({
  floorId: z.string().min(1, "Select a floor"),
  unitTypePreset: z.enum(UNIT_TYPE_PICK_OPTIONS),
  customUnitType: z.string().trim().optional(),
  flatName: z.string().trim().min(1, "Flat name is required"),
  flatType: z.enum(["CUSTOMER", "EXISTING_OWNER"]).default("CUSTOMER"),
}).superRefine((data, ctx) => {
  if (data.unitTypePreset === "CUSTOM" && !data.customUnitType?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customUnitType"],
      message: "Enter a custom unit type",
    })
  }

  if (data.bookingAmount > 0 && !data.paymentMode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paymentMode"],
      message: "Select the payment mode for the booking amount",
    })
  }

  if (data.bookingAmount > 0 && data.paymentMode && data.paymentMode !== "CASH" && !data.referenceNumber?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["referenceNumber"],
      message: "Reference number is required for non-cash booking payments",
    })
  }
})

type BookFlatWithSelectionInput = z.input<typeof bookFlatWithSelectionSchema>

function AddFloorPanel({
  siteId,
  wings,
  onClose,
}: {
  siteId: string
  wings: WingOption[]
  onClose: () => void
}) {
  const { mutate: createFloor, isPending, error } = useCreateFloor(siteId, { onSuccess: onClose })
  const hasWings = wings.length > 0

  const { register, handleSubmit, watch, setError, clearErrors, formState: { errors } } = useForm<CreateFloorInput>({
    resolver: zodResolver(createFloorSchema),
    defaultValues: {
      floorName: '',
      wingId: hasWings ? wings[0]?.id : undefined,
    },
  })
  const selectedWingId = watch("wingId") ?? ""
  const wingRegister = register("wingId")

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

        <form
          onSubmit={handleSubmit((data) => {
            if (hasWings && !data.wingId) {
              setError("wingId", { type: "manual", message: "Select a wing" })
              return
            }

            clearErrors("wingId")
            createFloor({ floorName: data.floorName, wingId: data.wingId || undefined })
          })}
          className="flex flex-col flex-1"
        >
          <div className="px-8 py-6 flex flex-col gap-6 flex-1">
            {error && (
              <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
                {typeof error === "string" ? error : "Failed to add floor"}
              </div>
            )}

            {hasWings && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Wing</Label>
                <NativeSelect
                  value={selectedWingId}
                  onChange={(event) => {
                    wingRegister.onChange(event)
                    clearErrors("wingId")
                  }}
                  className="w-full"
                  name={wingRegister.name}
                  onBlur={wingRegister.onBlur}
                  ref={wingRegister.ref}
                >
                  {wings.map((wing) => (
                    <NativeSelectOption key={wing.id} value={wing.id}>
                      {wing.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {errors.wingId && <p className="text-[10px] text-destructive">{errors.wingId.message}</p>}
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
  floors,
  wings,
  projectType,
  onClose,
}: {
  siteId: string
  flat: Flat
  floors: Floor[]
  wings: WingOption[]
  projectType: 'NEW_CONSTRUCTION' | 'REDEVELOPMENT'
  onClose: () => void
}) {
  const { mutate: updateFlat, isPending, error } = useUpdateFlatDetails(siteId, { onSuccess: onClose })
  const flatDisplayName = getFlatDisplayName(flat)
  const formId = `edit-flat-form-${flat.id}`
  const currentFloor = floors.find((floorItem) => floorItem.flats.some((flatItem) => flatItem.id === flat.id)) ?? null
  const hasWingSelection = wings.length > 0 && floors.some((floorItem) => Boolean(floorItem.wingId))
  const hasUnassignedFloors = floors.some((floorItem) => !floorItem.wingId)
  const wingOptions = hasWingSelection
    ? [
        ...wings.filter((wing) => floors.some((floorItem) => floorItem.wingId === wing.id)),
        ...(hasUnassignedFloors ? [{ id: UNASSIGNED_WING_FILTER_ID, name: "Unassigned" }] : []),
      ]
    : []
  const initialWingId = hasWingSelection
    ? currentFloor?.wingId ?? (hasUnassignedFloors ? UNASSIGNED_WING_FILTER_ID : wingOptions[0]?.id ?? "")
    : ""
  const [selectedWingId, setSelectedWingId] = useState(initialWingId)

  const selectableFloors = useMemo(() => {
    if (!hasWingSelection) return floors
    if (selectedWingId === UNASSIGNED_WING_FILTER_ID) {
      return floors.filter((floorItem) => !floorItem.wingId)
    }
    return floors.filter((floorItem) => floorItem.wingId === selectedWingId)
  }, [floors, hasWingSelection, selectedWingId])

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<UpdateFlatDetailsInput>({
    resolver: zodResolver(updateFlatDetailsSchema),
    defaultValues: {
      customFlatId: flat.customFlatId ?? "",
      unitType: flat.unitType ?? "",
      floorId: currentFloor?.id ?? "",
      flatType: flat.flatType,
    },
  })

  const floorId = watch("floorId") ?? ""
  const selectedFloor = selectableFloors.find((floorItem) => floorItem.id === floorId) ?? null
  const selectedFlatType = watch("flatType")
  const unitType = watch("unitType") ?? ""
  const currentFloorLabel = currentFloor ? getFloorDisplayName(currentFloor) : "No floor assigned"
  const currentWingLabel = currentFloor?.wingName ?? "Unassigned"
  const flatTypeLabel = flat.flatType === "EXISTING_OWNER" ? "Existing Owner Flat" : "Customer Flat"

  useEffect(() => {
    if (!hasWingSelection) return

    if (!selectedWingId || !wingOptions.some((wing) => wing.id === selectedWingId)) {
      setSelectedWingId(initialWingId)
    }
  }, [hasWingSelection, initialWingId, selectedWingId, wingOptions])

  useEffect(() => {
    if (!selectableFloors.length) {
      setValue("floorId", "", { shouldValidate: true })
      return
    }

    if (!floorId || !selectableFloors.some((floorItem) => floorItem.id === floorId)) {
      const fallbackFloorId =
        (currentFloor && selectableFloors.some((floorItem) => floorItem.id === currentFloor.id) ? currentFloor.id : undefined)
        ?? selectableFloors[0]?.id
        ?? ""
      setValue("floorId", fallbackFloorId, { shouldValidate: true })
    }
  }, [currentFloor, floorId, selectableFloors, setValue])

  const applyUnitTypeValue = (nextValue: string) => {
    setValue("unitType", nextValue, { shouldValidate: true })
  }

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
                unitType: data.unitType?.trim() || undefined,
                floorId: data.floorId || undefined,
                flatType: projectType === "NEW_CONSTRUCTION" ? "CUSTOMER" : data.flatType,
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

          {hasWingSelection && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Wing</Label>
              <NativeSelect
                value={selectedWingId}
                onChange={(event) => {
                  setSelectedWingId(event.target.value)
                }}
                className="w-full"
              >
                {wingOptions.map((wing) => (
                  <NativeSelectOption key={wing.id} value={wing.id}>
                    {wing.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Floor</Label>
            <NativeSelect
              value={floorId}
              onChange={(event) => setValue("floorId", event.target.value, { shouldValidate: true })}
              className="w-full"
            >
              {selectableFloors.map((floorItem) => (
                <NativeSelectOption key={floorItem.id} value={floorItem.id}>
                  {getFloorDisplayName(floorItem)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {errors.floorId && <p className="text-[10px] text-destructive">{errors.floorId.message}</p>}
            {selectableFloors.length === 0 && (
              <p className="text-[10px] text-muted-foreground/60">No floors available in the selected wing.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Unit Type</Label>
            <Input
              value={unitType}
              onChange={(event) => applyUnitTypeValue(event.target.value)}
              placeholder="Type or pick e.g. 2BHK, Shop, Office"
              className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_UNIT_TYPES.map((option) => {
                const isSelected = unitType.trim().toLowerCase() === option.toLowerCase()

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => applyUnitTypeValue(option)}
                    className={cn(
                      "h-7 px-2.5 border text-[10px] font-bold tracking-widest uppercase transition-colors",
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground/70 hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
            {errors.unitType && <p className="text-[10px] text-destructive">{errors.unitType.message}</p>}
          </div>

          <input type="hidden" {...register("flatType")} />

          {projectType === "REDEVELOPMENT" && (
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

          {projectType === "NEW_CONSTRUCTION" && (
            <div className="border border-border bg-muted/20 p-4">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Flat Type</p>
              <p className="mt-2 text-sm font-serif text-foreground">{flatTypeLabel}</p>
              <p className="mt-2 text-[10px] text-muted-foreground/70">
                New construction sites always keep flats under customer inventory.
              </p>
            </div>
          )}

          <div className="border border-border bg-muted/20 p-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Editing</p>
            <p className="mt-2 text-sm font-serif text-foreground">{flatDisplayName}</p>
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              {currentWingLabel} • {currentFloorLabel}
            </p>
            {selectedFloor && (
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                Moving to: {selectedFloor.wingName ?? "Unassigned"} • {getFloorDisplayName(selectedFloor)}
              </p>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              Update the flat ID, unit type, placement, and inventory type from here. Changes apply across the site inventory.
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
  wings,
  projectType,
  preferredWingId,
  preferredFloorId,
  initialFlatId,
  onClose,
}: {
  siteId: string
  floors: Floor[]
  wings: WingOption[]
  projectType: 'NEW_CONSTRUCTION' | 'REDEVELOPMENT'
  preferredWingId?: string
  preferredFloorId?: string
  initialFlatId?: string
  onClose: () => void
}) {
  const { mutateAsync: createFlat, isPending: isCreatingFlat, error: createFlatError } = useCreateFlat(siteId)
  const { mutateAsync: updateFlatDetails, isPending: isUpdatingFlat, error: updateFlatError } = useUpdateFlatDetails(siteId)
  const { mutateAsync: bookFlat, isPending: isBooking, error: bookingError } = useBookFlat(siteId, { onSuccess: onClose })
  const hasWingSelection = wings.length > 0 && floors.some((floor) => Boolean(floor.wingId))
  const hasUnassignedFloors = floors.some((floor) => !floor.wingId)
  const wingOptions = hasWingSelection
    ? [
        ...wings.filter((wing) => floors.some((floor) => floor.wingId === wing.id)),
        ...(hasUnassignedFloors ? [{ id: UNASSIGNED_WING_FILTER_ID, name: "Unassigned" }] : []),
      ]
    : []
  const floorWithInitialFlat = initialFlatId
    ? floors.find((floor) => floor.flats.some((flat) => flat.id === initialFlatId)) ?? null
    : null
  const initialWingId = hasWingSelection
    ? (
        floorWithInitialFlat
          ? floorWithInitialFlat.wingId ?? UNASSIGNED_WING_FILTER_ID
          : undefined
      ) ??
      (preferredWingId && wingOptions.some((wing) => wing.id === preferredWingId)
        ? preferredWingId
        : undefined) ??
      wingOptions[0]?.id ??
      ""
    : ""
  const initialFloorCandidates = hasWingSelection
    ? initialWingId === UNASSIGNED_WING_FILTER_ID
      ? floors.filter((floor) => !floor.wingId)
      : floors.filter((floor) => floor.wingId === initialWingId)
    : floors
  const initialFloorId = floorWithInitialFlat?.id ?? initialFloorCandidates[0]?.id ?? ""
  const resolvedInitialFloorId = floorWithInitialFlat?.id
    ?? (preferredFloorId && initialFloorCandidates.some((floor) => floor.id === preferredFloorId)
      ? preferredFloorId
      : initialFloorCandidates[0]?.id ?? "")
  const initiallySelectedFlat = floorWithInitialFlat && initialFlatId
    ? floorWithInitialFlat.flats.find((flat) => flat.id === initialFlatId) ?? null
    : null

  const [selectedWingId, setSelectedWingId] = useState(initialWingId)
  const [selectedFloorId, setSelectedFloorId] = useState(resolvedInitialFloorId)
  const [flatIdError, setFlatIdError] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookFlatWithSelectionInput>({
    resolver: zodResolver(bookFlatWithSelectionSchema),
    defaultValues: {
      floorId: resolvedInitialFloorId,
      flatName: initiallySelectedFlat ? getFlatDisplayName(initiallySelectedFlat) : "",
      unitTypePreset: (COMMON_UNIT_TYPES.includes((initiallySelectedFlat?.unitType ?? "") as typeof COMMON_UNIT_TYPES[number])
        ? initiallySelectedFlat?.unitType
        : "CUSTOM") as BookFlatWithSelectionInput["unitTypePreset"],
      customUnitType: initiallySelectedFlat?.unitType && !COMMON_UNIT_TYPES.includes(initiallySelectedFlat.unitType as typeof COMMON_UNIT_TYPES[number])
        ? initiallySelectedFlat.unitType
        : "",
      flatType: projectType === "NEW_CONSTRUCTION"
        ? "CUSTOMER"
        : initiallySelectedFlat?.flatType ?? "CUSTOMER",
      name: "",
      phone: "",
      email: "",
      sellingPrice: 0,
      bookingAmount: 0,
      paymentMode: "CASH",
      referenceNumber: "",
    },
  })

  useEffect(() => {
    if (!hasWingSelection) return

    if (!selectedWingId || !wingOptions.some((wing) => wing.id === selectedWingId)) {
      setSelectedWingId(initialWingId)
    }
  }, [hasWingSelection, initialWingId, selectedWingId, wingOptions])

  const wingScopedFloors = useMemo(() => {
    if (!hasWingSelection) {
      return floors
    }

    if (selectedWingId === UNASSIGNED_WING_FILTER_ID) {
      return floors.filter((floor) => !floor.wingId)
    }

    return floors.filter((floor) => floor.wingId === selectedWingId)
  }, [floors, hasWingSelection, selectedWingId])

  useEffect(() => {
    const availableFloorChoices = wingScopedFloors
    const fallbackFloorId =
      (initialFlatId
        ? availableFloorChoices.find((floor) => floor.flats.some((flat) => flat.id === initialFlatId))?.id
        : undefined) ??
      (preferredFloorId && availableFloorChoices.some((floor) => floor.id === preferredFloorId)
        ? preferredFloorId
        : undefined) ??
      availableFloorChoices[0]?.id ??
      ""

    if (!selectedFloorId || !availableFloorChoices.some((floor) => floor.id === selectedFloorId)) {
      setSelectedFloorId(fallbackFloorId)
    }
  }, [initialFlatId, preferredFloorId, selectedFloorId, wingScopedFloors])

  const selectedFloor = wingScopedFloors.find((floor) => floor.id === selectedFloorId) ?? null
  const floorAvailableFlats = selectedFloor?.flats.filter((candidateFlat) => candidateFlat.status === "AVAILABLE") ?? []
  const unitTypePreset = watch("unitTypePreset")
  const customUnitType = watch("customUnitType") || ""
  const unitTypeInputValue = unitTypePreset === "CUSTOM" ? customUnitType : unitTypePreset
  const flatName = watch("flatName") || ""
  const selectedFlatType = watch("flatType") || "CUSTOMER"
  const resolvedUnitType = (unitTypePreset === "CUSTOM" ? customUnitType : unitTypePreset)?.trim() || ""
  const availableFlats = floorAvailableFlats
  const normalizedFlatName = flatName.trim().toLowerCase()
  const matchedAvailableFlat = normalizedFlatName
    ? availableFlats.find((candidateFlat) => getFlatDisplayName(candidateFlat).trim().toLowerCase() === normalizedFlatName) ?? null
    : null

  useEffect(() => {
    setValue("floorId", selectedFloorId, { shouldValidate: true })
  }, [selectedFloorId, setValue])

  useEffect(() => {
    if (!matchedAvailableFlat) return

    setValue("unitTypePreset", (
      COMMON_UNIT_TYPES.includes((matchedAvailableFlat.unitType ?? "") as typeof COMMON_UNIT_TYPES[number])
        ? matchedAvailableFlat.unitType
        : "CUSTOM"
    ) as BookFlatWithSelectionInput["unitTypePreset"], { shouldValidate: true })

    setValue(
      "customUnitType",
      matchedAvailableFlat.unitType && !COMMON_UNIT_TYPES.includes(matchedAvailableFlat.unitType as typeof COMMON_UNIT_TYPES[number])
        ? matchedAvailableFlat.unitType
        : "",
      { shouldValidate: true },
    )

    setValue(
      "flatType",
      projectType === "NEW_CONSTRUCTION" ? "CUSTOMER" : matchedAvailableFlat.flatType,
      { shouldValidate: true },
    )
  }, [matchedAvailableFlat, projectType, setValue])

  const applyUnitTypeValue = (nextValue: string) => {
    const normalizedValue = nextValue.trim()
    const matchedCommonUnitType = COMMON_UNIT_TYPES.find(
      (unitTypeOption) => unitTypeOption.toLowerCase() === normalizedValue.toLowerCase(),
    )

    if (matchedCommonUnitType) {
      setValue("unitTypePreset", matchedCommonUnitType, { shouldValidate: true })
      setValue("customUnitType", "", { shouldValidate: true })
      return
    }

    setValue("unitTypePreset", "CUSTOM", { shouldValidate: true })
    setValue("customUnitType", nextValue, { shouldValidate: true })
  }

  const effectiveFlatType = projectType === "NEW_CONSTRUCTION"
    ? "CUSTOMER"
    : matchedAvailableFlat?.flatType ?? selectedFlatType
  const isExistingOwner = effectiveFlatType === "EXISTING_OWNER"
  const sellingPrice = watch("sellingPrice") || 0
  const bookingAmount = watch("bookingAmount") || 0
  const bookingPaymentMode = watch("paymentMode") || "CASH"
  const remaining = Number(sellingPrice) - Number(bookingAmount)

  useEffect(() => {
    if (Number(bookingAmount) <= 0 || bookingPaymentMode === "CASH") {
      setValue("referenceNumber", "", { shouldValidate: true })
    }
  }, [bookingAmount, bookingPaymentMode, setValue])

  const onSubmit = async (data: BookFlatWithSelectionInput) => {
    if (!selectedFloor) {
      setFlatIdError("Select a floor before booking.")
      return
    }

    const trimmedFlatName = data.flatName.trim()
    if (!trimmedFlatName) {
      setFlatIdError("Flat name is required.")
      return
    }

    const nextUnitType = (data.unitTypePreset === "CUSTOM" ? data.customUnitType : data.unitTypePreset)?.trim()
    if (!nextUnitType) {
      setFlatIdError("Unit type is required.")
      return
    }

    let targetFlatId = ""

    if (matchedAvailableFlat) {
      const currentDisplayFlatId = getFlatDisplayName(matchedAvailableFlat)
      const nextFlatType = projectType === "NEW_CONSTRUCTION" ? "CUSTOMER" : data.flatType
      if (
        trimmedFlatName !== currentDisplayFlatId ||
        matchedAvailableFlat.unitType !== nextUnitType ||
        matchedAvailableFlat.flatType !== nextFlatType
      ) {
        await updateFlatDetails({
          flatId: matchedAvailableFlat.id,
          data: {
            customFlatId: trimmedFlatName,
            unitType: nextUnitType,
            flatType: nextFlatType,
          },
        })
      }

      targetFlatId = matchedAvailableFlat.id
    } else {
      const createdFlat = await createFlat({
        floorId: selectedFloor.id,
        data: {
          customFlatId: trimmedFlatName,
          unitType: nextUnitType,
          flatType: projectType === "NEW_CONSTRUCTION" ? "CUSTOMER" : data.flatType,
        },
      })

      targetFlatId = createdFlat?.data?.flat?.id ?? ""
      if (!targetFlatId) {
        setFlatIdError("Could not prepare the flat entry. Please retry.")
        return
      }
    }

    setFlatIdError(null)
    await bookFlat({
      flatId: targetFlatId,
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        sellingPrice: data.sellingPrice,
        bookingAmount: data.bookingAmount,
        paymentMode: data.bookingAmount > 0 ? data.paymentMode : undefined,
        referenceNumber: data.bookingAmount > 0 ? data.referenceNumber?.trim() || undefined : undefined,
      },
    })
  }

  const isPending = isUpdatingFlat || isCreatingFlat || isBooking

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">

        {/* Header */}
        <div className="px-6 pt-7 pb-4 border-b border-border">
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
            {hasWingSelection
              ? "Select wing, floor, unit type, and flat name. Then fill the customer details to complete booking."
              : "Choose floor, unit type, and flat name. Then fill the customer details to complete booking."}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="px-6 py-5 flex flex-col gap-5 flex-1">
            <input type="hidden" {...register("floorId")} />

            {(createFlatError || updateFlatError || bookingError) && (
              <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3">
                {getApiErrorMessage(createFlatError ?? updateFlatError ?? bookingError, "Failed to complete booking.")}
              </div>
            )}

            {floors.length === 0 && (
              <div className="border border-border bg-muted/20 p-4 text-[11px] leading-relaxed text-muted-foreground">
                Add at least one floor first. Then you can create and book a flat directly from this panel.
              </div>
            )}

            {floors.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Unit Selection</p>

                {hasWingSelection && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Wing</Label>
                    <NativeSelect
                      value={selectedWingId}
                      onChange={(event) => {
                        setSelectedWingId(event.target.value)
                        setSelectedFloorId("")
                      }}
                      className="w-full"
                    >
                      {wingOptions.map((wing) => (
                        <NativeSelectOption key={wing.id} value={wing.id}>
                          {wing.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Floor</Label>
                  <NativeSelect
                    value={selectedFloorId}
                    onChange={(event) => {
                      setSelectedFloorId(event.target.value)
                    }}
                    className="w-full"
                  >
                    {wingScopedFloors.map((floor) => (
                      <NativeSelectOption key={floor.id} value={floor.id}>
                        {getFloorDisplayName(floor)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {errors.floorId && <p className="text-[10px] text-destructive">{errors.floorId.message}</p>}
                  {wingScopedFloors.length === 0 && (
                    <p className="text-[10px] text-muted-foreground/60">No floors found in the selected wing.</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Unit Type</Label>
                  <Input
                    value={unitTypeInputValue || ""}
                    onChange={(event) => applyUnitTypeValue(event.target.value)}
                    placeholder="Type or pick e.g. 2BHK, Shop, Office"
                    className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COMMON_UNIT_TYPES.map((option) => {
                      const isSelected = resolvedUnitType.toLowerCase() === option.toLowerCase()

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => applyUnitTypeValue(option)}
                          className={cn(
                            "h-7 px-2.5 border text-[10px] font-bold tracking-widest uppercase transition-colors",
                            isSelected
                              ? "border-primary/50 bg-primary/10 text-foreground"
                              : "border-border bg-background text-muted-foreground/70 hover:border-primary/30 hover:text-foreground",
                          )}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                  {errors.customUnitType && <p className="text-[10px] text-destructive">{errors.customUnitType.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Flat Name</Label>
                  <Input
                    value={flatName}
                    onChange={(event) => {
                      setValue("flatName", event.target.value, { shouldValidate: true })
                      setFlatIdError(null)
                    }}
                    placeholder="e.g. A-101, Shop-1, G-01"
                    className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                  />
                  {flatIdError && <p className="text-[10px] text-destructive">{flatIdError}</p>}
                  {errors.flatName && <p className="text-[10px] text-destructive">{errors.flatName.message}</p>}
                  <p className="text-[10px] text-muted-foreground/60">
                    {matchedAvailableFlat
                      ? "Matching available flat found. This entry will be booked."
                      : "This flat entry will be added and booked directly in one step."}
                  </p>
                </div>

                {projectType === "REDEVELOPMENT" && (
                  <div className="flex flex-col gap-1.5">
                    <input type="hidden" {...register("flatType")} />
                    <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Buyer Type</Label>
                    <NativeSelect
                      value={selectedFlatType}
                      onChange={(event) => setValue("flatType", event.target.value as "CUSTOMER" | "EXISTING_OWNER", { shouldValidate: true })}
                      className="w-full"
                    >
                      <NativeSelectOption value="CUSTOMER">New Customer</NativeSelectOption>
                      <NativeSelectOption value="EXISTING_OWNER">Existing Owner</NativeSelectOption>
                    </NativeSelect>
                  </div>
                )}

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
                  {isExistingOwner ? "Settlement Value" : "Base Price"}
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
                      : "This is the starting base price. GST, charges, discounts, and credits can be added later from the customer profile."}
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
                {errors.bookingAmount && <p className="text-[10px] text-destructive">{errors.bookingAmount.message}</p>}
              </div>

              {Number(bookingAmount) > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Payment Mode</Label>
                    <select
                      value={bookingPaymentMode}
                      onChange={(event) => setValue("paymentMode", event.target.value as BookFlatInput["paymentMode"], { shouldValidate: true })}
                      className="h-11 rounded-none border border-input bg-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                    </select>
                    {errors.paymentMode && <p className="text-[10px] text-destructive">{errors.paymentMode.message}</p>}
                  </div>

                  {bookingPaymentMode !== "CASH" ? (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">
                        {getBookingReferenceLabel(bookingPaymentMode)}
                      </Label>
                      <Input
                        placeholder={getBookingReferenceLabel(bookingPaymentMode)}
                        className="h-11 bg-muted border-none rounded-none text-sm focus-visible:bg-card"
                        {...register("referenceNumber")}
                      />
                      {errors.referenceNumber && <p className="text-[10px] text-destructive">{errors.referenceNumber.message}</p>}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Reference Number</Label>
                      <div className="flex h-11 items-center border border-dashed border-border bg-muted/40 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Cash payment does not require a reference number.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="border border-border divide-y divide-border mt-2">
                <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Base Price</span>
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
          <div className="px-6 py-5 border-t border-border flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isPending || !selectedFloor}
              className="w-full h-14 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase rounded-none gap-2"
            >
              {isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    {isExistingOwner ? "Create Owner Entry" : "Book Flat"}
                  </>
                )
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
  const flatTypeLabel = isOwnerFlat ? "Existing Owner" : "Customer"
  const c = flat.customer
  const pct = c
    ? c.sellingPrice > 0
      ? Math.min(100, (c.amountPaid / c.sellingPrice) * 100)
      : c.remaining <= 0
        ? 100
        : 0
    : 0
  const isSold = flat.status === "SOLD"
  const isBooked = flat.status === "BOOKED"
  const isAvailable = flat.status === "AVAILABLE"

  return (
    <div className="px-3 py-3">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "h-2.5 w-2.5 rounded-full shrink-0",
              isAvailable ? "bg-emerald-500" : isSold ? "bg-blue-500" : "bg-amber-500"
            )} />
            <p className="truncate text-base font-semibold text-foreground">{flatDisplayName}</p>
            <span className={cn(
              "inline-flex px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border",
              isAvailable
                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/25"
                : isSold
                  ? "bg-blue-500/15 text-blue-700 border-blue-500/25"
                  : "bg-amber-500/15 text-amber-700 border-amber-500/25"
            )}>
              {isAvailable ? "Available" : isSold ? "Sold" : "Booked"}
            </span>
            <span className={cn(
              "inline-flex px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border",
              isOwnerFlat
                ? "bg-violet-500/15 text-violet-700 border-violet-500/25"
                : "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20"
            )}>
              {flatTypeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/75">
            <span>{flat.unitType || "Unit type pending"}</span>
            {c ? (
              <button
                type="button"
                onClick={() => onCustomerClick(flat)}
                className="max-w-full truncate text-left text-foreground/85 hover:underline"
              >
                {c.name}
              </button>
            ) : (
              <span>No customer assigned</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {c ? (
            <>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                <span>Payment</span>
                <span>{pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    isSold ? "bg-emerald-500" : isBooked ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/80">
                {formatINR(c.amountPaid)} / {formatINR(c.sellingPrice)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/45">Ready to book</p>
              <p className="text-[11px] text-muted-foreground/70">Choose wing, floor, unit type and customer details.</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:justify-end">
          {isAvailable ? (
            <>
              <Button
                type="button"
                onClick={() => onBook(flat)}
                className="h-8 px-3 rounded-md text-[10px] font-bold tracking-widest uppercase gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" /> Book
              </Button>
              <button
                type="button"
                onClick={() => onEdit(flat)}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground/70 transition-colors hover:text-foreground"
                aria-label={`Edit ${flatDisplayName}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(flat)}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground/70 transition-colors hover:text-red-500"
                aria-label={`Delete ${flatDisplayName}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onCustomerClick(flat)}
                disabled={!c}
                className="h-8 px-3 rounded-md text-[10px] font-bold tracking-widest uppercase"
              >
                View
              </Button>
              <button
                type="button"
                onClick={() => onEdit(flat)}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground/70 transition-colors hover:text-foreground"
                aria-label={`Edit ${flatDisplayName}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Floor Row ─────────────────────────────────────────
function FloorRow({
  floor,
  defaultOpen,
  onBook,
  onCustomerClick,
  onBookFloor,
  onEditFloor,
  onDeleteFloor,
  onEditFlat,
  onDeleteFlat,
}: {
  floor: Floor
  defaultOpen: boolean
  onBook: (flat: Flat, floorName: string) => void
  onCustomerClick: (flat: Flat, floorName: string) => void
  onBookFloor: (floor: Floor) => void
  onEditFloor: (floor: Floor) => void
  onDeleteFloor: (floor: Floor) => void
  onEditFlat: (flat: Flat, floorName: string) => void
  onDeleteFlat: (flat: Flat, floorName: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [page, setPage] = useState(1)

  const sold = floor.flats.filter((flatItem) => flatItem.status === "SOLD").length
  const booked = floor.flats.filter((flatItem) => flatItem.status === "BOOKED").length
  const available = floor.flats.filter((flatItem) => flatItem.status === "AVAILABLE").length
  const ownerFlats = floor.flats.filter((flatItem) => flatItem.flatType === "EXISTING_OWNER").length
  const customerFlats = Math.max(0, floor.flats.length - ownerFlats)
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(floor.flats.length / pageSize))
  const pagedFlats = floor.flats.slice((page - 1) * pageSize, page * pageSize)
  const floorDisplayName = getFloorDisplayName(floor)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  return (
    <div className="border border-border/80 bg-background">
      <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{floorDisplayName}</h3>
            {floor.wingName && (
              <span className="px-2 py-0.5 bg-muted text-[9px] font-bold tracking-widest uppercase text-muted-foreground/60">
                {floor.wingName}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest">
            <span className="px-2 py-0.5 bg-muted text-muted-foreground/70">{floor.flats.length} Flats</span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600">{available} Available</span>
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600">{booked} Booked</span>
            <span className="px-2 py-0.5 bg-foreground/10 text-foreground/70">{sold} Sold</span>
            <span className="px-2 py-0.5 bg-sky-500/10 text-sky-700">{customerFlats} Customer</span>
            <span className="px-2 py-0.5 bg-violet-500/15 text-violet-700">{ownerFlats} Existing Owner</span>
          </div>
        </button>

        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onEditFloor(floor)}
            className="flex h-8 w-8 items-center justify-center rounded-none border border-border p-0 text-muted-foreground/70 hover:bg-muted hover:text-foreground"
            aria-label={`Edit ${floorDisplayName}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteFloor(floor)}
            className="flex h-8 w-8 items-center justify-center rounded-none border border-border p-0 text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-500"
            aria-label={`Delete ${floorDisplayName}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onBookFloor(floor)}
            className="flex h-8 w-8 items-center justify-center rounded-none border border-border text-muted-foreground/70 hover:bg-primary hover:text-black"
            aria-label={`Book a flat in ${floorDisplayName}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setOpen((isOpen) => !isOpen)}
            className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground/60 hover:text-foreground"
            aria-label={open ? `Collapse ${floorDisplayName}` : `Expand ${floorDisplayName}`}
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1">
          {floor.flats.length === 0 ? (
            <button
              type="button"
              onClick={() => onBookFloor(floor)}
              className="w-full border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors p-3 flex flex-col items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5 text-muted-foreground/30" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/45">Book A Flat</p>
            </button>
          ) : (
            <div className="border border-border/70 bg-background">
              <div className="hidden md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] md:items-center px-3 py-2 border-b border-border/70 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/55">
                <span>Flat</span>
                <span>Payment</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-border/70">
                {pagedFlats.map((flatItem) => (
                  <FlatCard
                    key={flatItem.id}
                    flat={flatItem}
                    onBook={(selectedFlat) => onBook(selectedFlat, floorDisplayName)}
                    onCustomerClick={(selectedFlat) => onCustomerClick(selectedFlat, floorDisplayName)}
                    onEdit={(selectedFlat) => onEditFlat(selectedFlat, floorDisplayName)}
                    onDelete={(selectedFlat) => onDeleteFlat(selectedFlat, floorDisplayName)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-border/70 bg-muted/10">
                  <p className="text-[10px] text-muted-foreground/60">
                    Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, floor.flats.length)} of {floor.flats.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      disabled={page === 1}
                      className="h-7 px-2 border border-border text-[10px] font-bold tracking-widest uppercase disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                      {page}/{totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                      disabled={page === totalPages}
                      className="h-7 px-2 border border-border text-[10px] font-bold tracking-widest uppercase disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
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
  const router = useRouter()
  const { data, isLoading } = useFloors(siteId)
  const { data: wingsData } = useWings(siteId)
  const [booking, setBooking] = useState<{ initialFlatId?: string; preferredFloorId?: string } | null>(null)
  const [addingFloor, setAddingFloor] = useState(false)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
  const [deletingFloor, setDeletingFloor] = useState<Floor | null>(null)
  const [editingFlat, setEditingFlat] = useState<{ flat: Flat; floorName: string } | null>(null)
  const [deletingFlat, setDeletingFlat] = useState<{ flat: Flat; floorName: string } | null>(null)
  const [selectedWingFilterId, setSelectedWingFilterId] = useState("")

  const floors: Floor[] = data?.data?.floors ?? []
  const floorWingOptions = useMemo(() => {
    const grouped = new Map<string, WingOption>()
    floors.forEach((floor) => {
      if (!floor.wingId || !floor.wingName) return
      grouped.set(floor.wingId, { id: floor.wingId, name: floor.wingName })
    })
    return Array.from(grouped.values())
  }, [floors])
  const siteWings: WingOption[] = (wingsData?.data?.wings ?? []).map((wing) => ({
    id: wing.id,
    name: wing.name,
  }))
  const effectiveWings = siteWings.length > 0 ? siteWings : floorWingOptions
  const hasUnassignedFloors = floors.some((floor) => !floor.wingId)
  const showWingFilter = effectiveWings.length > 1
  const wingFilterOptions = useMemo(() => {
    if (!showWingFilter) return []

    const options = [...effectiveWings]
    if (hasUnassignedFloors) {
      options.push({ id: UNASSIGNED_WING_FILTER_ID, name: "Unassigned" })
    }
    return options
  }, [effectiveWings, hasUnassignedFloors, showWingFilter])

  useEffect(() => {
    if (!showWingFilter) {
      if (selectedWingFilterId !== "") {
        setSelectedWingFilterId("")
      }
      return
    }

    if (!wingFilterOptions.some((wing) => wing.id === selectedWingFilterId)) {
      setSelectedWingFilterId(wingFilterOptions[0]?.id ?? "")
    }
  }, [selectedWingFilterId, showWingFilter, wingFilterOptions])

  const visibleFloors = useMemo(() => {
    if (!showWingFilter || !selectedWingFilterId) {
      return floors
    }

    if (selectedWingFilterId === UNASSIGNED_WING_FILTER_ID) {
      return floors.filter((floor) => !floor.wingId)
    }

    return floors.filter((floor) => floor.wingId === selectedWingFilterId)
  }, [floors, selectedWingFilterId, showWingFilter])

  const canOpenBooking = visibleFloors.length > 0
  const visibleFlatCount = visibleFloors.reduce((count, floor) => count + floor.flats.length, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-muted-foreground/40" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">Inventory Control</span>
            </div>

            {showWingFilter && (
              <div className="flex items-center gap-2 border-l border-border/60 pl-3">
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/55">Wing</span>
                <NativeSelect
                  value={selectedWingFilterId}
                  onChange={(event) => setSelectedWingFilterId(event.target.value)}
                  className="h-8 min-w-36"
                >
                  {wingFilterOptions.map((wing) => (
                    <NativeSelectOption key={wing.id} value={wing.id}>
                      {wing.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}

            {floors.length > 0 && (
              <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/45">
                {visibleFloors.length} Floors • {visibleFlatCount} Flats
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setBooking({})}
              disabled={!canOpenBooking}
              className="h-10 px-4 border-border font-bold text-[10px] tracking-[0.2em] uppercase rounded-none gap-2"
            >
              <BookOpen className="w-4 h-4" /> Book Flat
            </Button>
            {floors.length === 0 && (
              <Button
                onClick={() => setAddingFloor(true)}
                className="h-10 px-4 bg-primary text-black font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-primary/90 rounded-none gap-2"
              >
                <Plus className="w-4 h-4" /> Add Floor
              </Button>
            )}
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
        ) : visibleFloors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border bg-muted/10 gap-2">
            <p className="text-sm text-muted-foreground uppercase tracking-widest opacity-60">No floors in this wing yet</p>
            <p className="text-[11px] text-muted-foreground/60">Select a different wing or add a floor for this wing.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleFloors.map((floor, i) => (
              <FloorRow
                key={floor.id}
                floor={floor}
                defaultOpen={i === 0}
                onBook={(flat) => setBooking({ initialFlatId: flat.id })}
                onCustomerClick={(flat) => {
                  if (flat.customer?.id) router.push(`/customers/${flat.customer.id}`)
                }}
                onBookFloor={(selectedFloor) => setBooking({ preferredFloorId: selectedFloor.id })}
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
          wings={effectiveWings}
          onClose={() => setAddingFloor(false)}
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
          floors={floors}
          wings={effectiveWings}
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
          wings={effectiveWings}
          projectType={projectType}
          preferredWingId={selectedWingFilterId || undefined}
          preferredFloorId={booking.preferredFloorId}
          initialFlatId={booking.initialFlatId}
          onClose={() => setBooking(null)}
        />
      )}

    </>
  )
}
