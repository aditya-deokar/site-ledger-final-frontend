"use client"

import { useState, useEffect } from "react"
import { X, Loader2, ArrowRight, History, Calendar, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import api from "@/lib/axios"
import { cn } from "@/lib/utils"

function formatINR(n: number) { return "₹" + n.toLocaleString("en-IN") }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) }

interface PaymentRecord {
  id: string
  amount: number
  paymentDate?: string
  note: string | null
  createdAt: string
}

interface RecordPaymentModalProps {
  title: string
  totalAmount: number
  currentlyPaid: number
  entityType: 'expense' | 'investor-transaction' | 'company-withdrawal' | 'customer-booking'
  entityId: string
  siteId?: string // Required for some API calls
  investorId?: string // Required for investor-transaction
  onSubmit: (deltaAmount: number, note: string) => void
  onClose: () => void
  isPending: boolean
}

interface PaymentHistoryResponse {
  ok: boolean
  data?: {
    payments?: PaymentRecord[]
  }
}

export function RecordPaymentModal({ 
  title, 
  totalAmount, 
  currentlyPaid, 
  entityType, 
  entityId, 
  siteId,
  investorId,
  onSubmit, 
  onClose, 
  isPending 
}: RecordPaymentModalProps) {
  const remaining = Math.max(totalAmount - currentlyPaid, 0)
  const [paymentAmount, setPaymentAmount] = useState(remaining)
  const [note, setNote] = useState("")
  const [history, setHistory] = useState<PaymentRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Fetch Payment History
  useEffect(() => {
    async function fetchHistory() {
      setLoadingHistory(true)
      try {
        let url = ""
        if (entityType === 'expense' && siteId) {
          url = `/sites/${siteId}/expenses/${entityId}/payments`
        } else if (entityType === 'investor-transaction' && investorId) {
          url = `/investors/${investorId}/transactions/${entityId}/payments`
        } else if (entityType === 'company-withdrawal') {
          url = `/company/withdrawals/${entityId}/payments`
        } else if (entityType === 'customer-booking') {
          url = `/customers/${entityId}/payments`
        }

        if (url) {
          const json = await api.get(url) as PaymentHistoryResponse
          if (json.ok && Array.isArray(json.data?.payments)) {
            setHistory(json.data.payments)
          } else {
            setHistory([])
          }
        } else {
          // No payment-history endpoint exists for this entity type yet.
          setHistory([])
        }
      } catch (err) {
        setHistory([])
        console.warn("Failed to fetch payment history", err)
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [entityType, entityId, siteId, investorId])

  const willComplete = currentlyPaid + paymentAmount >= totalAmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (paymentAmount <= 0) return
    onSubmit(paymentAmount, note)
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={cn(
        "relative flex h-[min(100dvh,92rem)] w-full flex-col overflow-hidden border border-border bg-background shadow-2xl transition-all duration-300 sm:max-h-[90vh] sm:rounded-none md:flex-row",
        showHistory ? "max-w-5xl" : "max-w-xl"
      )}>
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="px-8 pt-8 pb-4 border-b border-border flex justify-between items-start">
            <div>
              <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-primary mb-1">Additive Ledger</p>
              <h3 className="text-lg font-serif text-foreground">{title}</h3>
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground/40 hover:text-foreground" /></button>
          </div>

          {/* Summary */}
          <div className="px-8 py-4 border-b border-border grid grid-cols-3 gap-4 bg-muted/20">
            <div>
              <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Total</span>
              <p className="text-sm font-bold text-foreground">{formatINR(totalAmount)}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Already Paid</span>
              <p className="text-sm font-bold text-primary">{formatINR(currentlyPaid)}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Remaining</span>
              <p className={cn("text-sm font-bold", remaining <= 0 ? "text-green-500" : "text-red-500")}>
                {formatINR(remaining)}
              </p>
            </div>
          </div>

          <div className="px-8 py-4 border-b border-border bg-background">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Enter only the <strong className="text-foreground">new payment received now</strong>. The total value for this record is already loaded above, so you do not need to enter it again.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold">New Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={remaining + 1000000} // Allow slight overpayment if needed for rounding
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="h-12 bg-muted border-none rounded-none text-xl font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground"
                placeholder="0"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground/50">
                {willComplete
                  ? "This will mark the balance as FULLY PAID ✓"
                  : paymentAmount > 0
                    ? `After this, ${formatINR(remaining - paymentAmount)} will still be pending`
                    : "Enter a payment amount"
                }
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold">Note / Reference</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Chq #123, NEFT..."
                className="h-12 bg-muted border-none rounded-none text-[11px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20 text-foreground"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button 
                type="button" 
                onClick={() => setShowHistory(!showHistory)} 
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-all"
              >
                <History className="w-4 h-4" />
                {showHistory ? "Hide Ledger" : `View Ledger (${history.length})`}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-all px-4 py-2">
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isPending || paymentAmount <= 0}
                  className="h-12 px-8 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-primary/90 rounded-none gap-2 shadow-lg"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Add Payment</span><ArrowRight className="w-4 h-4" /></>}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Side Ledger (History) */}
        {showHistory && (
          <div className="w-full border-t border-border bg-muted/30 md:w-96 md:border-l md:border-t-0 flex flex-col">
            <div className="p-6 border-b border-border bg-background">
              <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-foreground">Payment History</h4>
              <p className="text-[9px] text-muted-foreground mt-1 font-bold italic">Audit trail of all previous installments</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                  <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Loading Ledger...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">No previous payments</p>
                </div>
              ) : (
                history.map((pay) => (
                  <div key={pay.id} className="p-4 bg-background border border-border group hover:border-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-emerald-600 font-sans">{formatINR(pay.amount)}</span>
                      <span className="text-[8px] font-bold text-muted-foreground/40 uppercase group-hover:text-primary/50 transition-colors">#{pay.id.slice(-4)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground mb-1.5">
                      <Calendar className="w-3 h-3 opacity-40 shrink-0" />
                      <span className="font-bold tracking-tight">{formatDate(pay.paymentDate ?? pay.createdAt)}</span>
                    </div>
                    {pay.note && (
                      <div className="flex items-start gap-2 text-[9px] text-foreground/70 bg-muted/50 p-1.5 rounded-sm">
                        <FileText className="w-3 h-3 opacity-40 shrink-0 mt-0.5" />
                        <p className="italic leading-relaxed">{pay.note}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-border bg-background/50 flex justify-between items-center">
              <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Subtotal Paid</span>
              <span className="text-[11px] font-bold text-primary font-sans">{formatINR(currentlyPaid)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
