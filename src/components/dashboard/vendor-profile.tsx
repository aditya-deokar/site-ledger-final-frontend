"use client"

import { useState } from "react"
import { useVendorTransactions } from "@/hooks/api/vendor.hooks"
import { useUpdateExpensePayment } from "@/hooks/api/site.hooks"
import { RecordPaymentModal } from "@/components/dashboard/record-payment-modal"
import { cn } from "@/lib/utils"
import { X, Loader2 } from "lucide-react"

function formatINR(n: number) { return "₹" + n.toLocaleString("en-IN") }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
}

type VendorTx = {
  id: string
  siteId: string
  amount: number
  amountPaid: number
  paymentStatus: string
  paymentDate: string | null
  description: string | null
  reason: string | null
  siteName: string | null
  createdAt: string
}

export function VendorProfile({ vendorId, vendorName, onClose }: { vendorId: string; vendorName?: string; onClose: () => void }) {
  const { data: txData, isLoading } = useVendorTransactions(vendorId)
  const [payTx, setPayTx] = useState<VendorTx | null>(null)

  const transactions: VendorTx[] = txData?.data?.transactions ?? []
  const totalBilled = txData?.data?.totalBilled ?? 0
  const totalPaid = txData?.data?.totalPaid ?? 0

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-background border border-border max-w-2xl w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200 shadow-2xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-border flex justify-between items-start shrink-0">
          <h3 className="text-xl font-serif text-foreground">Transaction History{vendorName ? `: ${vendorName}` : ''}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground/40 hover:text-foreground" /></button>
        </div>

        {/* Summary row */}
        <div className="px-8 py-3 border-b border-border grid grid-cols-3 gap-4 shrink-0">
          <div>
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Total Billed</span>
            <p className="text-base font-sans font-bold text-foreground">{formatINR(totalBilled)}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Total Paid</span>
            <p className="text-base font-sans font-bold text-primary">{formatINR(totalPaid)}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Remaining</span>
            <p className={cn("text-base font-sans font-bold", totalBilled - totalPaid > 0 ? "text-red-500" : "text-emerald-600")}>{formatINR(totalBilled - totalPaid)}</p>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto px-8 py-4 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No transactions yet.</p>
          ) : (
            <div className="border border-border divide-y divide-border">
              {/* Table Header */}
              <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-muted/30">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Date</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Site</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Amount</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Status</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Description</span>
              </div>
              {/* Rows */}
              {transactions.map((tx) => (
                <div key={tx.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center">
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{formatDate(tx.createdAt)}</span>
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground truncate">{tx.siteName || "—"}</span>
                  <span className="text-sm font-sans font-bold text-red-500">{formatINR(tx.amount)}</span>
                  <div>
                    {tx.paymentStatus === 'COMPLETED' ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-green-500/10 text-green-600 border border-green-500/20">PAID</span>
                    ) : tx.paymentStatus === 'PARTIAL' ? (
                      <button onClick={() => setPayTx(tx)} className="text-[8px] font-bold px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer">PARTIAL ({formatINR(tx.amountPaid)}) — Pay</button>
                    ) : (
                      <button onClick={() => setPayTx(tx)} className="text-[8px] font-bold px-1.5 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer">PENDING — Pay</button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">{tx.description || tx.reason || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {totalBilled - totalPaid > 0 && (
          <div className="px-8 py-4 border-t border-border flex justify-between items-center shrink-0">
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Balance Due</span>
            <span className="text-lg font-serif text-red-500">{formatINR(totalBilled - totalPaid)}</span>
          </div>
        )}
      </div>
    </div>

    {payTx && (
      <PaymentBridge
        siteId={payTx.siteId}
        expenseId={payTx.id}
        title={payTx.description || payTx.reason || vendorName || 'Vendor Payment'}
        totalAmount={payTx.amount}
        currentlyPaid={payTx.amountPaid}
        onClose={() => setPayTx(null)}
      />
    )}
    </>
  )
}

// Bridge component to use the hook with the right siteId
function PaymentBridge({ siteId, expenseId, title, totalAmount, currentlyPaid, onClose }: {
  siteId: string; expenseId: string; title: string; totalAmount: number; currentlyPaid: number; onClose: () => void
}) {
  const { mutate: updatePayment, isPending } = useUpdateExpensePayment(siteId, { onSuccess: onClose })

  return (
    <RecordPaymentModal
      title={title}
      totalAmount={totalAmount}
      currentlyPaid={currentlyPaid}
      entityType="expense"
      entityId={expenseId}
      siteId={siteId}
      isPending={isPending}
      onClose={onClose}
      onSubmit={(amount, paymentDate, note) => {
        updatePayment({ expenseId, data: { amount, paymentDate, note } })
      }}
    />
  )
}
