"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Customer,
  CustomerWithSite,
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
  ChevronLeft,
  Loader2,
  Download,
} from "lucide-react"
import { CustomerAgreementPanel } from "./customer-agreement-panel"
import { RecordPaymentModal } from "./record-payment-modal"
import { downloadReceiptPDF, downloadStatementPDF } from "@/lib/pdf-generator"
import { toast } from "sonner"
import { useCompany } from "@/hooks/api/company.hooks"

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

function getDealLocationLabel(deal: CustomerWithSite) {
  const floor = deal.floorName || (deal.floorNumber !== null ? `Floor ${deal.floorNumber}` : "Floor -")
  const flat = deal.customFlatId || (deal.flatNumber !== null ? `Flat ${deal.flatNumber}` : "Flat -")
  const unitType = deal.unitType || deal.flatType || "Unit"
  return [deal.siteName, deal.wingName, floor, flat, unitType].filter(Boolean).join(" / ")
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
    <div className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-start gap-3 border-b border-border px-4 py-3.5 last:border-0">
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">{label}</span>
      <span className={cn("min-w-0 break-words text-right text-sm font-sans font-bold tabular-nums leading-snug tracking-tight", valueClass)}>{value}</span>
    </div>
  )
}

export function CustomerDetailPageContent({
  customer: initialCustomer,
  customerDeals,
}: {
  customer: CustomerWithSite
  customerDeals: CustomerWithSite[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentPickerOpen, setPaymentPickerOpen] = useState(false)
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const [isDownloadingStatement, setIsDownloadingStatement] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomer.id)
  const [paymentTargetCustomerId, setPaymentTargetCustomerId] = useState<string | null>(null)

  const customer = useMemo(
    () => customerDeals.find((deal) => deal.id === selectedCustomerId) ?? customerDeals[0] ?? initialCustomer,
    [customerDeals, initialCustomer, selectedCustomerId],
  )
  const siteId = customer.siteId ?? ""
  const siteName = customer.siteName ?? undefined

  const { mutate: recordPayment, isPending: isPaying } = useRecordCustomerPayment({
    onSuccess: () => {
      setIsPaymentModalOpen(false)
    },
  })
  const { data: agreementData, isLoading: isAgreementLoading, isError: isAgreementError, error: agreementError } = useCustomerAgreement(customer.id)
  const { data: paymentHistoryData, isError: isPaymentsError } = useCustomerPayments(customer.id)
  const { data: siteData, isError: isSiteError } = useSite(siteId)
  const { data: companyData } = useCompany()

  const agreement = agreementData?.data?.agreement
  const paymentHistory = (paymentHistoryData?.data?.payments ?? []) as CustomerPaymentHistoryItem[]
  
  // Filter payments for receipts (incoming customer payments only)
  const receiptPayments = paymentHistory.filter(
    (payment) => payment.direction === "IN" && payment.movementType === "CUSTOMER_PAYMENT"
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
  const canEdit = !isCancelled && Boolean(customer.flatId) && Boolean(siteId)
  const canCancel = !isCancelled && Boolean(customer.flatId) && Boolean(siteId)
  const canAddPayment = !isCancelled && remainingAmount > 0 && Boolean(siteId)

  const payableDeals = useMemo(
    () =>
      customerDeals.filter(
        (deal) => deal.dealStatus !== "CANCELLED" && deal.remaining > 0 && Boolean(deal.siteId) && Boolean(deal.flatId),
      ),
    [customerDeals],
  )
  const paymentTargetDeal = useMemo(
    () => payableDeals.find((deal) => deal.id === paymentTargetCustomerId) ?? null,
    [payableDeals, paymentTargetCustomerId],
  )

  const pct = agreementTotal > 0
    ? Math.min(100, (collectedAmount / agreementTotal) * 100)
    : remainingAmount <= 0
      ? 100
      : 0

  const handleDownloadReceipt = async () => {
    if (receiptPayments.length === 0) return
    
    // Use the most recent payment for the receipt
    const latestPayment = receiptPayments[0]
    
    if (!agreement || !siteData?.data?.site || !companyData?.data?.company) {
      toast.error("Missing required data to generate receipt")
      return
    }

    setIsDownloadingReceipt(true)
    try {
      await downloadReceiptPDF(
        customer.id,
        latestPayment.id,
        customer,
        latestPayment,
        agreement,
        siteData.data.site,
        companyData.data.company
      )
      toast.success("Receipt downloaded successfully")
    } catch (error) {
      console.error("Receipt generation failed:", error)
      toast.error("Failed to generate receipt. Please try again.")
    } finally {
      setIsDownloadingReceipt(false)
    }
  }

  const handleDownloadStatement = async () => {
    if (!agreement || !siteData?.data?.site || !companyData?.data?.company) {
      toast.error("Missing required data to generate statement")
      return
    }

    setIsDownloadingStatement(true)
    try {
      await downloadStatementPDF(
        customer.id,
        customer,
        paymentHistory,
        agreement,
        siteData.data.site,
        companyData.data.company
      )
      toast.success("Statement downloaded successfully")
    } catch (error) {
      console.error("Statement generation failed:", error)
      toast.error("Failed to generate statement. Please try again.")
    } finally {
      setIsDownloadingStatement(false)
    }
  }

  const openPaymentFlow = () => {
    if (!canAddPayment) return

    if (payableDeals.length <= 1) {
      const directTarget = payableDeals[0] ?? customer
      setPaymentTargetCustomerId(directTarget.id)
      setIsPaymentModalOpen(true)
      return
    }

    const initialTarget = payableDeals.find((deal) => deal.id === customer.id) ?? payableDeals[0]
    setPaymentTargetCustomerId(initialTarget?.id ?? null)
    setPaymentPickerOpen(true)
  }

  return (
    <div className="w-full min-w-0 max-w-7xl space-y-6">
      <div className="border border-border bg-background px-5 py-5 sm:px-6">
        <Link
          href="/customers"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mb-5 -ml-2 inline-flex h-8 min-h-0 items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Customers
        </Link>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
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
              <span className="max-w-full truncate text-[11px] font-medium tracking-tight text-muted-foreground/80">
                {[flatDisplayName, floorDisplayName, siteName].filter(Boolean).join(" / ")}
              </span>
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-muted text-foreground/70">
                {customerDeals.length} Flats
              </span>
            </div>
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:max-w-[650px] xl:grid-cols-3 xl:shrink-0">
            {!isCancelled && (
              <>
                <Button
                  variant="outline"
                  onClick={handleDownloadReceipt}
                  disabled={isDownloadingReceipt || receiptPayments.length === 0}
                  className="h-10 w-full gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest"
                >
                  {isDownloadingReceipt ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadStatement}
                  disabled={isDownloadingStatement}
                  className="h-10 w-full gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest"
                >
                  {isDownloadingStatement ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {isDownloadingStatement ? "Downloading..." : "Download Statement"}
                </Button>
                {canAddPayment && (
                  <Button
                    onClick={openPaymentFlow}
                    className="h-10 w-full gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest"
                  >
                    <IndianRupee className="h-3.5 w-3.5" /> Add Due Payment
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => setEditOpen(true)}
                    className="h-10 w-full gap-1.5 rounded-none text-[9px] font-bold uppercase tracking-widest"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    onClick={() => setCancelOpen(true)}
                    className="h-10 w-full gap-1.5 rounded-none border-red-500/30 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/5"
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

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-6 xl:col-span-8">
          <section className="border border-border bg-background">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Financial Summary</h2>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-px bg-border sm:grid-cols-2">
              {[
                { label: "Agreement Total", value: formatINR(agreementTotal) },
                { label: "Booking Amount", value: formatINR(customer.bookingAmount) },
                { label: "Total Paid", value: formatINR(collectedAmount), valClass: "text-emerald-600" },
                { label: "Remaining Balance", value: formatINR(isCancelled ? 0 : remainingAmount), valClass: isCancelled ? undefined : remainingAmount > 0 ? "text-red-500" : "text-emerald-600" },
              ].map((row) => (
                <div key={row.label} className="bg-background px-5 py-5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">{row.label}</p>
                  <p className={cn("mt-2 font-sans text-2xl font-bold tabular-nums tracking-tight", row.valClass)}>{row.value}</p>
                </div>
              ))}
            </div>
            {!isCancelled && (
              <div className="border-t border-border px-5 py-4">
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
                <p className="mt-2 max-w-3xl text-[10px] leading-relaxed text-muted-foreground/60">
                  Collections and agreement changes are now tracked separately. Edit price, GST, discounts, or charges below without creating fake payments.
                </p>
              </div>
            )}
          </section>

          <section className="border border-border bg-background">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Customer Flats</h2>
              <p className="text-[10px] text-muted-foreground/70">Select a flat to load its own agreement and payment data.</p>
            </div>
            <div>
              <table className="w-full table-fixed text-left">
                <thead className="border-b border-border bg-muted/20">
                  <tr className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">
                    <th className="px-3 py-3 w-[19%]">Site</th>
                    <th className="px-3 py-3 w-[25%]">Unit Details</th>
                    <th className="px-3 py-3 w-[12%]">Cost</th>
                    <th className="px-3 py-3 w-[12%]">Paid</th>
                    <th className="px-3 py-3 w-[12%]">Remaining</th>
                    <th className="px-3 py-3 w-[10%]">Status</th>
                    <th className="px-3 py-3 w-[10%]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {customerDeals.map((deal) => {
                    const dealFloor = deal.floorName || (deal.floorNumber !== null ? `Floor ${deal.floorNumber}` : "\u2014")
                    const dealFlat = deal.customFlatId || (deal.flatNumber !== null ? `Flat ${deal.flatNumber}` : "\u2014")
                    const dealStatus = deal.dealStatus === "CANCELLED" ? "CANCELLED" : (deal.flatStatus ?? "ACTIVE")
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => setSelectedCustomerId(deal.id)}
                        className={cn(
                          "cursor-pointer border-b border-border/70 text-sm hover:bg-muted/20",
                          selectedCustomerId === deal.id && "bg-primary/5"
                        )}
                      >
                        <td className="px-3 py-3 align-top">
                          <p className="font-semibold leading-snug break-words">{deal.siteName || "\u2014"}</p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="leading-snug break-words">{deal.wingName ? `${deal.wingName} / ` : ""}{dealFloor}</p>
                          <p className="leading-snug break-words font-semibold">{dealFlat}</p>
                          <p className="text-[11px] text-muted-foreground/70 leading-snug break-words">{deal.unitType || deal.flatType || "\u2014"}</p>
                        </td>
                        <td className="px-3 py-3 font-semibold align-top">{formatINR(deal.sellingPrice)}</td>
                        <td className="px-3 py-3 text-emerald-600 font-semibold align-top">{formatINR(deal.amountPaid)}</td>
                        <td className={cn("px-3 py-3 font-semibold align-top", deal.remaining > 0 ? "text-red-500" : "text-emerald-600")}>
                          {formatINR(deal.remaining)}
                        </td>
                        <td className="px-3 py-3 align-top">{dealStatus}</td>
                        <td className="px-3 py-3 align-top">{formatDate(deal.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="min-w-0 border border-border bg-background p-5">
            <CustomerAgreementPanel
              customerId={customer.id}
              siteId={siteId}
              canEdit={canEdit}
              agreement={agreement}
              isLoading={isAgreementLoading}
              contextLabel={getDealLocationLabel(customer)}
            />
          </section>
        </div>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:col-span-4">
          <div className="border border-border bg-background">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Profile</h2>
            </div>
            <div>
              <SummaryRow label="Name" value={customer.name} />
              <SummaryRow label="Phone" value={customer.phone || "\u2014"} />
              <SummaryRow label="Email" value={customer.email || "\u2014"} />
              <SummaryRow label="Status" value={String(statusDisplay)} />
            </div>
          </div>

          <div className="border border-border bg-background">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Property</h2>
            </div>
            <div>
              {siteName && <SummaryRow label="Site" value={siteName} />}
              {customer.wingName && <SummaryRow label="Wing" value={customer.wingName} />}
              <SummaryRow label="Floor" value={floorDisplayName} />
              <SummaryRow label="Flat" value={flatDisplayName} />
              <SummaryRow label="Unit Type" value={customer.unitType || customer.flatType || "\u2014"} />
              <SummaryRow label="Booking / sale" value={formatDate(displayCreatedAt)} />
            </div>
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
                  <p className="mt-0.5">{customer.cancelledFromFlatStatus ?? "\u2014"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Reason</p>
                  <p className="mt-0.5 leading-relaxed">{customer.cancellationReason || "\u2014"}</p>
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

      <Dialog open={paymentPickerOpen} onOpenChange={setPaymentPickerOpen}>
        <DialogContent className="max-h-[min(90vh,90vh)] max-w-2xl overflow-y-auto rounded-none border-border p-0">
          <DialogHeader className="border-b border-border px-8 py-6">
            <DialogTitle className="text-2xl font-serif tracking-tight">Select Flat for Payment</DialogTitle>
          </DialogHeader>
          <div className="px-8 py-6 space-y-3">
            {payableDeals.map((deal) => (
              <button
                key={deal.id}
                type="button"
                onClick={() => setPaymentTargetCustomerId(deal.id)}
                className={cn(
                  "w-full border px-4 py-3 text-left transition-colors",
                  paymentTargetCustomerId === deal.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20"
                )}
              >
                <p className="text-sm font-semibold">{getDealLocationLabel(deal)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Agreement {formatINR(deal.sellingPrice)} / Paid {formatINR(deal.amountPaid)} / Remaining {formatINR(deal.remaining)}
                </p>
              </button>
            ))}
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" onClick={() => setPaymentPickerOpen(false)} className="h-10 rounded-none text-[9px] font-bold uppercase tracking-widest">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!paymentTargetCustomerId) return
                  setPaymentPickerOpen(false)
                  setIsPaymentModalOpen(true)
                }}
                disabled={!paymentTargetCustomerId}
                className="h-10 rounded-none text-[9px] font-bold uppercase tracking-widest"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isPaymentModalOpen && canAddPayment && (
        <RecordPaymentModal
          title={`Customer: ${paymentTargetDeal?.name || customer.name}`}
          totalAmount={paymentTargetDeal?.sellingPrice ?? agreementTotal}
          currentlyPaid={paymentTargetDeal?.amountPaid ?? collectedAmount}
          entityType="customer-booking"
          entityId={paymentTargetDeal?.id ?? customer.id}
          onSubmit={(paymentInput: RecordPaymentInput) =>
            recordPayment({
              customerId: paymentTargetDeal?.id ?? customer.id,
              siteId: paymentTargetDeal?.siteId ?? siteId,
              data: paymentInput,
            })
          }
          onClose={() => setIsPaymentModalOpen(false)}
          isPending={isPaying}
          onDownloadStatement={handleDownloadStatement}
          isDownloadingStatement={isDownloadingStatement}
          contextNote={paymentTargetDeal ? getDealLocationLabel(paymentTargetDeal) : getDealLocationLabel(customer)}
        />
      )}
    </div>
  )
}
