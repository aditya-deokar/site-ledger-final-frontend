"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ChevronLeft,
  Download,
  IndianRupee,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react"

import {
  Customer,
  CustomerPaymentHistoryItem,
  CustomerWithSite,
  RecordPaymentInput,
  UpdateCustomerInput,
  updateCustomerSchema,
} from "@/schemas/customer.schema"
import { createFlatSchema } from "@/schemas/site.schema"
import {
  useCancelDeal,
  useCustomerAgreement,
  useCustomerPayments,
  useRecordCustomerPayment,
  useUpdateCustomer,
} from "@/hooks/api/customer.hooks"
import { useSite, useUpdateFlatDetails } from "@/hooks/api/site.hooks"
import { useCompany } from "@/hooks/api/company.hooks"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CompactModeToggle,
  DetailDensityMode,
  KpiBox,
} from "@/components/dashboard/customer-detail-primitives"
import { CustomerAgreementPanel } from "@/components/dashboard/customer-agreement-panel"
import { RecordPaymentModal } from "@/components/dashboard/record-payment-modal"
import { getApiErrorMessage } from "@/lib/api-error"
import { downloadReceiptPDF, downloadStatementPDF } from "@/lib/pdf-generator"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function formatINR(value: number) {
  return "\u20B9" + value.toLocaleString("en-IN")
}

function formatDate(iso?: string | null) {
  if (!iso) return "\u2014"

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "\u2014"

  return date
    .toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase()
}

function formatPaymentMode(mode: CustomerPaymentHistoryItem["paymentMode"]) {
  switch (mode) {
    case "BANK_TRANSFER":
      return "Bank Transfer"
    case "CHEQUE":
      return "Cheque"
    case "UPI":
      return "UPI"
    case "CASH":
      return "Cash"
    default:
      return "\u2014"
  }
}

function getFlatDisplayName(customer: Customer) {
  if (customer.dealStatus === "CANCELLED") {
    return (
      customer.cancelledFlatDisplay
      || customer.customFlatId
      || (customer.flatNumber !== null ? `Flat ${customer.flatNumber}` : "Flat -")
    )
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

function getLedgerEntryLabel(payment: CustomerPaymentHistoryItem) {
  if (payment.direction === "OUT" || payment.movementType === "CUSTOMER_REFUND") {
    return "Refund"
  }

  return "Payment"
}

type CancelDealError = {
  status?: number
  ok?: false
  error?: string
  availableFund?: number
  refundAmount?: number
  shortfall?: number
}

const LEDGER_PREVIEW_ROWS = 4

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

function EditForm({
  customer,
  siteId,
  density,
  onClose,
}: {
  customer: Customer
  siteId: string
  density: DetailDensityMode
  onClose: () => void
}) {
  const compact = density === "compact"
  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer, error: customerError } = useUpdateCustomer()
  const { mutateAsync: updateFlat, isPending: isUpdatingFlat, error: flatError } = useUpdateFlatDetails(siteId)
  const isPending = isUpdatingCustomer || isUpdatingFlat
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditCustomerProfileInput>({
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
      className={cn("flex flex-col", compact ? "gap-3" : "gap-4")}
    >
      {(flatError || customerError) ? (
        <div className="border border-destructive/30 bg-destructive/10 p-3 text-[11px] text-destructive">
          {getApiErrorMessage(flatError ?? customerError, "Failed to update booking details.")}
        </div>
      ) : null}

      <div className={cn("grid", compact ? "gap-3 sm:grid-cols-2" : "gap-4 sm:grid-cols-2")}>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Flat ID</Label>
          <Input className="h-10 rounded-none border-none bg-muted text-sm" {...register("customFlatId")} />
          {errors.customFlatId ? <p className="text-[10px] text-destructive">{errors.customFlatId.message}</p> : null}
          <p className="text-[10px] text-muted-foreground/50">This updates the unit label shown across site inventory.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Name</Label>
          <Input className="h-10 rounded-none border-none bg-muted text-sm" {...register("name")} />
          {errors.name ? <p className="text-[10px] text-destructive">{errors.name.message}</p> : null}
        </div>
      </div>

      <div className={cn("grid", compact ? "gap-3 sm:grid-cols-2" : "gap-4 sm:grid-cols-2")}>
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
        <Button
          type="submit"
          disabled={isPending}
          size="sm"
          className={cn("min-w-[140px] rounded-none text-[9px] font-bold uppercase tracking-widest", compact ? "h-9 flex-1" : "h-10 flex-1")}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className={cn("rounded-none px-4 text-[9px] font-bold uppercase tracking-widest", compact ? "h-9" : "h-10")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

function CancelConfirm({
  customer,
  siteId,
  density,
  onClose,
  onDone,
  onNavigateToAddFund,
}: {
  customer: Customer
  siteId: string
  density: DetailDensityMode
  onClose: () => void
  onDone: () => void
  onNavigateToAddFund: () => void
}) {
  const compact = density === "compact"
  const router = useRouter()
  const { mutate, isPending, error, reset } = useCancelDeal({ onSuccess: onDone })
  const maxRefund = Math.max(customer.amountPaid, 0)
  const cancelDealSchema = buildCancelDealSchema(maxRefund)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof cancelDealSchema>>({
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
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4")}>
      <div className="border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm font-serif text-foreground">
          Cancel deal for <strong>{customer.name}</strong>?
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {flatDisplayName} ({floorDisplayName}) will be set back to AVAILABLE. Customer and payment records stay preserved for audit.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((data) => {
          if (!customer.flatId) return
          mutate({ siteId, flatId: customer.flatId, customerId: customer.id, data })
        })}
        className={cn("flex flex-col", compact ? "gap-3" : "gap-4")}
      >
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Cancellation Reason</Label>
          <Textarea
            rows={4}
            className="rounded-none border-none bg-muted text-sm"
            placeholder="Why is this deal being cancelled?"
            {...register("reason")}
          />
          {errors.reason ? <p className="text-[10px] text-destructive">{errors.reason.message}</p> : null}
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
          {errors.refundAmount ? <p className="text-[10px] text-destructive">{errors.refundAmount.message}</p> : null}
          <p className="text-[10px] text-muted-foreground/60">
            Enter any amount from {formatINR(0)} to {formatINR(maxRefund)}.
          </p>
        </div>

        {cancelError && !hasShortfallDetails ? (
          <div className="border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <p className="text-[10px] leading-relaxed">
              {typeof cancelError.error === "string" ? cancelError.error : "Failed to cancel deal"}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={isPending || !customer.flatId}
            variant="destructive"
            size="sm"
            className={cn("min-w-[140px] rounded-none text-[9px] font-bold uppercase tracking-widest", compact ? "h-9 flex-1" : "h-10 flex-1")}
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel Deal"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className={cn("rounded-none px-4 text-[9px] font-bold uppercase tracking-widest", compact ? "h-9" : "h-10")}
          >
            Keep Active
          </Button>
        </div>
      </form>

      <Dialog
        open={hasShortfallDetails}
        onOpenChange={(open) => {
          if (!open) reset()
        }}
      >
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

function CustomerFlatsCard({
  deals,
  selectedCustomerId,
  density,
  onSelect,
}: {
  deals: CustomerWithSite[]
  selectedCustomerId: string
  density: DetailDensityMode
  onSelect: (customerId: string) => void
}) {
  const compact = density === "compact"

  return (
    <div className="border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-2.5 py-2">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/50">Customer Flats</p>
          <p className="mt-0.5 text-[9px] text-muted-foreground/70">Select a flat to load its agreement and ledger.</p>
        </div>
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/50">{deals.length} Deals</span>
      </div>

      <table className="w-full table-fixed text-left">
        <thead className="border-b border-border bg-muted/[0.03]">
          <tr className={cn("font-bold uppercase tracking-[0.14em] text-muted-foreground/55", compact ? "text-[7px]" : "text-[8px]")}>
            <th className={cn(compact ? "w-[17%] px-2 py-1.5" : "w-[17%] px-2 py-1.5")}>Site</th>
            <th className={cn(compact ? "w-[28%] px-2 py-1.5" : "w-[28%] px-2 py-1.5")}>Unit</th>
            <th className={cn(compact ? "w-[14%] px-2 py-1.5" : "w-[14%] px-2 py-1.5")}>Agreement</th>
            <th className={cn(compact ? "w-[13%] px-2 py-1.5" : "w-[13%] px-2 py-1.5")}>Paid</th>
            <th className={cn(compact ? "w-[13%] px-2 py-1.5" : "w-[13%] px-2 py-1.5")}>Balance</th>
            <th className={cn(compact ? "w-[7%] px-2 py-1.5" : "w-[7%] px-2 py-1.5")}>Status</th>
            <th className={cn(compact ? "w-[8%] px-2 py-1.5" : "w-[8%] px-2 py-1.5")}>Date</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => {
            const dealFloor = deal.floorName || (deal.floorNumber !== null ? `Floor ${deal.floorNumber}` : "\u2014")
            const dealFlat = deal.customFlatId || (deal.flatNumber !== null ? `Flat ${deal.flatNumber}` : "\u2014")
            const dealStatus = deal.dealStatus === "CANCELLED" ? "CANCELLED" : (deal.flatStatus ?? "ACTIVE")

            return (
              <tr
                key={deal.id}
                onClick={() => onSelect(deal.id)}
                className={cn(
                  "cursor-pointer border-b border-border/50 align-top transition-colors hover:bg-muted/20",
                  compact ? "text-[10px]" : "text-[11px]",
                  selectedCustomerId === deal.id && "bg-primary/5",
                )}
              >
                <td className={cn("align-top", compact ? "px-2 py-1.5" : "px-2 py-1.5")}>
                  <p className="truncate font-semibold text-foreground">{deal.siteName || "\u2014"}</p>
                </td>
                <td className={cn("align-top", compact ? "px-2 py-1.5" : "px-2 py-1.5")}>
                  <p className="truncate text-foreground">{deal.wingName ? `${deal.wingName} / ${dealFloor}` : dealFloor}</p>
                  <p className="truncate font-semibold text-foreground">{dealFlat}</p>
                </td>
                <td className={cn("align-top font-semibold text-foreground", compact ? "px-2 py-1.5" : "px-2 py-1.5")}>
                  {formatINR(deal.sellingPrice)}
                </td>
                <td className={cn("align-top font-semibold text-emerald-600", compact ? "px-2 py-1.5" : "px-2 py-1.5")}>
                  {formatINR(deal.amountPaid)}
                </td>
                <td
                  className={cn(
                    "align-top font-semibold",
                    deal.remaining > 0 ? "text-red-500" : "text-emerald-600",
                    compact ? "px-2 py-1.5" : "px-2 py-1.5",
                  )}
                >
                  {formatINR(deal.remaining)}
                </td>
                <td className={cn("align-top font-medium text-foreground", compact ? "px-2 py-1.5" : "px-2 py-1.5")}>
                  {dealStatus}
                </td>
                <td className={cn("align-top text-muted-foreground/80", compact ? "px-2 py-1.5" : "px-2 py-1.5")}>
                  {formatDate(deal.createdAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CustomerSnapshotCard({
  customer,
  density,
  siteName,
  floorDisplayName,
  flatDisplayName,
  displayCreatedAt,
  statusDisplay,
  isCancelled,
}: {
  customer: CustomerWithSite
  density: DetailDensityMode
  siteName?: string
  floorDisplayName: string
  flatDisplayName: string
  displayCreatedAt?: string
  statusDisplay: string
  isCancelled: boolean
}) {
  const compact = density === "compact"
  const statusTone = isCancelled
    ? "border-red-500/20 bg-red-500/10 text-red-500"
    : customer.flatStatus === "SOLD" || customer.remaining <= 0
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
      : "border-amber-500/20 bg-amber-500/10 text-amber-600"

  return (
    <div className="border border-border bg-background p-2.5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/50">Customer Snapshot</p>
        <span className={cn("inline-flex items-center border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]", statusTone)}>
          {statusDisplay}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {[
          { label: "Name", value: customer.name },
          { label: "Site", value: siteName || "\u2014" },
          { label: "Phone", value: customer.phone || "\u2014" },
          { label: "Wing", value: customer.wingName || "\u2014" },
          { label: "Email", value: customer.email || "\u2014" },
          { label: "Floor", value: floorDisplayName },
          { label: "Booking Amt", value: formatINR(customer.bookingAmount) },
          { label: "Flat", value: flatDisplayName },
          { label: "Booked / Sale", value: formatDate(displayCreatedAt) },
          { label: "Unit Type", value: customer.unitType || customer.flatType || "\u2014" },
        ].map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground/50">{item.label}</p>
            <p className={cn("mt-0.5 break-words text-foreground", compact ? "text-[11px] leading-snug" : "text-xs")}>{item.value}</p>
          </div>
        ))}
      </div>

      {isCancelled ? (
        <div className="mt-2.5 border-t border-border pt-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-red-500/75">Cancelled On</p>
              <p className="mt-0.5 text-[11px] text-foreground">{formatDate(customer.cancelledAt)}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-red-500/75">Released From</p>
              <p className="mt-0.5 text-[11px] text-foreground">{customer.cancelledFromFlatStatus || "\u2014"}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-red-500/75">Reason</p>
              <p className="mt-0.5 text-[11px] leading-snug text-foreground">{customer.cancellationReason || "\u2014"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CustomerLedgerTable({
  payments,
  density,
}: {
  payments: CustomerPaymentHistoryItem[]
  density: DetailDensityMode
}) {
  const compact = density === "compact"

  return (
    <table className="w-full table-fixed text-left">
      <thead className="border-b border-border bg-muted/[0.03]">
        <tr className={cn("font-bold uppercase tracking-[0.14em] text-muted-foreground/55", compact ? "text-[7px]" : "text-[8px]")}>
          <th className={cn(compact ? "w-[12%] px-2 py-1.5" : "w-[12%] px-2.5 py-2")}>Date</th>
          <th className={cn(compact ? "w-[10%] px-2 py-1.5" : "w-[10%] px-2.5 py-2")}>Type</th>
          <th className={cn(compact ? "w-[12%] px-2 py-1.5" : "w-[12%] px-2.5 py-2")}>Mode</th>
          <th className={cn(compact ? "w-[16%] px-2 py-1.5" : "w-[16%] px-2.5 py-2")}>Reference</th>
          <th className={cn(compact ? "w-[14%] px-2 py-1.5" : "w-[14%] px-2.5 py-2")}>Amount</th>
          <th className={cn(compact ? "w-[36%] px-2 py-1.5" : "w-[36%] px-2.5 py-2")}>Note</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => {
          const isRefund = payment.direction === "OUT" || payment.movementType === "CUSTOMER_REFUND"

          return (
            <tr key={payment.id} className={cn("border-b border-border/50 align-top", compact ? "text-[10px]" : "text-[11px]")}>
              <td className={cn("align-top text-muted-foreground/80", compact ? "px-2 py-1.5" : "px-2.5 py-2")}>
                {formatDate(payment.createdAt)}
              </td>
              <td className={cn("align-top font-medium text-foreground", compact ? "px-2 py-1.5" : "px-2.5 py-2")}>
                {getLedgerEntryLabel(payment)}
              </td>
              <td className={cn("align-top text-foreground", compact ? "px-2 py-1.5" : "px-2.5 py-2")}>
                {formatPaymentMode(payment.paymentMode)}
              </td>
              <td className={cn("align-top break-words text-muted-foreground/80", compact ? "px-2 py-1.5" : "px-2.5 py-2")}>
                {payment.referenceNumber || "\u2014"}
              </td>
              <td
                className={cn(
                  "align-top font-semibold",
                  isRefund ? "text-red-500" : "text-emerald-600",
                  compact ? "px-2 py-1.5" : "px-2.5 py-2",
                )}
              >
                {isRefund ? `- ${formatINR(payment.amount)}` : formatINR(payment.amount)}
              </td>
              <td className={cn("align-top break-words text-muted-foreground/80", compact ? "px-2 py-1.5" : "px-2.5 py-2")}>
                {payment.note || "\u2014"}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function CustomerLedgerCard({
  payments,
  density,
  onOpenAll,
}: {
  payments: CustomerPaymentHistoryItem[]
  density: DetailDensityMode
  onOpenAll: () => void
}) {
  const compact = density === "compact"
  const hasExtraRows = payments.length > LEDGER_PREVIEW_ROWS
  const visiblePayments = payments.slice(0, LEDGER_PREVIEW_ROWS)

  return (
    <div className="border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/50">Customer Ledger</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/70">Latest {Math.min(LEDGER_PREVIEW_ROWS, payments.length || LEDGER_PREVIEW_ROWS)} entries for this flat.</p>
        </div>
        {hasExtraRows ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAll}
            className={cn("rounded-none text-[8px] font-bold uppercase tracking-[0.16em]", compact ? "h-7 px-2.5" : "h-8 px-3")}
          >
            View All
          </Button>
        ) : null}
      </div>

      {payments.length === 0 ? (
        <div className="flex items-center justify-center px-4 py-6 text-center text-[11px] text-muted-foreground/65">
          No customer ledger entries yet for this flat.
        </div>
      ) : (
        <CustomerLedgerTable payments={visiblePayments} density={density} />
      )}
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
  const [compactMode, setCompactMode] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentPickerOpen, setPaymentPickerOpen] = useState(false)
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false)
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const [isDownloadingStatement, setIsDownloadingStatement] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomer.id)
  const [paymentTargetCustomerId, setPaymentTargetCustomerId] = useState<string | null>(null)

  const density: DetailDensityMode = compactMode ? "compact" : "comfortable"
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
  const orderedPaymentHistory = useMemo(
    () => [...paymentHistory].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()),
    [paymentHistory],
  )
  const receiptPayments = useMemo(
    () => orderedPaymentHistory.filter((payment) => payment.direction === "IN" && payment.movementType === "CUSTOMER_PAYMENT"),
    [orderedPaymentHistory],
  )
  const fallbackCreatedAt = useMemo(
    () => orderedPaymentHistory[orderedPaymentHistory.length - 1]?.createdAt,
    [orderedPaymentHistory],
  )
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
  const progressPercent = agreementTotal > 0
    ? Math.min(100, (collectedAmount / agreementTotal) * 100)
    : remainingAmount <= 0
      ? 100
      : 0
  const issueMessages = [
    isAgreementError ? `Agreement: ${getApiErrorMessage(agreementError, "Could not load agreement.")}` : null,
    isPaymentsError ? "Payment history could not be fully loaded. Statements and receipt snapshots may be incomplete until this resolves." : null,
    isSiteError ? "Site details could not be fully loaded. Receipt address and project context may be incomplete." : null,
  ].filter(Boolean) as string[]

  useEffect(() => {
    setLedgerDialogOpen(false)
  }, [customer.id])

  const handleDownloadReceipt = async () => {
    const latestPayment = receiptPayments[0]
    if (!latestPayment) return

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
        companyData.data.company,
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
        orderedPaymentHistory,
        agreement,
        siteData.data.site,
        companyData.data.company,
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
    <div className="h-full min-h-0 w-full overflow-hidden">
      <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-3 overflow-hidden">
        <div className="border border-border bg-background px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href="/customers"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-7 min-h-0 shrink-0 rounded-none px-2 text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground",
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Customers
              </Link>
              <h1 className={cn("min-w-0 truncate font-sans font-bold tracking-tight text-foreground", compactMode ? "text-xl" : "text-2xl")}>
                {customer.name}
              </h1>
              <span
                className={cn(
                  "shrink-0 border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]",
                  isCancelled
                    ? "border-red-500/20 bg-red-500/10 text-red-500"
                    : isSold
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-600",
                )}
              >
                {statusBadgeLabel}
              </span>
              <span className="min-w-0 truncate text-[10px] text-muted-foreground/75">{getDealLocationLabel(customer)}</span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <CompactModeToggle checked={compactMode} density={density} onCheckedChange={setCompactMode} />
              <Button
                variant="outline"
                onClick={handleDownloadReceipt}
                disabled={isDownloadingReceipt || receiptPayments.length === 0}
                className="h-8 gap-1.5 rounded-none px-3 text-[8px] font-bold uppercase tracking-[0.16em]"
              >
                {isDownloadingReceipt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Receipt
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadStatement}
                disabled={isDownloadingStatement}
                className="h-8 gap-1.5 rounded-none px-3 text-[8px] font-bold uppercase tracking-[0.16em]"
              >
                {isDownloadingStatement ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Statement
              </Button>
              {canAddPayment ? (
                <Button onClick={openPaymentFlow} className="h-8 gap-1.5 rounded-none px-3 text-[8px] font-bold uppercase tracking-[0.16em]">
                  <IndianRupee className="h-3.5 w-3.5" />
                  Payment
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                  className="h-8 gap-1.5 rounded-none px-3 text-[8px] font-bold uppercase tracking-[0.16em]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  variant="outline"
                  onClick={() => setCancelOpen(true)}
                  className="h-8 gap-1.5 rounded-none border-red-500/30 px-3 text-[8px] font-bold uppercase tracking-[0.16em] text-red-500 hover:bg-red-500/5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>

          {issueMessages.length > 0 ? (
            <div className="mt-2 border border-amber-500/25 bg-amber-500/[0.04] px-2.5 py-2 text-[10px] text-amber-900">
              {issueMessages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid min-h-0 grid-cols-3 gap-3">
          <div className="col-span-2 flex min-h-0 flex-col gap-2">
            <div className="grid grid-cols-4 gap-2">
              <KpiBox density={density} label="Agreement Total" value={formatINR(agreementTotal)} />
              <KpiBox density={density} label="Total Paid" tone="success" value={formatINR(collectedAmount)} />
              <KpiBox
                density={density}
                label="Remaining Balance"
                tone={isCancelled || remainingAmount <= 0 ? "success" : "danger"}
                value={formatINR(isCancelled ? 0 : remainingAmount)}
              />
              <KpiBox
                density={density}
                label="Progress"
                tone={isSold ? "success" : "primary"}
                value={`${progressPercent.toFixed(compactMode ? 0 : 1)}%`}
                progress={progressPercent}
                progressLabel={isSold ? "Collected" : "Collections"}
              />
            </div>

            <div className="border border-border bg-background px-3 py-2.5">
              <CustomerAgreementPanel
                customerId={customer.id}
                siteId={siteId}
                canEdit={canEdit}
                agreement={agreement}
                isLoading={isAgreementLoading}
                contextLabel={getDealLocationLabel(customer)}
                compact
              />
            </div>
          </div>

          <div className="col-span-1 flex min-h-0 flex-col gap-2">
            <CustomerSnapshotCard
              customer={customer}
              density={density}
              siteName={siteName}
              floorDisplayName={floorDisplayName}
              flatDisplayName={flatDisplayName}
              displayCreatedAt={displayCreatedAt}
              statusDisplay={statusDisplay}
              isCancelled={isCancelled}
            />

            <CustomerFlatsCard
              deals={customerDeals}
              selectedCustomerId={selectedCustomerId}
              density={density}
              onSelect={setSelectedCustomerId}
            />
          </div>
        </div>

        <CustomerLedgerCard
          payments={orderedPaymentHistory}
          density={density}
          onOpenAll={() => setLedgerDialogOpen(true)}
        />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(90vh,760px)] max-w-2xl overflow-y-auto rounded-none border-border p-0">
          <DialogHeader className="border-b border-border px-8 py-6">
            <DialogTitle className="text-2xl font-serif tracking-tight">Edit customer</DialogTitle>
          </DialogHeader>
          <div className="px-8 py-6">
            {canEdit ? <EditForm customer={customer} siteId={siteId} density={density} onClose={() => setEditOpen(false)} /> : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-h-[min(90vh,90vh)] max-w-xl overflow-y-auto rounded-none border-border p-0">
          <DialogHeader className="border-b border-border px-8 py-6">
            <DialogTitle className="text-2xl font-serif tracking-tight">Cancel deal</DialogTitle>
          </DialogHeader>
          <div className="px-8 py-6">
            {canCancel ? (
              <CancelConfirm
                customer={customer}
                siteId={siteId}
                density={density}
                onClose={() => setCancelOpen(false)}
                onDone={() => {
                  setCancelOpen(false)
                  router.push("/customers")
                }}
                onNavigateToAddFund={() => setCancelOpen(false)}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentPickerOpen} onOpenChange={setPaymentPickerOpen}>
        <DialogContent className="max-h-[min(90vh,90vh)] max-w-2xl overflow-y-auto rounded-none border-border p-0">
          <DialogHeader className="border-b border-border px-8 py-6">
            <DialogTitle className="text-2xl font-serif tracking-tight">Select Flat for Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-8 py-6">
            {payableDeals.map((deal) => (
              <button
                key={deal.id}
                type="button"
                onClick={() => setPaymentTargetCustomerId(deal.id)}
                className={cn(
                  "w-full border px-4 py-3 text-left transition-colors",
                  paymentTargetCustomerId === deal.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20",
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

      <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto rounded-none border-border p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="text-xl font-serif tracking-tight">Customer Ledger</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            {orderedPaymentHistory.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No customer ledger entries yet for this flat.</div>
            ) : (
              <CustomerLedgerTable payments={orderedPaymentHistory} density={density} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isPaymentModalOpen && canAddPayment ? (
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
      ) : null}
    </div>
  )
}
