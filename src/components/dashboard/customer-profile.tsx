"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Customer,
  CustomerPaymentHistoryItem,
  RecordPaymentInput,
  UpdateCustomerInput,
  updateCustomerSchema,
} from "@/schemas/customer.schema"
import { createFlatSchema } from "@/schemas/site.schema"
import {
  useUpdateCustomer,
  useCancelDeal,
  useCustomerAgreement,
  useCustomerPayments,
  useRecordCustomerPayment,
} from "@/hooks/api/customer.hooks"
import { useSite, useUpdateFlatDetails } from "@/hooks/api/site.hooks"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getApiErrorMessage } from "@/lib/api-error"
import { X, Loader2, Phone, Mail, Building2, Layers, Hash, CreditCard, Pencil, Trash2, IndianRupee, Download } from "lucide-react"
import { CustomerAgreementPanel } from "./customer-agreement-panel"
import { RecordPaymentModal } from "./record-payment-modal"
import { ReceiptEditor } from "./receipt-editor"

function formatINR(n: number) {
  return "\u20B9" + n.toLocaleString("en-IN")
}

function formatDate(iso?: string | null) {
  if (!iso) return "\u2014"

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "\u2014"

  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
}

type CancelDealError = {
  status?: number
  ok?: false
  error?: string
  availableFund?: number
  refundAmount?: number
  shortfall?: number
}

const editCustomerProfileSchema = updateCustomerSchema.extend({
  customFlatId: createFlatSchema.shape.customFlatId,
})

type EditCustomerProfileInput = UpdateCustomerInput & {
  customFlatId: string
}

function buildCancelDealSchema(maxRefund: number) {
  return z.object({
    reason: z.string().trim().min(1, "Reason is required"),
    refundAmount: z
      .number()
      .min(0, "Refund amount cannot be negative")
      .max(maxRefund, `Refund amount cannot exceed ${formatINR(maxRefund)}`),
  })
}

function getFlatDisplayName(customer: Customer) {
  if (customer.dealStatus === "CANCELLED") {
    return customer.cancelledFlatDisplay || customer.customFlatId || (customer.flatNumber !== null ? `Flat ${customer.flatNumber}` : "Flat -")
  }

  return customer.customFlatId || (customer.flatNumber !== null ? `Flat ${customer.flatNumber}` : "Flat -")
}

function getFloorDisplayName(customer: Customer) {
  if (customer.dealStatus === "CANCELLED") {
    return customer.cancelledFloorName || (customer.cancelledFloorNumber !== null ? `Floor ${customer.cancelledFloorNumber}` : "Floor -")
  }

  return customer.floorName || (customer.floorNumber !== null ? `Floor ${customer.floorNumber}` : "Floor -")
}

function EditForm({ customer, siteId, onClose }: { customer: Customer; siteId: string; onClose: () => void }) {
  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer, error: customerError } = useUpdateCustomer()
  const { mutateAsync: updateFlat, isPending: isUpdatingFlat, error: flatError } = useUpdateFlatDetails(siteId)
  const isPending = isUpdatingCustomer || isUpdatingFlat

  const { register, handleSubmit, formState: { errors } } = useForm<EditCustomerProfileInput>({
    resolver: zodResolver(editCustomerProfileSchema),
    defaultValues: {
      customFlatId: customer.customFlatId ?? "",
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
    },
  })

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        if (!customer.flatId) return

        await updateFlat({
          flatId: customer.flatId,
          data: { customFlatId: data.customFlatId },
        })

        await updateCustomer({
          siteId,
          flatId: customer.flatId,
          customerId: customer.id,
          data: { name: data.name, phone: data.phone, email: data.email || undefined },
        })

        onClose()
      })}
      className="flex flex-col gap-4"
    >
      {(flatError || customerError) && (
        <div className="bg-destructive/10 p-3 text-[11px] font-bold text-destructive">
          {getApiErrorMessage(flatError ?? customerError, "Failed to update booking details.")}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Flat ID</Label>
        <Input className="h-10 rounded-none border-none bg-muted text-sm" {...register("customFlatId")} />
        {errors.customFlatId && <p className="text-[10px] text-destructive">{errors.customFlatId.message}</p>}
        <p className="text-[10px] text-muted-foreground/50">This updates the unit label shown in Floors & Flats.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Name</Label>
        <Input className="h-10 rounded-none border-none bg-muted text-sm" {...register("name")} />
        {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Phone</Label>
          <Input className="h-10 rounded-none border-none bg-muted text-sm" {...register("phone")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Email</Label>
          <Input className="h-10 rounded-none border-none bg-muted text-sm" {...register("email")} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending} size="sm" className="h-9 flex-1 rounded-none text-[9px] font-bold uppercase tracking-widest">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 rounded-none px-4 text-[9px] font-bold uppercase tracking-widest">
          Cancel
        </Button>
      </div>
    </form>
  )
}

function CancelConfirm({
  customer,
  siteId,
  onClose,
  onDone,
  onNavigateToAddFund,
}: {
  customer: Customer
  siteId: string
  onClose: () => void
  onDone: () => void
  onNavigateToAddFund: () => void
}) {
  const router = useRouter()
  const { mutate, isPending, error, reset } = useCancelDeal({ onSuccess: onDone })
  const maxRefund = Math.max(customer.amountPaid, 0)
  const cancelDealSchema = buildCancelDealSchema(maxRefund)
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof cancelDealSchema>>({
    resolver: zodResolver(cancelDealSchema),
    defaultValues: {
      reason: "",
      refundAmount: maxRefund,
    },
  })

  const flatDisplayName = getFlatDisplayName(customer)
  const floorDisplayName = getFloorDisplayName(customer)
  const cancelError = error as CancelDealError | null
  const hasShortfallDetails =
    cancelError?.error === "INSUFFICIENT_FUNDS"
    && typeof cancelError.shortfall === "number"
    && typeof cancelError.availableFund === "number"
    && typeof cancelError.refundAmount === "number"

  const handleGoToAddFund = () => {
    if (!hasShortfallDetails) return

    const params = new URLSearchParams({
      fund: "add",
      amount: String(cancelError.shortfall!),
    })

    reset()
    onNavigateToAddFund()
    router.push(`/sites/${siteId}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm font-serif text-foreground">
          Cancel deal for <strong>{customer.name}</strong>?
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {flatDisplayName} ({floorDisplayName}) will be set back to AVAILABLE. Customer and payment records will stay preserved for audit.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((data) => {
          if (!customer.flatId) return

          mutate({
            siteId,
            flatId: customer.flatId,
            customerId: customer.id,
            data,
          })
        })}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Cancellation Reason</Label>
          <Textarea
            rows={4}
            className="rounded-none border-none bg-muted text-sm"
            placeholder="Why is this deal being cancelled?"
            {...register("reason")}
          />
          {errors.reason && <p className="text-[10px] text-destructive">{errors.reason.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Refund Amount</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            className="h-10 rounded-none border-none bg-muted text-sm"
            {...register("refundAmount", { valueAsNumber: true })}
          />
          {errors.refundAmount && <p className="text-[10px] text-destructive">{errors.refundAmount.message}</p>}
          <p className="text-[10px] text-muted-foreground/60">
            Enter any amount from {formatINR(0)} to {formatINR(maxRefund)}.
          </p>
        </div>

        {cancelError && !hasShortfallDetails && (
          <div className="border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <p className="text-[10px] leading-relaxed">
              {typeof cancelError.error === "string" ? cancelError.error : "Failed to cancel deal"}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isPending || !customer.flatId}
            variant="destructive"
            size="sm"
            className="h-9 flex-1 rounded-none text-[9px] font-bold uppercase tracking-widest"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel Deal"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 rounded-none px-4 text-[9px] font-bold uppercase tracking-widest"
          >
            Keep Active
          </Button>
        </div>
      </form>

      <Dialog open={hasShortfallDetails} onOpenChange={(open) => { if (!open) reset() }}>
        <DialogContent className="max-w-md gap-0 rounded-none border-border p-0">
          <DialogHeader className="border-b border-border px-8 pb-4 pt-8">
            <DialogTitle className="text-2xl font-serif tracking-tight">Fund Needed to Cancel Deal</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-8 py-6">
            <div className="border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-serif text-foreground">
                This deal cannot be cancelled yet because the site does not have enough balance to refund the customer.
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Add the missing fund to this site, then try the cancellation again.
              </p>
            </div>

            <div className="divide-y divide-border border border-border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Refund Required</span>
                <span className="text-sm font-serif text-foreground">{formatINR(cancelError?.refundAmount ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Available Site Fund</span>
                <span className="text-sm font-serif text-foreground">{formatINR(cancelError?.availableFund ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between bg-muted/30 px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Need to Add</span>
                <span className="text-lg font-serif text-primary">{formatINR(cancelError?.shortfall ?? 0)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-8 pb-8">
            <Button variant="outline" onClick={() => reset()} className="h-11 flex-1 rounded-none text-[10px] font-bold uppercase tracking-widest">
              Close
            </Button>
            <Button onClick={handleGoToAddFund} className="h-11 flex-1 gap-2 rounded-none text-[10px] font-bold uppercase tracking-widest">
              <IndianRupee className="h-4 w-4" /> Add Fund
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function CustomerProfile({
  customer,
  siteId,
  siteName,
  onClose,
}: {
  customer: Customer
  siteId: string
  siteName?: string
  onClose: () => void
}) {
  const [mode, setMode] = useState<"view" | "edit" | "cancel">("view")
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const { mutate: recordPayment, isPending: isPaying } = useRecordCustomerPayment({
    onSuccess: () => {
      setIsPaymentModalOpen(false)
      onClose()
    },
  })
  const { data: agreementData, isLoading: isAgreementLoading } = useCustomerAgreement(customer.id)
  const { data: paymentHistoryData } = useCustomerPayments(customer.id)
  const { data: siteData } = useSite(siteId)

  const agreement = agreementData?.data?.agreement
  const paymentHistory = (paymentHistoryData?.data?.payments ?? []) as CustomerPaymentHistoryItem[]
  const receiptPayments = paymentHistory.filter(
    (payment) => payment.direction === "IN" && payment.movementType === "CUSTOMER_PAYMENT",
  )
  const fallbackCreatedAt = paymentHistory.reduce<string | undefined>((earliest, payment) => {
    const paymentDate = new Date(payment.createdAt)
    if (Number.isNaN(paymentDate.getTime())) return earliest
    if (!earliest) return payment.createdAt

    const earliestDate = new Date(earliest)
    return paymentDate < earliestDate ? payment.createdAt : earliest
  }, undefined)
  const displayCreatedAt = customer.createdAt || fallbackCreatedAt
  const isCancelled = customer.dealStatus === "CANCELLED"
  const agreementTotal = agreement?.totals.payableTotal ?? customer.sellingPrice
  const collectedAmount = agreement?.amountPaid ?? customer.amountPaid
  const remainingAmount = Math.max(agreement?.remaining ?? customer.remaining, 0)
  const isSold = customer.flatStatus === "SOLD" || (!isCancelled && remainingAmount <= 0)
  const statusLabel = isCancelled ? "CANCELLED" : (customer.flatStatus ?? "ACTIVE")
  const flatDisplayName = getFlatDisplayName(customer)
  const floorDisplayName = getFloorDisplayName(customer)
  const canEdit = !isCancelled && Boolean(customer.flatId)
  const canCancel = !isCancelled && Boolean(customer.flatId)
  const canAddPayment = !isCancelled && remainingAmount > 0
  const canOpenReceipt = !isCancelled

  const pct = agreementTotal > 0
    ? Math.min(100, (collectedAmount / agreementTotal) * 100)
    : remainingAmount <= 0
      ? 100
      : 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="border-b border-border px-8 pb-5 pt-8">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Customer Profile</p>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-serif tracking-tight text-foreground">{customer.name}</h2>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={cn(
                    "px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                    isCancelled
                      ? "bg-red-500/10 text-red-500"
                      : isSold
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600",
                  )}
                >
                  {statusLabel}
                </span>
                <span className="text-[9px] font-bold tracking-widest text-muted-foreground/40">
                  {flatDisplayName} · {floorDisplayName}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground/40 transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 px-8 py-6">
          <div className="flex flex-col gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Contact</p>
            <div className="flex flex-col gap-2">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground/40" /> {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground/40" /> {customer.email}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">Property</p>
            <div className="grid grid-cols-2 gap-3">
              {siteName && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground/40" /> {siteName}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Layers className="h-3.5 w-3.5 text-muted-foreground/40" /> {floorDisplayName}
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Hash className="h-3.5 w-3.5 text-muted-foreground/40" /> {flatDisplayName}
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground/40" /> {formatDate(displayCreatedAt)}
              </div>
            </div>
          </div>

          {isCancelled && (
            <div className="flex flex-col gap-3 border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-red-500/70">Cancellation Audit</p>
              <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Cancelled On</p>
                  <p className="mt-1">{formatDate(customer.cancelledAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Released From</p>
                  <p className="mt-1">{customer.cancelledFromFlatStatus ?? "\u2014"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Reason</p>
                  <p className="mt-1 leading-relaxed">{customer.cancellationReason || "\u2014"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div
              className={cn(
                "flex flex-col items-center justify-center border py-8",
                isCancelled
                  ? "border-amber-500/20 bg-amber-500/5"
                  : remainingAmount > 0
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-emerald-500/20 bg-emerald-500/5",
              )}
            >
              <span
                className={cn(
                  "mb-2 text-[10px] font-bold uppercase tracking-[0.3em]",
                  isCancelled
                    ? "text-amber-600/70"
                    : remainingAmount > 0
                      ? "text-red-500/70"
                      : "text-emerald-600/70",
                )}
              >
                {isCancelled ? "Net Paid After Refunds" : remainingAmount > 0 ? "Remaining Balance" : "Fully Paid"}
              </span>
              <span
                className={cn(
                  "text-5xl font-sans font-bold tracking-tighter",
                  isCancelled
                    ? "text-amber-600"
                    : remainingAmount > 0
                      ? "text-red-500"
                      : "text-emerald-600",
                )}
              >
                {formatINR(isCancelled ? collectedAmount : remainingAmount)}
              </span>
            </div>

            <div className="divide-y divide-border border border-border">
              <div className="flex justify-between px-4 py-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Agreement Total</span>
                <span className="text-sm font-serif">{formatINR(agreementTotal)}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Booking Amount</span>
                <span className="text-sm font-serif">{formatINR(customer.bookingAmount)}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Total Paid</span>
                <span className="text-sm font-serif text-emerald-600">{formatINR(collectedAmount)}</span>
              </div>
            </div>

            {!isCancelled && (
              <div>
                <div className="mb-1 flex justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Payment Progress</span>
                  <span className="text-[9px] font-bold tracking-widest text-primary">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden bg-muted">
                  <div className={cn("h-full transition-all", isSold ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground/60">
                  Collections and agreement changes are now tracked separately. Edit price, GST, discounts, or charges below without creating fake payments.
                </p>
              </div>
            )}
          </div>

          <CustomerAgreementPanel
            customerId={customer.id}
            siteId={siteId}
            canEdit={canEdit}
            agreement={agreement}
            isLoading={isAgreementLoading}
          />

          {mode === "edit" && canEdit && <EditForm customer={customer} siteId={siteId} onClose={() => setMode("view")} />}
          {mode === "cancel" && canCancel && (
            <CancelConfirm
              customer={customer}
              siteId={siteId}
              onClose={() => setMode("view")}
              onDone={onClose}
              onNavigateToAddFund={onClose}
            />
          )}
        </div>

        {isPaymentModalOpen && canAddPayment && (
        <RecordPaymentModal
          title={`Customer: ${customer.name}`}
          totalAmount={agreementTotal}
          currentlyPaid={collectedAmount}
          entityType="customer-booking"
          entityId={customer.id}
          onSubmit={(paymentInput: RecordPaymentInput) => recordPayment({ customerId: customer.id, siteId, data: paymentInput })}
          onClose={() => setIsPaymentModalOpen(false)}
          isPending={isPaying}
        />
        )}

        {isReceiptModalOpen && canOpenReceipt && (
          <ReceiptEditor
            customer={{ ...customer, siteName, sellingPrice: agreementTotal, amountPaid: collectedAmount, remaining: remainingAmount }}
            siteAddress={siteData?.data?.site?.address}
            payments={receiptPayments}
            onClose={() => setIsReceiptModalOpen(false)}
          />
        )}

        {mode === "view" && (
          <div className="border-t border-border px-8 py-5">
            {isCancelled ? (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                This deal is cancelled and read-only.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {canAddPayment && (
                  <Button onClick={() => setIsPaymentModalOpen(true)} className="h-11 gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest">
                    <IndianRupee className="h-3.5 w-3.5" /> Add Due Payment
                  </Button>
                )}
                {canOpenReceipt && (
                  <Button variant="outline" onClick={() => setIsReceiptModalOpen(true)} className="h-11 gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest">
                    <Download className="h-3.5 w-3.5" /> Receipt / Statement
                  </Button>
                )}
                {canEdit && (
                  <Button variant="outline" onClick={() => setMode("edit")} className="h-11 gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    onClick={() => setMode("cancel")}
                    className="h-11 gap-1.5 rounded-none border-red-500/30 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Cancel Deal
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
