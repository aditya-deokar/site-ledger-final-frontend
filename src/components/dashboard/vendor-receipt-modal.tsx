"use client"

import { Button } from "@/components/ui/button"
import { Download, Printer, X } from "lucide-react"

function formatINR(n: number) {
  return "Rs. " + n.toLocaleString("en-IN")
}

function formatReceiptDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase()
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export type VendorPaymentReceipt = {
  id: string
  receiptNumber: string
  vendorName: string
  amount: number
  date: string
  note: string
  siteName: string
  expenseAmount: number
  expenseId: string
}

function buildVendorReceiptHtml(receipt: VendorPaymentReceipt) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Vendor Receipt ${escapeHtml(receipt.receiptNumber)}</title>
      <style>
        body {
          font-family: Georgia, "Times New Roman", serif;
          margin: 0;
          padding: 40px;
          background: #f8fafc;
          color: #0f172a;
        }
        .sheet {
          max-width: 820px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 8px;
          font-weight: 700;
        }
        h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 600;
        }
        .meta {
          text-align: right;
          font-size: 14px;
          line-height: 1.7;
        }
        .summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }
        .panel {
          border: 1px solid #e2e8f0;
          padding: 20px;
          background: #f8fafc;
        }
        .label {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .value {
          font-size: 20px;
          font-weight: 700;
        }
        .details {
          border: 1px solid #e2e8f0;
        }
        .row {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 20px;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        .row:last-child {
          border-bottom: none;
        }
        .row-label {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }
        .row-value {
          font-size: 15px;
        }
        .footnote {
          margin-top: 20px;
          font-size: 12px;
          color: #64748b;
        }
        @media print {
          body {
            background: #ffffff;
            padding: 0;
          }
          .sheet {
            border: none;
            max-width: none;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div>
            <div class="eyebrow">Vendor Receipt</div>
            <h1>Payment Receipt</h1>
          </div>
          <div class="meta">
            <div><strong>Receipt No:</strong> ${escapeHtml(receipt.receiptNumber)}</div>
            <div><strong>Date:</strong> ${escapeHtml(formatReceiptDate(receipt.date))}</div>
          </div>
        </div>

        <div class="summary">
          <div class="panel">
            <div class="label">Vendor</div>
            <div class="value">${escapeHtml(receipt.vendorName)}</div>
          </div>
          <div class="panel">
            <div class="label">Amount Paid</div>
            <div class="value">${escapeHtml(formatINR(receipt.amount))}</div>
          </div>
        </div>

        <div class="details">
          <div class="row">
            <div class="row-label">Site</div>
            <div class="row-value">${escapeHtml(receipt.siteName)}</div>
          </div>
          <div class="row">
            <div class="row-label">Ledger Payment Id</div>
            <div class="row-value">${escapeHtml(receipt.id)}</div>
          </div>
          <div class="row">
            <div class="row-label">Related Expense Id</div>
            <div class="row-value">${escapeHtml(receipt.expenseId)}</div>
          </div>
          <div class="row">
            <div class="row-label">Related Bill Amount</div>
            <div class="row-value">${escapeHtml(formatINR(receipt.expenseAmount))}</div>
          </div>
          <div class="row">
            <div class="row-label">Note</div>
            <div class="row-value">${escapeHtml(receipt.note)}</div>
          </div>
        </div>

        <p class="footnote">
          This receipt is a formatted view of the existing vendor payment ledger entry. No duplicate receipt record is stored.
        </p>
      </div>
    </body>
    </html>
  `
}

export function downloadVendorReceipt(receipt: VendorPaymentReceipt) {
  const html = buildVendorReceiptHtml(receipt)
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `Vendor-Receipt-${receipt.vendorName.replace(/\s+/g, "-")}-${receipt.receiptNumber}.html`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function printVendorReceipt(receipt: VendorPaymentReceipt) {
  const html = buildVendorReceiptHtml(receipt)
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720")

  if (!printWindow) return

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

export function VendorReceiptModal({
  receipt,
  onClose,
}: {
  receipt: VendorPaymentReceipt
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-8 py-6">
          <div>
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Vendor Receipt</p>
            <h3 className="mt-2 text-2xl font-serif text-foreground">Payment Receipt Preview</h3>
            <p className="mt-2 text-[11px] text-muted-foreground">
              This view is generated directly from the vendor payment ledger entry.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground/40 transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-8">
          <div className="border border-border bg-card">
            <div className="flex flex-col gap-6 border-b border-border px-6 py-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground/50">Vendor Receipt</p>
                <h4 className="mt-3 text-3xl font-serif tracking-tight text-foreground">Payment Receipt</h4>
              </div>
              <div className="space-y-1 text-left md:text-right">
                <p className="text-sm text-muted-foreground">
                  Receipt No: <span className="font-bold text-foreground">{receipt.receiptNumber}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Date: <span className="font-bold text-foreground">{formatReceiptDate(receipt.date)}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 border-b border-border px-6 py-6 md:grid-cols-2">
              <div className="border border-border bg-muted/20 p-5">
                <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Vendor</p>
                <p className="mt-3 text-2xl font-sans font-bold text-foreground">{receipt.vendorName}</p>
              </div>
              <div className="border border-border bg-muted/20 p-5">
                <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Amount Paid</p>
                <p className="mt-3 text-2xl font-sans font-bold text-emerald-600">{formatINR(receipt.amount)}</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              <div className="grid gap-2 px-6 py-4 md:grid-cols-[220px_1fr]">
                <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Site</span>
                <span className="text-sm text-foreground">{receipt.siteName}</span>
              </div>
              <div className="grid gap-2 px-6 py-4 md:grid-cols-[220px_1fr]">
                <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Ledger Payment Id</span>
                <span className="font-mono text-sm text-foreground">{receipt.id}</span>
              </div>
              <div className="grid gap-2 px-6 py-4 md:grid-cols-[220px_1fr]">
                <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Related Expense Id</span>
                <span className="font-mono text-sm text-foreground">{receipt.expenseId}</span>
              </div>
              <div className="grid gap-2 px-6 py-4 md:grid-cols-[220px_1fr]">
                <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Related Bill Amount</span>
                <span className="text-sm text-foreground">{formatINR(receipt.expenseAmount)}</span>
              </div>
              <div className="grid gap-2 px-6 py-4 md:grid-cols-[220px_1fr]">
                <span className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted-foreground/50">Note</span>
                <span className="text-sm text-foreground">{receipt.note}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            This receipt is derived from the existing vendor payment ledger row. No extra receipt record is stored.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadVendorReceipt(receipt)} className="h-10 rounded-none px-4 text-[10px] font-bold uppercase tracking-widest">
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
            <Button variant="outline" onClick={() => printVendorReceipt(receipt)} className="h-10 rounded-none px-4 text-[10px] font-bold uppercase tracking-widest">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
