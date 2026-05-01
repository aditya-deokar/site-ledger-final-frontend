"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Loader2, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import {
  useAddCustomerAgreementLine,
  useDeleteCustomerAgreementLine,
  useUpdateCustomerAgreementLine,
} from "@/hooks/api/customer.hooks"
import { getApiErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"
import {
  type CustomerAgreement,
  type CustomerAgreementLine,
  type CustomerAgreementLineType,
  customerAgreementLineSchema,
} from "@/schemas/customer.schema"

function formatINR(value: number) {
  return "\u20B9" + value.toLocaleString("en-IN")
}

function formatSignedINR(value: number) {
  if (value < 0) return `- ${formatINR(Math.abs(value))}`
  return formatINR(value)
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "-"

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase()
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function parseOptionalNumber(value?: string) {
  if (!value?.trim()) return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const LINE_TYPE_LABELS: Record<CustomerAgreementLineType, string> = {
  BASE_PRICE: "Base Price",
  CHARGE: "Charge",
  TAX: "Tax / GST",
  DISCOUNT: "Discount",
  CREDIT: "Credit",
}

const MUTABLE_LINE_TYPES: CustomerAgreementLineType[] = ["CHARGE", "TAX", "DISCOUNT"]

function defaultAffectsProfit(type: CustomerAgreementLineType) {
  return type !== "TAX"
}

function getLineTone(type: CustomerAgreementLineType) {
  switch (type) {
    case "BASE_PRICE":
      return "bg-primary/10 text-primary"
    case "CHARGE":
      return "bg-sky-500/10 text-sky-700"
    case "TAX":
      return "bg-amber-500/10 text-amber-700"
    case "DISCOUNT":
      return "bg-emerald-500/10 text-emerald-700"
    case "CREDIT":
      return "bg-violet-500/10 text-violet-700"
    default:
      return "bg-muted text-muted-foreground"
  }
}

type AgreementDraft = {
  type: CustomerAgreementLineType
  label: string
  amount: string
  ratePercent?: string
  calculationMode?: "FIXED_AMOUNT" | "PERCENTAGE"
  note: string
  affectsProfit: boolean
}

function createDraft(line?: CustomerAgreementLine | null): AgreementDraft {
  const type = line?.type ?? "CHARGE"

  return {
    type,
    label: line?.label ?? "",
    amount: line ? String(line.amount) : "",
    ratePercent:
      line?.ratePercent !== null && line?.ratePercent !== undefined
        ? String(line.ratePercent)
        : undefined,
    calculationMode:
      line?.ratePercent !== null && line?.ratePercent !== undefined
        ? "PERCENTAGE"
        : "FIXED_AMOUNT",
    note: line?.note ?? "",
    affectsProfit: line?.affectsProfit ?? defaultAffectsProfit(type),
  }
}

function AgreementSummaryTile({
  compact = false,
  label,
  tone = "default",
  value,
}: {
  compact?: boolean
  label: string
  tone?: "default" | "danger" | "success" | "primary"
  value: string
}) {
  return (
    <div
      className={cn(
        "border",
        compact ? "px-2 py-2" : "px-3 py-3",
        tone === "danger" && "border-red-500/20 bg-red-500/5",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/5",
        tone === "primary" && "border-primary/20 bg-primary/5",
        tone === "default" && "border-border bg-muted/20",
      )}
    >
      <p className={cn("font-bold uppercase tracking-[0.22em] text-muted-foreground/55", compact ? "text-[7px]" : "text-[9px]")}>
        {label}
      </p>
      <p className={cn("font-serif text-foreground", compact ? "mt-1 text-[12px]" : "mt-2 text-sm")}>
        {value}
      </p>
    </div>
  )
}

function AgreementItemCard({
  canEdit,
  compact,
  line,
  onDelete,
  onEdit,
}: {
  canEdit: boolean
  compact: boolean
  line: CustomerAgreementLine
  onDelete?: () => void
  onEdit?: () => void
}) {
  const isBaseLine = line.type === "BASE_PRICE"

  return (
    <div className={cn("border border-border bg-muted/10", compact ? "p-2.5" : "p-4")}>
      <div className={cn("flex justify-between gap-3", compact ? "items-start" : "flex-col gap-3 sm:flex-row sm:items-start")}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em]", getLineTone(line.type))}>
              {LINE_TYPE_LABELS[line.type]}
            </span>
            <h4 className={cn("text-foreground", compact ? "text-[12px] font-semibold leading-snug" : "text-sm font-medium")}>
              {line.label}
            </h4>
          </div>

          {line.note ? (
            <p className={cn("mt-1.5 text-foreground/75", compact ? "text-[10px] leading-snug" : "text-sm")}>
              {line.note}
            </p>
          ) : null}

          <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground/60", compact ? "text-[9px]" : "text-[10px]")}>
            <span>{formatShortDate(line.createdAt)}</span>
            <span>{line.affectsProfit ? "Counts in profit" : "Pass-through"}</span>
          </div>
        </div>

        <div className={cn("shrink-0 text-right", compact ? "space-y-1.5" : "space-y-2")}>
          <div>
            <p className={cn(compact ? "text-[13px] font-semibold" : "text-lg font-serif", line.signedAmount < 0 ? "text-emerald-700" : "text-foreground")}>
              {formatSignedINR(line.signedAmount)}
            </p>
            {!compact ? (
              <p className="text-[10px] text-muted-foreground/55">
                {isBaseLine
                  ? line.affectsProfit
                    ? "Counts in profit"
                    : "Pass-through only"
                  : line.signedAmount < 0
                    ? "Reduces customer total"
                    : "Adds to customer total"}
              </p>
            ) : null}
          </div>

          {canEdit ? (
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onEdit}
                className={cn("gap-1 rounded-none text-[8px] font-bold uppercase tracking-[0.16em]", compact ? "h-6 px-2" : "h-8")}
              >
                <Pencil className="h-3 w-3" />
                {compact ? "Edit" : isBaseLine ? "Edit Base" : "Edit"}
              </Button>
              {!isBaseLine ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  className={cn(
                    "gap-1 rounded-none border-red-500/30 text-[8px] font-bold uppercase tracking-[0.16em] text-red-500 hover:bg-red-500/5",
                    compact ? "h-6 px-2" : "h-8",
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                  {compact ? "Remove" : "Remove"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function CustomerAgreementPanel({
  customerId,
  siteId,
  canEdit,
  agreement,
  isLoading,
  contextLabel,
  compact = false,
}: {
  customerId: string
  siteId: string
  canEdit: boolean
  agreement?: CustomerAgreement
  isLoading?: boolean
  contextLabel?: string
  compact?: boolean
}) {
  const [draft, setDraft] = useState<AgreementDraft>(() => createDraft())
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [editingLine, setEditingLine] = useState<CustomerAgreementLine | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerAgreementLine | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { mutateAsync: addLine, isPending: isAdding } = useAddCustomerAgreementLine({
    onSuccess: () => {
      setFormMode(null)
      setEditingLine(null)
      setDraft(createDraft())
      setFormError(null)
    },
  })
  const { mutateAsync: updateLine, isPending: isUpdating } = useUpdateCustomerAgreementLine({
    onSuccess: () => {
      setFormMode(null)
      setEditingLine(null)
      setDraft(createDraft())
      setFormError(null)
    },
  })
  const { mutateAsync: deleteLine, isPending: isDeleting } = useDeleteCustomerAgreementLine({
    onSuccess: () => {
      setDeleteTarget(null)
      setFormMode(null)
      setEditingLine(null)
      setFormError(null)
    },
  })

  const totals = agreement?.totals
  const lines = agreement?.lines ?? []
  const baseLine = useMemo(() => lines.find((line) => line.type === "BASE_PRICE") ?? null, [lines])
  const adjustmentLines = useMemo(() => lines.filter((line) => line.type !== "BASE_PRICE"), [lines])
  const isSubmitting = isAdding || isUpdating || isDeleting
  const baseCalculationAmount = baseLine?.amount ?? totals?.basePrice ?? 0

  const openCreate = () => {
    setDraft(createDraft())
    setEditingLine(null)
    setFormMode("create")
    setFormError(null)
  }

  const openEdit = (line: CustomerAgreementLine) => {
    setDraft(createDraft(line))
    setEditingLine(line)
    setFormMode("edit")
    setFormError(null)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditingLine(null)
    setDraft(createDraft())
    setFormError(null)
  }

  const handleTypeChange = (type: CustomerAgreementLineType) => {
    setDraft((current) => ({
      ...current,
      type,
      affectsProfit: defaultAffectsProfit(type),
    }))
  }

  const submitLabel = editingLine
    ? editingLine.type === "BASE_PRICE"
      ? "Update Base Price"
      : "Update Pricing Item"
    : "Add Pricing Item"

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const parsedRatePercent = parseOptionalNumber(draft.ratePercent)
    const parsedFixedAmount = parseOptionalNumber(draft.amount) ?? 0
    const computedPercentageAmount =
      parsedRatePercent !== undefined
        ? roundMoney(baseCalculationAmount * (parsedRatePercent / 100))
        : 0

    if (draft.type === "TAX" && (parsedRatePercent === undefined || parsedRatePercent <= 0)) {
      setFormError("Tax lines need a percentage greater than zero.")
      return
    }

    if (draft.type === "DISCOUNT" && draft.calculationMode === "PERCENTAGE" && (parsedRatePercent === undefined || parsedRatePercent <= 0)) {
      setFormError("Percentage discount needs a percentage greater than zero.")
      return
    }

    if (draft.type === "DISCOUNT" && draft.calculationMode !== "PERCENTAGE" && parsedFixedAmount <= 0) {
      setFormError("Fixed discount needs an amount greater than zero.")
      return
    }

    const submissionData: Record<string, unknown> = {
      type: draft.type,
      label: draft.label,
      note: draft.note,
      affectsProfit: draft.affectsProfit,
    }

    if (draft.type === "TAX") {
      submissionData.ratePercent = parsedRatePercent
      submissionData.calculationBase = baseCalculationAmount
      submissionData.amount = computedPercentageAmount
    } else if (draft.type === "DISCOUNT") {
      if (draft.calculationMode === "PERCENTAGE") {
        submissionData.ratePercent = parsedRatePercent
        submissionData.calculationBase = baseCalculationAmount
        submissionData.amount = computedPercentageAmount
      } else {
        submissionData.amount = parsedFixedAmount
      }
    } else {
      submissionData.amount = parsedFixedAmount
    }

    const parsed = customerAgreementLineSchema.safeParse(submissionData)

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check the agreement details.")
      return
    }

    setFormError(null)

    try {
      if (editingLine) {
        await updateLine({
          customerId,
          lineId: editingLine.id,
          siteId,
          data: parsed.data,
        })
        return
      }

      await addLine({
        customerId,
        siteId,
        data: parsed.data,
      })
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Agreement update failed."))
    }
  }

  const formPanelOpen = Boolean(formMode || formError)

  const formFields = (
    <>
      {formError ? (
        <div className="border border-destructive/30 bg-destructive/10 p-3 text-[11px] text-destructive">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Type</Label>
          <NativeSelect
            value={draft.type}
            onChange={(event) => handleTypeChange(event.target.value as CustomerAgreementLineType)}
            disabled={editingLine?.type === "BASE_PRICE"}
            className="w-full"
          >
            {editingLine?.type === "BASE_PRICE" ? (
              <NativeSelectOption value="BASE_PRICE">{LINE_TYPE_LABELS.BASE_PRICE}</NativeSelectOption>
            ) : (
              MUTABLE_LINE_TYPES.map((type) => (
                <NativeSelectOption key={type} value={type}>
                  {LINE_TYPE_LABELS[type]}
                </NativeSelectOption>
              ))
            )}
          </NativeSelect>
        </div>

        {draft.type === "TAX" ? (
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Percentage (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={draft.ratePercent || ""}
              onChange={(event) => setDraft((current) => ({ ...current, ratePercent: event.target.value }))}
              className="h-10 rounded-none border-none bg-muted text-sm"
              placeholder="e.g. 18"
            />
          </div>
        ) : null}

        {draft.type === "DISCOUNT" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Discount Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 border border-border bg-muted/20 p-3 cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="discountType"
                    value="PERCENTAGE"
                    checked={draft.calculationMode === "PERCENTAGE"}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      calculationMode: event.target.value as "PERCENTAGE",
                      ratePercent: current.ratePercent,
                      amount: "",
                    }))}
                    className="text-primary"
                  />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Percentage</span>
                </label>
                <label className="flex items-center gap-2 border border-border bg-muted/20 p-3 cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="discountType"
                    value="FIXED_AMOUNT"
                    checked={draft.calculationMode === "FIXED_AMOUNT"}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      calculationMode: event.target.value as "FIXED_AMOUNT",
                      ratePercent: undefined,
                      amount: current.amount,
                    }))}
                    className="text-primary"
                  />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Fixed Amount</span>
                </label>
              </div>
            </div>

            {draft.calculationMode === "PERCENTAGE" ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Percentage (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={draft.ratePercent || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, ratePercent: event.target.value }))}
                  className="h-10 rounded-none border-none bg-muted text-sm"
                  placeholder="e.g. 5"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Amount (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.amount || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                  className="h-10 rounded-none border-none bg-muted text-sm"
                  placeholder="0.00"
                />
              </div>
            )}
          </>
        ) : null}

        {(draft.type === "CHARGE" || draft.type === "BASE_PRICE") ? (
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Amount (INR)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={draft.amount || ""}
              onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
              className="h-10 rounded-none border-none bg-muted text-sm"
              placeholder="0.00"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Label</Label>
        <Input
          value={draft.label}
          onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          className="h-10 rounded-none border-none bg-muted text-sm"
          placeholder={draft.type === "TAX" ? "GST, Registration, Stamp Duty" : "Parking, Floor Rise, Discount"}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Note</Label>
        <Textarea
          rows={3}
          value={draft.note}
          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          className="rounded-none border-none bg-muted text-sm"
          placeholder="Optional context for this pricing item"
        />
      </div>

      <label className="flex items-start gap-3 border border-border bg-muted/20 px-3 py-3">
        <Checkbox
          checked={draft.affectsProfit}
          onCheckedChange={(checked) => setDraft((current) => ({ ...current, affectsProfit: checked === true }))}
          disabled={draft.type === "BASE_PRICE"}
        />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">Affects profit</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Keep this on for sale revenue, discounts, and profit-affecting charges. Turn it off for pass-through rows like GST.
          </p>
        </div>
      </label>
    </>
  )

  const formSection = (
    <form onSubmit={onSubmit} className="border border-border bg-background">
      {!compact ? (
        <div className="border-b border-border px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
            {editingLine?.type === "BASE_PRICE" ? "Edit Base Price" : formMode === "edit" ? "Edit Pricing Item" : "Add Pricing Item"}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 px-4 py-4">
        {formFields}
      </div>

      <div className="flex gap-2 border-t border-border px-4 py-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 flex-1 gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest"
        >
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={closeForm}
          className="h-10 rounded-none px-4 text-[9px] font-bold uppercase tracking-widest"
        >
          Close
        </Button>
      </div>
    </form>
  )

  return (
    <div className={cn("flex flex-col", compact ? "gap-2" : "gap-4")}>
      <div className={cn("flex items-start justify-between gap-2", compact ? "flex-row items-start" : "flex-col sm:flex-row sm:items-center")}>
        <div>
          <p className={cn("font-bold uppercase tracking-[0.3em] text-muted-foreground/40", compact ? "text-[8px]" : "text-[9px]")}>
            Agreement Ledger
          </p>
          <p className={cn("mt-0.5 text-muted-foreground", compact ? "text-[10px] leading-snug" : "text-sm")}>
            Base price, taxes, charges, and discounts for {contextLabel || "this flat"} live here. Payments stay separate in the customer ledger.
          </p>
        </div>

        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreate}
            className={cn("gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest", compact ? "h-7 px-2.5" : "h-9")}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Pricing Item
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center border border-border bg-muted/20 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      ) : totals ? (
        <>
          <div className={cn("grid gap-2", compact ? "grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3")}>
            <AgreementSummaryTile compact={compact} label="Base Price" value={formatINR(totals.basePrice)} />
            <AgreementSummaryTile compact={compact} label="Charges" value={formatINR(totals.charges)} />
            <AgreementSummaryTile compact={compact} label="Tax / GST" value={formatINR(totals.tax)} />
            <AgreementSummaryTile compact={compact} label="Discounts / Credits" value={formatINR(totals.discounts + totals.credits)} tone="success" />
            <AgreementSummaryTile compact={compact} label="Agreement Total" value={formatINR(totals.payableTotal)} tone="primary" />
            <AgreementSummaryTile compact={compact} label="Profit Revenue" value={formatINR(totals.profitRevenue)} tone="danger" />
          </div>

          <div className="border border-border bg-background">
            <div className={cn("border-b border-border", compact ? "px-3 py-2.5" : "px-4 py-3")}>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">Recorded Pricing Items</p>
            </div>

            <div className={cn(compact ? "grid gap-2 px-3 py-3 md:grid-cols-3" : "space-y-3 px-4 py-4")}>
              {baseLine ? (
                <AgreementItemCard
                  canEdit={canEdit}
                  compact={compact}
                  line={baseLine}
                  onEdit={() => openEdit(baseLine)}
                />
              ) : null}

              {adjustmentLines.length === 0 ? (
                <div className={cn("border border-dashed border-border text-center", compact ? "px-4 py-6" : "px-4 py-8")}>
                  <ReceiptText className="mx-auto h-5 w-5 text-muted-foreground/30" />
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                    No additional pricing items yet
                  </p>
                </div>
              ) : (
                adjustmentLines.map((line) => (
                  <AgreementItemCard
                    key={line.id}
                    canEdit={canEdit}
                    compact={compact}
                    line={line}
                    onDelete={() => setDeleteTarget(line)}
                    onEdit={() => openEdit(line)}
                  />
                ))
              )}
            </div>
          </div>

          {formPanelOpen && !compact ? formSection : null}
        </>
      ) : (
        <div className="border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-700">
          Agreement totals are not available for this customer yet.
        </div>
      )}

      {compact ? (
        <Dialog open={formPanelOpen} onOpenChange={(open) => { if (!open) closeForm() }}>
          <DialogContent className="max-h-[min(90vh,760px)] max-w-2xl overflow-y-auto rounded-none border-border p-0">
            <DialogHeader className="border-b border-border px-8 py-6">
              <DialogTitle className="text-2xl font-serif tracking-tight">
                {editingLine?.type === "BASE_PRICE" ? "Edit Base Price" : formMode === "edit" ? "Edit Pricing Item" : "Add Pricing Item"}
              </DialogTitle>
            </DialogHeader>
            <div className="px-8 py-6">
              {formSection}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent className="max-w-lg rounded-none border-border p-0">
          <AlertDialogHeader className="border-b border-border px-8 pb-4 pt-8">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl font-serif tracking-tight">
              Remove this pricing item?
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="px-8 py-6">
            <p className="text-sm text-muted-foreground">
              {deleteTarget
                ? `${deleteTarget.label} (${formatSignedINR(deleteTarget.signedAmount)}) will be removed from the customer agreement.`
                : "The selected pricing item will be removed."}
            </p>
          </div>

          <AlertDialogFooter className="px-8 pb-8">
            <AlertDialogCancel className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest">
              Keep Item
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                if (!deleteTarget) return

                void deleteLine({
                  customerId,
                  lineId: deleteTarget.id,
                  siteId,
                }).catch((error) => {
                  setFormError(getApiErrorMessage(error, "Agreement line could not be removed."))
                  setDeleteTarget(null)
                })
              }}
              className="h-11 rounded-none bg-red-500 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-red-600"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove Item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
