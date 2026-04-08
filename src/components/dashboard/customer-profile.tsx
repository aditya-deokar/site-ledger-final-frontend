"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Customer, updateCustomerSchema, UpdateCustomerInput } from "@/schemas/customer.schema"
import { useUpdateCustomer, useCancelBooking, useCustomerPayments, useRecordCustomerPayment } from "@/hooks/api/customer.hooks"
import { useSite } from "@/hooks/api/site.hooks"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { X, Loader2, Phone, Mail, Building2, Layers, Hash, CreditCard, Pencil, Trash2, IndianRupee, Download } from "lucide-react"
import { RecordPaymentModal } from "./record-payment-modal"
import { ReceiptEditor } from "./receipt-editor"

function formatINR(n: number) { return "₹" + n.toLocaleString("en-IN") }
function formatDate(iso?: string | null) {
  if (!iso) return "—"

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function formatReceiptDate(value: string) {
  const parts = value.split("-")
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return value
}

type CustomerPaymentHistoryItem = {
  id: string
  amount: number
  note: string | null
  createdAt: string
}

type EditableReceiptPaymentRow = {
  id: string
  paidDate: string
  paidAmount: number
  paymentMode: string
  comment: string
}

type CancelBookingError = {
  status?: number
  ok?: false
  error?: string
  availableFund?: number
  refundAmount?: number
  shortfall?: number
}

// ── Edit Details Form ───────────────────────────────
function EditForm({ customer, siteId, onClose }: { customer: Customer; siteId: string; onClose: () => void }) {
  const { mutate, isPending } = useUpdateCustomer({ onSuccess: onClose })
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateCustomerInput>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: { name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "" },
  })

  return (
    <form onSubmit={handleSubmit((data) => mutate({ siteId, flatId: customer.flatId, customerId: customer.id, data: { name: data.name, phone: data.phone, email: data.email || undefined } }))} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Name</Label>
        <Input className="h-10 bg-muted border-none rounded-none text-sm" {...register("name")} />
        {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Phone</Label>
          <Input className="h-10 bg-muted border-none rounded-none text-sm" {...register("phone")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Email</Label>
          <Input className="h-10 bg-muted border-none rounded-none text-sm" {...register("email")} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending} size="sm" className="flex-1 h-9 rounded-none font-bold text-[9px] tracking-widest uppercase">
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase px-4">Cancel</Button>
      </div>
    </form>
  )
}

// ── Record Payment Form ─────────────────────────────
// The PaymentForm is handled by RecordPaymentModal now.

// ── Cancel Confirm ──────────────────────────────────
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
  const { mutate, isPending, error, reset } = useCancelBooking({ onSuccess: onDone })
  const flatDisplayName = customer.customFlatId || `Flat ${customer.flatNumber}`
  const floorDisplayName = customer.floorName || `Floor ${customer.floorNumber}`
  const cancelError = error as CancelBookingError | null
  const hasShortfallDetails =
    cancelError?.error === 'INSUFFICIENT_FUNDS'
    && typeof cancelError.shortfall === 'number'
    && typeof cancelError.availableFund === 'number'
    && typeof cancelError.refundAmount === 'number'

  const handleGoToAddFund = () => {
    if (!hasShortfallDetails) return

    const params = new URLSearchParams({
      fund: 'add',
      amount: String(cancelError.shortfall!),
    })

    reset()
    onNavigateToAddFund()
    router.push(`/sites/${siteId}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-red-500/10 border border-red-500/20 p-4">
        <p className="text-sm text-foreground font-serif">Cancel booking for <strong>{customer.name}</strong>?</p>
        <p className="text-[10px] text-muted-foreground mt-1">{flatDisplayName} ({floorDisplayName}) will be set back to AVAILABLE. Customer record will be removed.</p>
      </div>
      {cancelError && !hasShortfallDetails && (
        <div className="border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="text-[10px] leading-relaxed">
            {typeof cancelError.error === "string" ? cancelError.error : "Failed to cancel booking"}
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={() => mutate({ siteId, flatId: customer.flatId, customerId: customer.id })} disabled={isPending} variant="destructive" size="sm"
          className="flex-1 h-9 rounded-none font-bold text-[9px] tracking-widest uppercase"
        >{isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cancel Booking"}</Button>
        <Button variant="outline" size="sm" onClick={onClose} className="h-9 rounded-none font-bold text-[9px] tracking-widest uppercase px-4">Keep</Button>
      </div>

      <Dialog open={hasShortfallDetails} onOpenChange={(open) => { if (!open) reset() }}>
        <DialogContent className="max-w-md rounded-none border-border p-0 gap-0">
          <DialogHeader className="px-8 pt-8 pb-4 border-b border-border">
            <DialogTitle className="text-2xl font-serif tracking-tight">Fund Needed to Cancel Booking</DialogTitle>
          </DialogHeader>
          <div className="px-8 py-6 flex flex-col gap-4">
            <div className="border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-serif text-foreground">This booking cannot be cancelled yet because the site does not have enough balance to refund the customer.</p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Add the missing fund to this site, then try the cancellation again.
              </p>
            </div>

            <div className="border border-border divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Refund Required</span>
                <span className="text-sm font-serif text-foreground">{formatINR(cancelError?.refundAmount ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Available Site Fund</span>
                <span className="text-sm font-serif text-foreground">{formatINR(cancelError?.availableFund ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50">Need to Add</span>
                <span className="text-lg font-serif text-primary">{formatINR(cancelError?.shortfall ?? 0)}</span>
              </div>
            </div>
          </div>
          <div className="px-8 pb-8 flex gap-3">
            <Button variant="outline" onClick={() => reset()} className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest">
              Close
            </Button>
            <Button onClick={handleGoToAddFund} className="flex-1 rounded-none h-11 text-[10px] font-bold uppercase tracking-widest gap-2">
              <IndianRupee className="w-4 h-4" /> Add Fund
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Main Panel ──────────────────────────────────────

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
    }
  })
  const { data: paymentHistoryData } = useCustomerPayments(customer.id)
  const { data: siteData } = useSite(siteId)

  const paymentHistory = (paymentHistoryData?.data?.payments ?? []) as CustomerPaymentHistoryItem[]
  const fallbackCreatedAt = paymentHistory.reduce<string | undefined>((earliest, payment) => {
    const paymentDate = new Date(payment.createdAt)
    if (Number.isNaN(paymentDate.getTime())) return earliest
    if (!earliest) return payment.createdAt

    const earliestDate = new Date(earliest)
    return paymentDate < earliestDate ? payment.createdAt : earliest
  }, undefined)
  const displayCreatedAt = customer.createdAt || fallbackCreatedAt

  const pct = customer.sellingPrice > 0
    ? Math.min(100, (customer.amountPaid / customer.sellingPrice) * 100)
    : customer.remaining <= 0
      ? 100
      : 0
  const isSold = customer.flatStatus === "SOLD"

  const flatDisplayName = customer.customFlatId || `Flat ${customer.flatNumber}`
  const floorDisplayName = customer.floorName || `Floor ${customer.floorNumber}`

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-border">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40 mb-2">Customer Profile</p>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-serif tracking-tight text-foreground">{customer.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={cn(
                  "px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase",
                  isSold ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                )}>
                  {customer.flatStatus}
                </span>
                <span className="text-[9px] font-bold tracking-widest text-muted-foreground/40">
                  {flatDisplayName} · {floorDisplayName}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-8 py-6 flex-1 flex flex-col gap-6">

          {/* Contact Info */}
          <div className="flex flex-col gap-3">
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Contact</p>
            <div className="flex flex-col gap-2">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/40" /> {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/40" /> {customer.email}
                </div>
              )}
            </div>
          </div>

          {/* Property Info */}
          <div className="flex flex-col gap-3">
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Property</p>
            <div className="grid grid-cols-2 gap-3">
              {siteName && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground/40" /> {siteName}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Layers className="w-3.5 h-3.5 text-muted-foreground/40" /> {floorDisplayName}
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Hash className="w-3.5 h-3.5 text-muted-foreground/40" /> {flatDisplayName}
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground/40" /> {formatDate(displayCreatedAt)}
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="flex flex-col gap-4">
            {/* Visually Striking Remaining Balance Hero */}
            <div className={cn(
              "flex flex-col items-center justify-center py-8 border",
              customer.remaining > 0 
                ? "bg-red-500/5 border-red-500/20" 
                : "bg-emerald-500/5 border-emerald-500/20"
            )}>
              <span className={cn(
                "text-[10px] font-bold tracking-[0.3em] uppercase mb-2",
                customer.remaining > 0 ? "text-red-500/70" : "text-emerald-600/70"
              )}>
                {customer.remaining > 0 ? "Remaining Balance" : "Fully Paid"}
              </span>
              <span className={cn(
                "text-5xl font-sans font-bold tracking-tighter",
                customer.remaining > 0 ? "text-red-500" : "text-emerald-600"
              )}>
                {formatINR(customer.remaining)}
              </span>
            </div>

            <div className="border border-border divide-y divide-border">
              <div className="flex justify-between px-4 py-3">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Selling Price</span>
                <span className="text-sm font-serif">{formatINR(customer.sellingPrice)}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Booking Amount</span>
                <span className="text-sm font-serif">{formatINR(customer.bookingAmount)}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Total Paid</span>
                <span className="text-sm font-serif text-emerald-600">{formatINR(customer.amountPaid)}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Payment Progress</span>
                <span className="text-[9px] font-bold tracking-widest text-primary">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted overflow-hidden">
                <div className={cn("h-full transition-all", isSold ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground/60">
                Follow-up collections only need the newly received amount. The agreement value above stays linked to this record.
              </p>
            </div>
          </div>

          {/* Action Forms */}
          {mode === "edit" && <EditForm customer={customer} siteId={siteId} onClose={() => setMode("view")} />}
          {mode === "cancel" && <CancelConfirm customer={customer} siteId={siteId} onClose={() => setMode("view")} onDone={onClose} onNavigateToAddFund={onClose} />}
        </div>

        {isPaymentModalOpen && (
          <RecordPaymentModal
            title={`Customer: ${customer.name}`}
            totalAmount={customer.sellingPrice}
            currentlyPaid={customer.amountPaid}
            entityType="customer-booking"
            entityId={customer.id}
            onSubmit={(amount, note) => recordPayment({ customerId: customer.id, data: { amount, note } })}
            onClose={() => setIsPaymentModalOpen(false)}
            isPending={isPaying}
          />
        )}

        {isReceiptModalOpen && (
          <ReceiptEditor
            customer={{ ...customer, siteName }}
            siteAddress={siteData?.data?.site?.address}
            payments={paymentHistory}
            onClose={() => setIsReceiptModalOpen(false)}
          />
        )}

        {/* Footer Actions */}
        {mode === "view" && (
          <div className="px-8 py-5 border-t border-border flex gap-2">
            {customer.remaining > 0 && (
              <Button onClick={() => setIsPaymentModalOpen(true)} className="flex-1 h-11 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> Add Due Payment
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsReceiptModalOpen(true)} className="h-11 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5 px-4">
              <Download className="w-3.5 h-3.5" /> Receipt
            </Button>
            <Button variant="outline" onClick={() => setMode("edit")} className="h-11 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5 px-4">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            {customer.flatStatus === "BOOKED" && (
              <Button variant="outline" onClick={() => setMode("cancel")}
                className="h-11 rounded-none font-bold text-[9px] tracking-widest uppercase gap-1.5 px-4 text-red-500 border-red-500/30 hover:bg-red-500/5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
