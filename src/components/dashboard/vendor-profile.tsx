"use client"

import { useState } from "react"
import { useVendor, useVendorPayments, useVendorStatement, useVendorTransactions } from "@/hooks/api/vendor.hooks"
import { useUpdateExpensePayment } from "@/hooks/api/site.hooks"
import { RecordPaymentModal } from "@/components/dashboard/record-payment-modal"
import { cn } from "@/lib/utils"
import { X, Loader2 } from "lucide-react"
import { VendorBill, VendorPayment, VendorStatementEntry } from "@/schemas/vendor.schema"

function formatINR(n: number) { return "₹" + n.toLocaleString("en-IN") }
function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
}

type VendorTx = VendorBill

export function VendorProfile({ vendorId, vendorName, onClose }: { vendorId: string; vendorName?: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"summary" | "bills" | "payments" | "statement">("summary")
  const { data: vendorData, isLoading: loadingVendor } = useVendor(vendorId)
  const { data: txData, isLoading: loadingBills } = useVendorTransactions(vendorId)
  const { data: paymentsData, isLoading: loadingPayments } = useVendorPayments(vendorId)
  const { data: statementData, isLoading: loadingStatement } = useVendorStatement(vendorId)
  const [payTx, setPayTx] = useState<VendorTx | null>(null)

  const vendor = vendorData?.data?.vendor
  const bills: VendorTx[] = txData?.data?.transactions ?? []
  const payments: VendorPayment[] = paymentsData?.data?.payments ?? []
  const statement: VendorStatementEntry[] = statementData?.data?.statement ?? []
  const totalBilled = vendor?.totalBilled ?? txData?.data?.totalBilled ?? statementData?.data?.totalBilled ?? 0
  const totalPaid = vendor?.totalPaid ?? txData?.data?.totalPaid ?? paymentsData?.data?.totalPaid ?? statementData?.data?.totalPaid ?? 0
  const totalOutstanding = vendor?.totalOutstanding ?? txData?.data?.totalOutstanding ?? statementData?.data?.closingBalance ?? 0
  const billCount = vendor?.billCount ?? txData?.data?.billCount ?? bills.length

  const isLoading = loadingVendor || (activeTab === "bills" && loadingBills) || (activeTab === "payments" && loadingPayments) || (activeTab === "statement" && loadingStatement)
  const tabs = [
    { key: "summary" as const, label: "Summary" },
    { key: "bills" as const, label: "Bills" },
    { key: "payments" as const, label: "Payments" },
    { key: "statement" as const, label: "Statement" },
  ]

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-background border border-border max-w-5xl w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 shadow-2xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-border flex justify-between items-start shrink-0">
          <div>
            <h3 className="text-xl font-serif text-foreground">Vendor Ledger{vendorName ? `: ${vendorName}` : ''}</h3>
            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40 mt-1">
              Bills are expense documents. Payments are ledger postings against those bills.
            </p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground/40 hover:text-foreground" /></button>
        </div>

        {/* Summary row */}
        <div className="px-8 py-3 border-b border-border grid grid-cols-4 gap-4 shrink-0">
          <div>
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Total Billed</span>
            <p className="text-base font-sans font-bold text-foreground">{formatINR(totalBilled)}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Total Paid</span>
            <p className="text-base font-sans font-bold text-primary">{formatINR(totalPaid)}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Outstanding</span>
            <p className={cn("text-base font-sans font-bold", totalOutstanding > 0 ? "text-red-500" : "text-emerald-600")}>{formatINR(totalOutstanding)}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Bill Count</span>
            <p className="text-base font-sans font-bold text-foreground">{billCount}</p>
          </div>
        </div>

        <div className="px-8 py-3 border-b border-border flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 text-[10px] font-bold tracking-widest uppercase border transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : activeTab === "summary" ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Billed", value: formatINR(totalBilled), tone: "text-foreground" },
                { label: "Total Paid", value: formatINR(totalPaid), tone: "text-emerald-600" },
                { label: "Total Outstanding", value: formatINR(totalOutstanding), tone: totalOutstanding > 0 ? "text-red-500" : "text-emerald-600" },
                { label: "Bills", value: String(billCount), tone: "text-primary" },
              ].map((card) => (
                <div key={card.label} className="border border-border p-5 flex flex-col gap-2">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">{card.label}</span>
                  <span className={cn("text-2xl font-sans font-bold", card.tone)}>{card.value}</span>
                </div>
              ))}
            </div>
          ) : activeTab === "bills" ? (
            bills.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-8">No bills recorded for this vendor.</p>
            ) : (
              <div className="border border-border divide-y divide-border">
                <div className="grid grid-cols-8 gap-4 px-4 py-2 bg-muted/30">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Date</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Site</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Bill</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Paid</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Due</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Status</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Payment Date</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50 text-right">Action</span>
                </div>
                {bills.map((tx) => (
                  <div key={tx.id} className="grid grid-cols-8 gap-4 px-4 py-3 items-center">
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{formatDate(tx.billDate || tx.createdAt)}</span>
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground truncate">{tx.siteName || "—"}</span>
                    <div>
                      <span className="text-sm font-sans font-bold text-red-500">{formatINR(tx.amount)}</span>
                      <p className="text-[10px] text-muted-foreground truncate mt-1">{tx.description || tx.reason || "—"}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">{formatINR(tx.amountPaid)}</span>
                    <span className="text-[10px] font-bold text-red-500">{formatINR(tx.remaining)}</span>
                    <span className={cn(
                      "text-[8px] font-bold px-1.5 py-0.5 border w-fit",
                      tx.paymentStatus === "COMPLETED"
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : tx.paymentStatus === "PARTIAL"
                          ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                          : "bg-red-500/10 text-red-600 border-red-500/20"
                    )}>
                      {tx.paymentStatus}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(tx.paymentDate)}</span>
                    <div className="flex justify-end">
                      {tx.paymentStatus === "COMPLETED" ? (
                        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40">Settled</span>
                      ) : (
                        <button onClick={() => setPayTx(tx)} className="text-[9px] font-bold px-2 py-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors uppercase tracking-widest">Pay</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === "payments" ? (
            payments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-8">No payments recorded for this vendor.</p>
            ) : (
              <div className="border border-border divide-y divide-border">
                <div className="grid grid-cols-6 gap-4 px-4 py-2 bg-muted/30">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Date</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Site</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Bill</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Payment</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Reason</span>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Note</span>
                </div>
                {payments.map((payment) => (
                  <div key={payment.id} className="grid grid-cols-6 gap-4 px-4 py-3 items-center">
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{formatDate(payment.paymentDate || payment.createdAt)}</span>
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground truncate">{payment.siteName || "—"}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">{formatINR(payment.expenseAmount)}</span>
                    <span className="text-sm font-sans font-bold text-emerald-600">{formatINR(payment.amount)}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{payment.description || payment.reason || "—"}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{payment.note || "—"}</span>
                  </div>
                ))}
              </div>
            )
          ) : statement.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No statement entries found.</p>
          ) : (
            <div className="border border-border divide-y divide-border">
              <div className="grid grid-cols-7 gap-4 px-4 py-2 bg-muted/30">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Date</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Entry</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Site</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Bill</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Payment</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Balance</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/50">Narration</span>
              </div>
              {statement.map((entry) => (
                <div key={entry.referenceId} className="grid grid-cols-7 gap-4 px-4 py-3 items-center">
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{formatDate(entry.date)}</span>
                  <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 border w-fit uppercase tracking-widest",
                    entry.entryType === "BILL"
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  )}>
                    {entry.entryType}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground truncate">{entry.siteName || "—"}</span>
                  <span className="text-[10px] font-bold text-red-500">{entry.billAmount ? formatINR(entry.billAmount) : "—"}</span>
                  <span className="text-[10px] font-bold text-emerald-600">{entry.paymentAmount ? formatINR(entry.paymentAmount) : "—"}</span>
                  <span className="text-[10px] font-bold text-foreground">{formatINR(entry.balance)}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{entry.note || entry.description || entry.reason || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalOutstanding > 0 && (
          <div className="px-8 py-4 border-t border-border flex justify-between items-center shrink-0">
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40">Balance Due</span>
            <span className="text-lg font-serif text-red-500">{formatINR(totalOutstanding)}</span>
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
      onSubmit={(amount, note) => {
        updatePayment({ expenseId, data: { amount, note } })
      }}
    />
  )
}
