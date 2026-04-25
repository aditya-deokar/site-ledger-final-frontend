"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Loader2, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  type CustomerAgreement,
  type CustomerAgreementLine,
  type CustomerAgreementLineType,
  customerAgreementLineSchema,
} from "@/schemas/customer.schema"
import { cn } from "@/lib/utils"

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

const LINE_TYPE_LABELS: Record<CustomerAgreementLineType, string> = {
  BASE_PRICE: "Base Price",
  CHARGE: "Charge",
  TAX: "Tax / GST",
  DISCOUNT: "Discount",
  CREDIT: "Credit",
}

const MUTABLE_LINE_TYPES: CustomerAgreementLineType[] = ["CHARGE", "TAX", "DISCOUNT", "CREDIT"]

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
  note: string
  affectsProfit: boolean
}

function createDraft(line?: CustomerAgreementLine | null): AgreementDraft {
  const type = line?.type ?? "CHARGE"

  return {
    type,
    label: line?.label ?? "",
    amount: line ? String(line.amount) : "",
    note: line?.note ?? "",
    affectsProfit: line?.affectsProfit ?? defaultAffectsProfit(type),
  }
}

function AgreementSummaryTile({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "danger" | "success" | "primary"
}) {
  return (
    <div
      className={cn(
        "border px-3 py-3",
        tone === "danger" && "border-red-500/20 bg-red-500/5",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/5",
        tone === "primary" && "border-primary/20 bg-primary/5",
        tone === "default" && "border-border bg-muted/20",
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground/55">{label}</p>
      <p className="mt-2 text-sm font-serif text-foreground">{value}</p>
    </div>
  )
}

export function CustomerAgreementPanel({
  customerId,
  siteId,
  canEdit,
  agreement,
  isLoading,
}: {
  customerId: string
  siteId: string
  canEdit: boolean
  agreement?: CustomerAgreement
  isLoading?: boolean
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
      : "Update Line"
    : "Add Line"

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const parsed = customerAgreementLineSchema.safeParse({
      type: draft.type,
      label: draft.label,
      amount: Number(draft.amount || 0),
      note: draft.note,
      affectsProfit: draft.affectsProfit,
    })

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Agreement Ledger</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Base price, taxes, charges, discounts, and credits live here. Payments stay separate in the customer ledger.
          </p>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreate}
            className="h-9 gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest"
          >
            <Plus className="h-3.5 w-3.5" /> Add Line
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center border border-border bg-muted/20 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      ) : totals ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AgreementSummaryTile label="Base Price" value={formatINR(totals.basePrice)} />
            <AgreementSummaryTile label="Charges" value={formatINR(totals.charges)} />
            <AgreementSummaryTile label="Tax / GST" value={formatINR(totals.tax)} />
            <AgreementSummaryTile label="Discounts / Credits" value={formatINR(totals.discounts + totals.credits)} tone="success" />
            <AgreementSummaryTile label="Agreement Total" value={formatINR(totals.payableTotal)} tone="primary" />
            <AgreementSummaryTile label="Profit Revenue" value={formatINR(totals.profitRevenue)} tone="danger" />
          </div>

          <div className="space-y-3 border border-border bg-background">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">Recorded Lines</p>
            </div>

            <div className="space-y-3 px-4 pb-4">
              {baseLine && (
                <div className="border border-border bg-muted/10 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest", getLineTone(baseLine.type))}>
                          {LINE_TYPE_LABELS[baseLine.type]}
                        </span>
                        <h4 className="text-sm font-serif text-foreground">{baseLine.label}</h4>
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground/65">
                        Created {formatShortDate(baseLine.createdAt)}. Edit this when the flat base price changes.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <p className="text-lg font-serif text-foreground">{formatINR(baseLine.amount)}</p>
                        <p className="text-[10px] text-muted-foreground/55">
                          {baseLine.affectsProfit ? "Counts in profit" : "Pass-through only"}
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(baseLine)}
                          className="h-8 gap-1 rounded-none text-[9px] font-bold uppercase tracking-widest"
                        >
                          <Pencil className="h-3 w-3" /> Edit Base
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {adjustmentLines.length === 0 ? (
                <div className="border border-dashed border-border px-4 py-8 text-center">
                  <ReceiptText className="mx-auto h-5 w-5 text-muted-foreground/30" />
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/45">
                    No additional charges or tax rows yet
                  </p>
                </div>
              ) : (
                adjustmentLines.map((line) => (
                  <div key={line.id} className="border border-border bg-muted/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest", getLineTone(line.type))}>
                            {LINE_TYPE_LABELS[line.type]}
                          </span>
                          <h4 className="text-sm font-serif text-foreground">{line.label}</h4>
                        </div>
                        {line.note && (
                          <p className="mt-2 text-sm text-foreground/75">{line.note}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/60">
                          <span>{formatShortDate(line.createdAt)}</span>
                          <span>{line.affectsProfit ? "Included in profit" : "Excluded from profit"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <div className="text-right">
                          <p className={cn("text-lg font-serif", line.signedAmount < 0 ? "text-emerald-700" : "text-foreground")}>
                            {formatSignedINR(line.signedAmount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground/55">
                            {line.signedAmount < 0 ? "Reduces customer total" : "Adds to customer total"}
                          </p>
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(line)}
                              className="h-8 gap-1 rounded-none text-[9px] font-bold uppercase tracking-widest"
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(line)}
                              className="h-8 gap-1 rounded-none border-red-500/30 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/5"
                            >
                              <Trash2 className="h-3 w-3" /> Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {(formMode || formError) && (
            <form onSubmit={onSubmit} className="border border-border bg-background">
              <div className="border-b border-border px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground/50">
                  {editingLine?.type === "BASE_PRICE" ? "Edit Base Price" : formMode === "edit" ? "Edit Agreement Line" : "Add Agreement Line"}
                </p>
              </div>

              <div className="flex flex-col gap-4 px-4 py-4">
                {formError && (
                  <div className="border border-destructive/30 bg-destructive/10 p-3 text-[11px] text-destructive">
                    {formError}
                  </div>
                )}

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

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.amount}
                      onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                      className="h-10 rounded-none border-none bg-muted text-sm"
                      placeholder="0.00"
                    />
                  </div>
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
                    placeholder="Optional context for this line"
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
                  onClick={() => {
                    setFormMode(null)
                    setEditingLine(null)
                    setDraft(createDraft())
                    setFormError(null)
                  }}
                  className="h-10 rounded-none px-4 text-[9px] font-bold uppercase tracking-widest"
                >
                  Close
                </Button>
              </div>
            </form>
          )}
        </>
      ) : (
        <div className="border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-700">
          Agreement totals are not available for this customer yet.
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent className="max-w-lg rounded-none border-border p-0">
          <AlertDialogHeader className="border-b border-border px-8 pb-4 pt-8">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl font-serif tracking-tight">
              Remove this agreement line?
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="px-8 py-6">
            <p className="text-sm text-muted-foreground">
              {deleteTarget
                ? `${deleteTarget.label} (${formatSignedINR(deleteTarget.signedAmount)}) will be removed from the customer agreement.`
                : "The selected agreement line will be removed."}
            </p>
          </div>

          <AlertDialogFooter className="px-8 pb-8">
            <AlertDialogCancel className="h-11 rounded-none text-[10px] font-bold uppercase tracking-widest">
              Keep Line
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
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove Line"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
