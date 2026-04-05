"use client"

import { useMemo, useState } from "react"
import { useVendor, useVendorPayments, useVendorStatement, useVendorTransactions } from "@/hooks/api/vendor.hooks"
import { useUpdateExpensePayment } from "@/hooks/api/site.hooks"
import { RecordPaymentModal } from "@/components/dashboard/record-payment-modal"
import {
  downloadVendorReceipt,
  printVendorReceipt,
  VendorPaymentReceipt,
  VendorReceiptModal,
} from "@/components/dashboard/vendor-receipt-modal"
import { cn } from "@/lib/utils"
import { Download, Eye, Loader2, Printer, X } from "lucide-react"
import { VendorBill, VendorPayment, VendorStatementEntry } from "@/schemas/vendor.schema"

function formatINR(n: number) {
  return "Rs. " + n.toLocaleString("en-IN")
}

function formatDate(iso?: string | null) {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
}

function buildVendorReceiptNumber(paymentId: string, paymentDate: string) {
  const suffix = paymentId.slice(-6).toUpperCase()
  const datePart = paymentDate.slice(2, 10).replace(/-/g, "")
  return `VPR-${datePart}-${suffix}`
}

type VendorTx = VendorBill

export function VendorProfile({ vendorId, vendorName, onClose }: { vendorId: string; vendorName?: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"summary" | "bills" | "payments" | "receipts" | "statement">("summary")
  const { data: vendorData, isLoading: loadingVendor } = useVendor(vendorId)
  const { data: txData, isLoading: loadingBills } = useVendorTransactions(vendorId)
  const { data: paymentsData, isLoading: loadingPayments } = useVendorPayments(vendorId)
  const { data: statementData, isLoading: loadingStatement } = useVendorStatement(vendorId)
  const [payTx, setPayTx] = useState<VendorTx | null>(null)
  const [previewReceipt, setPreviewReceipt] = useState<VendorPaymentReceipt | null>(null)

  const vendor = vendorData?.data?.vendor
  const bills: VendorTx[] = txData?.data?.transactions ?? []
  const payments: VendorPayment[] = paymentsData?.data?.payments ?? []
  const statement: VendorStatementEntry[] = statementData?.data?.statement ?? []
  const receipts = useMemo<VendorPaymentReceipt[]>(
    () =>
      payments.map((payment) => {
        const receiptDate = payment.paymentDate || payment.createdAt
        return {
          id: payment.id,
          receiptNumber: buildVendorReceiptNumber(payment.id, receiptDate),
          vendorName: vendor?.name || vendorName || "Vendor",
          amount: payment.amount,
          date: receiptDate,
          note: payment.note || payment.description || payment.reason || "Vendor payment ledger entry",
          siteName: payment.siteName || "Company",
          expenseAmount: payment.expenseAmount,
          expenseId: payment.expenseId,
        }
      }),
    [payments, vendor?.name, vendorName],
  )
  const totalBilled = vendor?.totalBilled ?? txData?.data?.totalBilled ?? statementData?.data?.totalBilled ?? 0
  const totalPaid = vendor?.totalPaid ?? txData?.data?.totalPaid ?? paymentsData?.data?.totalPaid ?? statementData?.data?.totalPaid ?? 0
  const totalOutstanding = vendor?.totalOutstanding ?? txData?.data?.totalOutstanding ?? statementData?.data?.closingBalance ?? 0
  const billCount = vendor?.billCount ?? txData?.data?.billCount ?? bills.length

  const isLoading =
    loadingVendor ||
    (activeTab === "bills" && loadingBills) ||
    ((activeTab === "payments" || activeTab === "receipts") && loadingPayments) ||
    (activeTab === "statement" && loadingStatement)

  const tabs = [
    { key: "summary" as const, label: "Summary" },
    { key: "bills" as const, label: "Bills" },
    { key: "payments" as const, label: "Payments" },
    { key: "receipts" as const, label: "Receipts" },
    { key: "statement" as const, label: "Statement" },
  ]

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative flex max-h-[85vh] w-full max-w-5xl flex-col border border-border bg-background shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between border-b border-border px-8 pb-4 pt-8 shrink-0">
            <div>
              <h3 className="text-xl font-serif text-foreground">Vendor Ledger{vendorName ? `: ${vendorName}` : ""}</h3>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Bills are expense documents. Payments are ledger postings against those bills.
              </p>
            </div>
            <button onClick={onClose}>
              <X className="h-5 w-5 text-muted-foreground/40 hover:text-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 border-b border-border px-8 py-3 shrink-0">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Total Billed</span>
              <p className="text-base font-sans font-bold text-foreground">{formatINR(totalBilled)}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Total Paid</span>
              <p className="text-base font-sans font-bold text-primary">{formatINR(totalPaid)}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Outstanding</span>
              <p className={cn("text-base font-sans font-bold", totalOutstanding > 0 ? "text-red-500" : "text-emerald-600")}>
                {formatINR(totalOutstanding)}
              </p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Bill Count</span>
              <p className="text-base font-sans font-bold text-foreground">{billCount}</p>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-border px-8 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "whitespace-nowrap border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors",
                  activeTab === tab.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : activeTab === "summary" ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: "Total Billed", value: formatINR(totalBilled), tone: "text-foreground" },
                  { label: "Total Paid", value: formatINR(totalPaid), tone: "text-emerald-600" },
                  {
                    label: "Total Outstanding",
                    value: formatINR(totalOutstanding),
                    tone: totalOutstanding > 0 ? "text-red-500" : "text-emerald-600",
                  },
                  { label: "Bills", value: String(billCount), tone: "text-primary" },
                ].map((card) => (
                  <div key={card.label} className="flex flex-col gap-2 border border-border p-5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">{card.label}</span>
                    <span className={cn("text-2xl font-sans font-bold", card.tone)}>{card.value}</span>
                  </div>
                ))}
              </div>
            ) : activeTab === "bills" ? (
              bills.length === 0 ? (
                <p className="py-8 text-center text-sm italic text-muted-foreground">No bills recorded for this vendor.</p>
              ) : (
                <div className="divide-y divide-border border border-border">
                  <div className="grid grid-cols-8 gap-4 bg-muted/30 px-4 py-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Date</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Site</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Bill</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Paid</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Due</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Payment Date</span>
                    <span className="text-right text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Action</span>
                  </div>
                  {bills.map((tx) => (
                    <div key={tx.id} className="grid grid-cols-8 items-center gap-4 px-4 py-3">
                      <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{formatDate(tx.billDate || tx.createdAt)}</span>
                      <span className="truncate text-[10px] font-bold tracking-widest text-muted-foreground">{tx.siteName || "-"}</span>
                      <div>
                        <span className="text-sm font-sans font-bold text-red-500">{formatINR(tx.amount)}</span>
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">{tx.description || tx.reason || "-"}</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600">{formatINR(tx.amountPaid)}</span>
                      <span className="text-[10px] font-bold text-red-500">{formatINR(tx.remaining)}</span>
                      <span
                        className={cn(
                          "w-fit border px-1.5 py-0.5 text-[8px] font-bold",
                          tx.paymentStatus === "COMPLETED"
                            ? "border-green-500/20 bg-green-500/10 text-green-600"
                            : tx.paymentStatus === "PARTIAL"
                              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-600"
                              : "border-red-500/20 bg-red-500/10 text-red-600",
                        )}
                      >
                        {tx.paymentStatus}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(tx.paymentDate)}</span>
                      <div className="flex justify-end">
                        {tx.paymentStatus === "COMPLETED" ? (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Settled</span>
                        ) : (
                          <button
                            onClick={() => setPayTx(tx)}
                            className="border border-primary/20 bg-primary/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === "payments" ? (
              payments.length === 0 ? (
                <p className="py-8 text-center text-sm italic text-muted-foreground">No payments recorded for this vendor.</p>
              ) : (
                <div className="divide-y divide-border border border-border">
                  <div className="grid grid-cols-6 gap-4 bg-muted/30 px-4 py-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Date</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Site</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Bill</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Payment</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Reason</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Note</span>
                  </div>
                  {payments.map((payment) => (
                    <div key={payment.id} className="grid grid-cols-6 items-center gap-4 px-4 py-3">
                      <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{formatDate(payment.paymentDate || payment.createdAt)}</span>
                      <span className="truncate text-[10px] font-bold tracking-widest text-muted-foreground">{payment.siteName || "-"}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{formatINR(payment.expenseAmount)}</span>
                      <span className="text-sm font-sans font-bold text-emerald-600">{formatINR(payment.amount)}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{payment.description || payment.reason || "-"}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{payment.note || "-"}</span>
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === "receipts" ? (
              receipts.length === 0 ? (
                <p className="py-8 text-center text-sm italic text-muted-foreground">No receipts available yet because no vendor payments have been posted.</p>
              ) : (
                <div className="divide-y divide-border border border-border">
                  <div className="grid grid-cols-7 gap-4 bg-muted/30 px-4 py-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Receipt</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Date</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Vendor</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Site</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Amount</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Note</span>
                    <span className="text-right text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Actions</span>
                  </div>
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="grid grid-cols-7 items-center gap-4 px-4 py-3">
                      <div>
                        <span className="text-[10px] font-bold tracking-widest text-foreground">{receipt.receiptNumber}</span>
                        <p className="mt-1 text-[10px] text-muted-foreground/60">Derived from payment {receipt.id.slice(-8).toUpperCase()}</p>
                      </div>
                      <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{formatDate(receipt.date)}</span>
                      <span className="truncate text-[10px] font-bold tracking-widest text-muted-foreground">{receipt.vendorName}</span>
                      <span className="truncate text-[10px] font-bold tracking-widest text-muted-foreground">{receipt.siteName}</span>
                      <span className="text-sm font-sans font-bold text-emerald-600">{formatINR(receipt.amount)}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{receipt.note}</span>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setPreviewReceipt(receipt)}
                          className="inline-flex h-8 items-center gap-1 border border-border px-2 text-[9px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                        <button
                          onClick={() => downloadVendorReceipt(receipt)}
                          className="inline-flex h-8 items-center gap-1 border border-border px-2 text-[9px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
                        >
                          <Download className="h-3 w-3" /> Download
                        </button>
                        <button
                          onClick={() => printVendorReceipt(receipt)}
                          className="inline-flex h-8 items-center gap-1 border border-border px-2 text-[9px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
                        >
                          <Printer className="h-3 w-3" /> Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : statement.length === 0 ? (
              <p className="py-8 text-center text-sm italic text-muted-foreground">No statement entries found.</p>
            ) : (
              <div className="divide-y divide-border border border-border">
                <div className="grid grid-cols-7 gap-4 bg-muted/30 px-4 py-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Date</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Entry</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Site</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Bill</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Payment</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Balance</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Narration</span>
                </div>
                {statement.map((entry) => (
                  <div key={entry.referenceId} className="grid grid-cols-7 items-center gap-4 px-4 py-3">
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{formatDate(entry.date)}</span>
                    <span
                      className={cn(
                        "w-fit border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest",
                        entry.entryType === "BILL"
                          ? "border-red-500/20 bg-red-500/10 text-red-500"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
                      )}
                    >
                      {entry.entryType}
                    </span>
                    <span className="truncate text-[10px] font-bold tracking-widest text-muted-foreground">{entry.siteName || "-"}</span>
                    <span className="text-[10px] font-bold text-red-500">{entry.billAmount ? formatINR(entry.billAmount) : "-"}</span>
                    <span className="text-[10px] font-bold text-emerald-600">{entry.paymentAmount ? formatINR(entry.paymentAmount) : "-"}</span>
                    <span className="text-[10px] font-bold text-foreground">{formatINR(entry.balance)}</span>
                    <span className="truncate text-[10px] text-muted-foreground">{entry.note || entry.description || entry.reason || "-"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {totalOutstanding > 0 && (
            <div className="flex items-center justify-between border-t border-border px-8 py-4 shrink-0">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Balance Due</span>
              <span className="text-lg font-serif text-red-500">{formatINR(totalOutstanding)}</span>
            </div>
          )}
        </div>
      </div>

      {payTx && (
        <PaymentBridge
          siteId={payTx.siteId}
          expenseId={payTx.id}
          title={payTx.description || payTx.reason || vendorName || "Vendor Payment"}
          totalAmount={payTx.amount}
          currentlyPaid={payTx.amountPaid}
          onClose={() => setPayTx(null)}
        />
      )}

      {previewReceipt && <VendorReceiptModal receipt={previewReceipt} onClose={() => setPreviewReceipt(null)} />}
    </>
  )
}

function PaymentBridge({ siteId, expenseId, title, totalAmount, currentlyPaid, onClose }: {
  siteId: string
  expenseId: string
  title: string
  totalAmount: number
  currentlyPaid: number
  onClose: () => void
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
