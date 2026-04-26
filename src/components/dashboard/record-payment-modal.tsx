"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Calendar, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import api from "@/lib/axios"
import { cn } from "@/lib/utils"
import { type PaymentMode, type RecordPaymentInput, recordPaymentSchema } from "@/schemas/customer.schema"

function formatINR(value: number) {
  return "\u20B9" + value.toLocaleString("en-IN")
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  })
}

function getReferenceLabel(paymentMode: PaymentMode) {
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

function getReferencePlaceholder(paymentMode: PaymentMode) {
  switch (paymentMode) {
    case "CHEQUE":
      return "Enter cheque number"
    case "BANK_TRANSFER":
      return "Enter NEFT / RTGS / IMPS reference"
    case "UPI":
      return "Enter UPI transaction ID"
    default:
      return "Enter reference number"
  }
}

interface PaymentRecord {
  id: string
  amount: number
  direction?: "IN" | "OUT"
  movementType?: "CUSTOMER_PAYMENT" | "CUSTOMER_REFUND"
  paymentMode?: PaymentMode | null
  referenceNumber?: string | null
  note: string | null
  createdAt: string
}

interface RecordPaymentModalProps {
  title: string
  contextNote?: string
  totalAmount: number
  currentlyPaid: number
  entityType: "expense" | "investor-transaction" | "company-withdrawal" | "customer-booking"
  entityId: string
  siteId?: string
  investorId?: string
  onSubmit: (payment: RecordPaymentInput) => void
  onClose: () => void
  isPending: boolean
}

interface PaymentHistoryResponse {
  ok: boolean
  data?: {
    payments?: PaymentRecord[]
  }
}

const PAYMENT_MODE_OPTIONS: Array<{ value: PaymentMode; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
]

export function RecordPaymentModal({
  title,
  contextNote,
  totalAmount,
  currentlyPaid,
  entityType,
  entityId,
  siteId,
  investorId,
  onSubmit,
  onClose,
  isPending,
}: RecordPaymentModalProps) {
  const remaining = Math.max(totalAmount - currentlyPaid, 0)
  const requiresRecordedPaymentDetails = entityType === "customer-booking"
  const [paymentAmount, setPaymentAmount] = useState(remaining)
  const [note, setNote] = useState("")
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [history, setHistory] = useState<PaymentRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (paymentMode === "CASH") {
      setReferenceNumber("")
    }
  }, [paymentMode])

  useEffect(() => {
    async function fetchHistory() {
      setLoadingHistory(true)
      try {
        let url = ""
        if (entityType === "expense" && siteId) {
          url = `/sites/${siteId}/expenses/${entityId}/payments`
        } else if (entityType === "investor-transaction" && investorId) {
          url = `/investors/${investorId}/transactions/${entityId}/payments`
        } else if (entityType === "company-withdrawal") {
          url = `/company/withdrawals/${entityId}/payments`
        } else if (entityType === "customer-booking") {
          url = `/customers/${entityId}/payments`
        }

        if (!url) {
          setHistory([])
          return
        }

        const json = await api.get(url) as PaymentHistoryResponse
        if (json.ok && Array.isArray(json.data?.payments)) {
          setHistory(json.data.payments)
        } else {
          setHistory([])
        }
      } catch (error) {
        console.warn("Failed to fetch payment history", error)
        setHistory([])
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [entityType, entityId, siteId, investorId])

  const willComplete = currentlyPaid + paymentAmount >= totalAmount

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const payload = {
      amount: paymentAmount,
      note,
      paymentMode,
      referenceNumber: requiresRecordedPaymentDetails ? referenceNumber : undefined,
    }
    const parsed = recordPaymentSchema.safeParse(payload)

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check the payment details.")
      return
    }

    setFormError(null)
    onSubmit(parsed.data)
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex h-[min(100dvh,92rem)] w-full max-w-6xl flex-col overflow-hidden border border-border bg-background shadow-2xl sm:max-h-[90vh] md:flex-row">
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-start justify-between border-b border-border px-8 pb-4 pt-8">
            <div>
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em] text-primary">Additive Ledger</p>
              <h3 className="text-lg font-serif text-foreground">{title}</h3>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
            >
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 border-b border-border bg-muted/20 px-8 py-4">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Total</span>
              <p className="text-sm font-bold text-foreground">{formatINR(totalAmount)}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Already Paid</span>
              <p className="text-sm font-bold text-primary">{formatINR(currentlyPaid)}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Remaining</span>
              <p className={cn("text-sm font-bold", remaining <= 0 ? "text-green-500" : "text-red-500")}>
                {formatINR(remaining)}
              </p>
            </div>
          </div>

          <div className="border-b border-border bg-background px-8 py-4">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Enter only the <strong className="text-foreground">new payment received now</strong>. Payment mode and
              reference number are stored against the ledger record and reused on the receipt exactly as recorded here.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-8 py-6">
            {formError && (
              <div className="border border-red-500/20 bg-red-500/10 p-3 text-[11px] text-red-600">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">New Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={remaining + 1000000}
                value={paymentAmount || ""}
                onChange={(event) => {
                  setPaymentAmount(parseFloat(event.target.value) || 0)
                  if (formError) setFormError(null)
                }}
                className="h-12 rounded-none border-none bg-muted text-xl font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
                placeholder="0"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground/50">
                {willComplete
                  ? "This will mark the balance as FULLY PAID."
                  : paymentAmount > 0
                    ? `After this, ${formatINR(Math.max(remaining - paymentAmount, 0))} will still be pending`
                    : "Enter a payment amount"}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Payment Mode</Label>
                <select
                  value={paymentMode}
                  onChange={(event) => {
                    setPaymentMode(event.target.value as PaymentMode)
                    if (formError) setFormError(null)
                  }}
                  className="h-12 rounded-none border border-input bg-muted px-3 text-[11px] font-bold tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {PAYMENT_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {requiresRecordedPaymentDetails && paymentMode !== "CASH" ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                    {getReferenceLabel(paymentMode)}
                  </Label>
                  <Input
                    value={referenceNumber}
                    onChange={(event) => {
                      setReferenceNumber(event.target.value)
                      if (formError) setFormError(null)
                    }}
                    placeholder={getReferencePlaceholder(paymentMode)}
                    className="h-12 rounded-none border-none bg-muted text-[11px] font-bold tracking-widest text-foreground focus-visible:bg-card focus-visible:ring-primary/20"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Reference Number</Label>
                  <div className="flex h-12 items-center rounded-none border border-dashed border-border bg-muted/40 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Cash payments do not require a reference number.
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Note</Label>
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note for accounting or receipt remarks"
                className="h-12 rounded-none border-none bg-muted text-[11px] font-bold tracking-widest text-foreground focus-visible:bg-card focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex items-center justify-end border-t border-border pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest opacity-40 transition-all hover:opacity-100"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isPending || paymentAmount <= 0}
                  className="h-12 gap-2 rounded-none bg-primary px-8 text-[11px] font-bold uppercase tracking-[0.2em] text-black shadow-lg hover:bg-primary/90"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Add Payment</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="flex w-full flex-col border-t border-border bg-muted/30 md:w-[28rem] md:border-l md:border-t-0">
          <div className="border-b border-border bg-background p-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground">Payment History</h4>
            <p className="mt-1 text-[9px] font-bold italic text-muted-foreground">Audit trail of recorded installments</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Loading Ledger...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">No previous payments</p>
              </div>
            ) : (
              history.map((payment) => (
                <div
                  key={payment.id}
                  className="group border border-border bg-background p-4 transition-all hover:border-primary/30"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "font-sans text-sm font-bold",
                        payment.direction === "OUT" ? "text-red-500" : "text-emerald-600",
                      )}
                    >
                      {payment.direction === "OUT" ? "-" : ""}
                      {formatINR(payment.amount)}
                    </span>
                    <span className="text-[8px] font-bold uppercase text-muted-foreground/40 transition-colors group-hover:text-primary/50">
                      #{payment.id.slice(-4)}
                    </span>
                  </div>

                  {payment.movementType && (
                    <div className="mb-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      {payment.movementType === "CUSTOMER_REFUND" ? "Refund" : "Payment"}
                    </div>
                  )}

                  <div className="mb-2 flex items-center gap-2 text-[9px] text-muted-foreground">
                    <Calendar className="h-3 w-3 shrink-0 opacity-40" />
                    <span className="font-bold tracking-tight">{formatDate(payment.createdAt)}</span>
                  </div>

                  <div className="mb-2 flex flex-wrap gap-2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <span className="border border-border px-2 py-1">
                      {payment.paymentMode ? payment.paymentMode.replace("_", " ") : "MODE NOT RECORDED"}
                    </span>
                    {payment.referenceNumber ? (
                      <span className="border border-border px-2 py-1">{payment.referenceNumber}</span>
                    ) : null}
                  </div>

                  {payment.note && (
                    <div className="flex items-start gap-2 bg-muted/50 p-1.5 text-[9px] text-foreground/70">
                      <FileText className="mt-0.5 h-3 w-3 shrink-0 opacity-40" />
                      <p className="italic leading-relaxed">{payment.note}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border bg-background/50 p-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Subtotal Paid</span>
            <span className="font-sans text-[11px] font-bold text-primary">{formatINR(currentlyPaid)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
