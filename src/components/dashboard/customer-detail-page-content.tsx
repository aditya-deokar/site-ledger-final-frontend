"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  Pencil,
  Trash2,
  IndianRupee,
  Download,
  ChevronLeft,
  Loader2,
} from "lucide-react"
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
        await updateFlat({ flatId: customer.flatId, data: { customFlatId: data.customFlatId } })
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Phone</Label>
          <Input className="h-10 rounded-none border-none bg-muted text-sm" {...register("phone")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Email</Label>
          <Input className="h-10 rounded-none border-none bg-muted text-sm" {...register("email")} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={isPending} size="sm" className="h-9 flex-1 min-w-[120px] rounded-none text-[9px] font-bold uppercase tracking-widest">
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
    defaultValues: { reason: "", refundAmount: maxRefund },
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
    const params = new URLSearchParams({ fund: "add", amount: String(cancelError.shortfall!) })
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
          mutate({ siteId, flatId: customer.flatId, customerId: customer.id, data })
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={isPending || !customer.flatId}
            variant="destructive"
            size="sm"
            className="h-9 flex-1 min-w-[120px] rounded-none text-[9px] font-bold uppercase tracking-widest"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel Deal"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 rounded-none px-4 text-[9px] font-bold uppercase tracking-widest">
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

function SummaryRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2 border-b border-border py-2.5 first:pt-0 last:border-0 last:pb-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</span>
      <span className={cn("shrink-0 text-right text-sm font-sans font-bold tabular-nums tracking-tight", valueClass)}>{value}</span>
    </div>
  )
}

export function CustomerDetailPageContent({
  customer,
  siteId,
  siteName,
}: {
  customer: Customer
  siteId: string
  siteName?: string
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  const { mutate: recordPayment, isPending: isPaying } = useRecordCustomerPayment({
    onSuccess: () => {
      setIsPaymentModalOpen(false)
    },
  })
  const { data: agreementData, isLoading: isAgreementLoading, isError: isAgreementError, error: agreementError } = useCustomerAgreement(customer.id)
  const { data: paymentHistoryData, isError: isPaymentsError } = useCustomerPayments(customer.id)
  const { data: siteData, isError: isSiteError } = useSite(siteId)

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
  const statusBadgeLabel = isCancelled ? "CANCELLED" : (customer.flatStatus ?? "ACTIVE")
  const statusDisplay = isCancelled ? "CANCELLED" : (customer.flatStatus ?? "ACTIVE")
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
    <div className="w-full min-w-0 max-w-6xl space-y-8">
      <div>
        <Link
          href="/customers"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mb-4 -ml-2 inline-flex h-9 min-h-0 items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Customers
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl break-words">{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase",
                  isCancelled
                    ? "bg-red-500/10 text-red-500"
                    : isSold
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-amber-500/10 text-amber-600",
                )}
              >
                {statusBadgeLabel}
              </span>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <span className="max-w-full truncate text-[11px] font-medium tracking-tight text-muted-foreground/80">
                {flatDisplayName} · {floorDisplayName}
                {siteName ? ` · ${siteName}` : ""}
              </span>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-stretch justify-end gap-2 sm:justify-end lg:max-w-xl lg:shrink-0">
            {!isCancelled && (
              <>
                {canAddPayment && (
                  <Button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="h-10 flex-1 min-w-[140px] gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest sm:flex-none"
                  >
                    <IndianRupee className="h-3.5 w-3.5" /> Add Due Payment
                  </Button>
                )}
                {canOpenReceipt && (
                  <Button
                    variant="outline"
                    onClick={() => setIsReceiptModalOpen(true)}
                    className="h-10 flex-1 min-w-[140px] gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest sm:flex-none"
                  >
                    <Download className="h-3.5 w-3.5" /> Receipt / Statement
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => setEditOpen(true)}
                    className="h-10 flex-1 min-w-[100px] gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest sm:flex-none"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    onClick={() => setCancelOpen(true)}
                    className="h-10 flex-1 min-w-[120px] gap-1.5 rounded-none border-red-500/30 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/5 sm:flex-none"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Cancel Deal
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {(isAgreementError || isPaymentsError || isSiteError) && (
        <div className="border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-800">
          {isAgreementError && <p>Agreement: {getApiErrorMessage(agreementError, "Could not load agreement.")}</p>}
          {isPaymentsError && <p>Payment history could not be fully loaded. Receipts may be incomplete until this resolves.</p>}
          {isSiteError && <p>Site details could not be fully loaded. Receipt address may be missing.</p>}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 space-y-10 lg:col-span-7 xl:col-span-8">
          <section>
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Financial Summary</h2>
            <div className="grid min-w-0 grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
              {[
                { label: "Agreement Total", value: formatINR(agreementTotal) },
                { label: "Booking Amount", value: formatINR(customer.bookingAmount) },
                { label: "Total Paid", value: formatINR(collectedAmount), valClass: "text-emerald-600" },
                { label: "Remaining Balance", value: formatINR(isCancelled ? 0 : remainingAmount), valClass: isCancelled ? undefined : remainingAmount > 0 ? "text-red-500" : "text-emerald-600" },
              ].map((row) => (
                <div key={row.label} className="bg-background px-4 py-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">{row.label}</p>
                  <p className={cn("mt-1.5 font-sans text-xl font-bold tabular-nums tracking-tight", row.valClass)}>{row.value}</p>
                </div>
              ))}
            </div>
            {!isCancelled && (
              <div className="mt-4 min-w-0">
                <div className="mb-1.5 flex justify-between gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  <span>Collection progress</span>
                  <span className="text-primary">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full min-w-0 overflow-hidden bg-muted">
                  <div
                    className={cn("h-full transition-all", isSold ? "bg-emerald-500" : "bg-primary")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground/60">
                  Collections and agreement changes are now tracked separately. Edit price, GST, discounts, or charges below without creating fake payments.
                </p>
              </div>
            )}
          </section>

          <section className="min-w-0 border-t border-border pt-10">
            <CustomerAgreementPanel
              customerId={customer.id}
              siteId={siteId}
              canEdit={canEdit}
              agreement={agreement}
              isLoading={isAgreementLoading}
            />
          </section>
        </div>

        <aside className="min-w-0 space-y-6 border-t border-border pt-8 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 xl:col-span-4">
          <div>
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Profile</h2>
            <div className="divide-y divide-border border border-border">
              <SummaryRow label="Name" value={customer.name} />
              <SummaryRow label="Phone" value={customer.phone || "—"} />
              <SummaryRow label="Email" value={customer.email || "—"} />
              <SummaryRow label="Status" value={String(statusDisplay)} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Property</h2>
            <div className="divide-y divide-border border border-border">
              {siteName && <SummaryRow label="Site" value={siteName} />}
              <SummaryRow label="Floor" value={floorDisplayName} />
              <SummaryRow label="Flat" value={flatDisplayName} />
              <SummaryRow label="Booking / sale" value={formatDate(displayCreatedAt)} />
            </div>
          </div>

          <div
            className={cn(
              "border px-5 py-6",
              isCancelled
                ? "border-amber-500/20 bg-amber-500/5"
                : remainingAmount > 0
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-emerald-500/20 bg-emerald-500/5",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.2em]",
                isCancelled
                  ? "text-amber-600/80"
                  : remainingAmount > 0
                    ? "text-red-500/80"
                    : "text-emerald-600/80",
              )}
            >
              {isCancelled ? "Net Paid After Refunds" : remainingAmount > 0 ? "Remaining Balance" : "Fully Paid"}
            </p>
            <p
              className={cn(
                "mt-2 font-sans text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
                isCancelled
                  ? "text-amber-600"
                  : remainingAmount > 0
                    ? "text-red-500"
                    : "text-emerald-600",
              )}
            >
              {formatINR(isCancelled ? collectedAmount : remainingAmount)}
            </p>
            {!isCancelled && (
              <div className="mt-4 h-1.5 w-full overflow-hidden bg-background/50">
                <div
                  className={cn("h-full", isSold ? "bg-emerald-500" : "bg-primary")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>

          {isCancelled && (
            <div className="border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-500/80">Cancellation</p>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-foreground sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Cancelled on</p>
                  <p className="mt-0.5">{formatDate(customer.cancelledAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Released from</p>
                  <p className="mt-0.5">{customer.cancelledFromFlatStatus ?? "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Reason</p>
                  <p className="mt-0.5 leading-relaxed">{customer.cancellationReason || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(90vh,720px)] max-w-md overflow-y-auto rounded-none border-border p-0">
          <DialogHeader className="border-b border-border px-8 py-6">
            <DialogTitle className="text-2xl font-serif tracking-tight">Edit customer</DialogTitle>
          </DialogHeader>
          <div className="px-8 py-6">
            {canEdit && <EditForm customer={customer} siteId={siteId} onClose={() => setEditOpen(false)} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-h-[min(90vh,90vh)] max-w-md overflow-y-auto rounded-none border-border p-0">
          <DialogHeader className="border-b border-border px-8 py-6">
            <DialogTitle className="text-2xl font-serif tracking-tight">Cancel deal</DialogTitle>
          </DialogHeader>
          <div className="px-8 py-6">
            {canCancel && (
              <CancelConfirm
                customer={customer}
                siteId={siteId}
                onClose={() => setCancelOpen(false)}
                onDone={() => {
                  setCancelOpen(false)
                  router.push("/customers")
                }}
                onNavigateToAddFund={() => setCancelOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}
