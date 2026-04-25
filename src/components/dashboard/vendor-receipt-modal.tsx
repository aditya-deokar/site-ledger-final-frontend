"use client"

import { Button } from "@/components/ui/button"
import { exportElementToPdf } from "@/lib/pdf-export"
import { Download, Printer, X } from "lucide-react"
import { toast } from "sonner"

function formatINR(n: number) {
  return "\u20B9" + n.toLocaleString("en-IN")
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

function sanitizeFilePart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "receipt"
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

/** Markup for print preview & optional HTML download — structured like a professional voucher */
function buildVendorReceiptInnerHtml(r: VendorPaymentReceipt) {
  return `
  <div style="height:4px;background:#0d9488;width:100%"></div>
  <div style="padding:28px 32px 20px;border-bottom:1px solid #e2e8f0;background:#f8fafc">
    <div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:flex-start">
      <div style="min-width:200px;flex:1">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0f766e">Vendor payment</div>
        <h1 style="margin:8px 0 0;font-size:28px;font-weight:600;letter-spacing:-0.02em;color:#0f172a;font-family:Georgia,serif">Payment voucher</h1>
      </div>
      <div style="border:1px solid #e2e8f0;background:#fff;padding:12px 16px;min-width:200px">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Receipt no.</div>
        <div style="margin-top:4px;font-family:ui-monospace,monospace;font-size:15px;font-weight:600;color:#0f172a">${escapeHtml(r.receiptNumber)}</div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b">Date</div>
        <div style="margin-top:2px;font-size:14px;font-weight:500;color:#0f172a">${escapeHtml(formatReceiptDate(r.date))}</div>
      </div>
    </div>
  </div>
  <div style="padding:24px 32px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div style="border:1px solid #99f6e4;background:linear-gradient(135deg,#f0fdfa 0%,#fff 100%);padding:20px">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#0f766e">Amount paid</div>
        <div style="margin-top:8px;font-size:32px;font-weight:700;letter-spacing:-0.02em;color:#0d9488">${escapeHtml(formatINR(r.amount))}</div>
      </div>
      <div style="border:1px solid #e2e8f0;padding:20px">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Payee</div>
        <div style="margin-top:8px;font-size:20px;font-weight:600;color:#0f172a">${escapeHtml(r.vendorName)}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;font-size:14px">
      <tbody>
        <tr style="border-bottom:1px solid #e2e8f0;background:#f8fafc">
          <td style="padding:10px 14px;width:38%;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b">Site / project</td>
          <td style="padding:10px 14px;color:#0f172a">${escapeHtml(r.siteName)}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b">Ledger payment id</td>
          <td style="padding:10px 14px;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all">${escapeHtml(r.id)}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b">Linked expense</td>
          <td style="padding:10px 14px;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all">${escapeHtml(r.expenseId)}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b">Bill / expense amount</td>
          <td style="padding:10px 14px;font-weight:600;color:#0f172a">${escapeHtml(formatINR(r.expenseAmount))}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;vertical-align:top;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b">Narration</td>
          <td style="padding:10px 14px;color:#334155;line-height:1.5">${escapeHtml(r.note)}</td>
        </tr>
      </tbody>
    </table>
    <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;line-height:1.5">This document is generated from your payment ledger. It is not a separate stored receipt record.</p>
  </div>
  <div style="display:flex;justify-content:space-between;gap:24px;padding:24px 32px 32px;border-top:1px solid #e2e8f0">
    <div style="flex:1;border-top:1px solid #cbd5e1;padding-top:8px;font-size:11px;text-align:left;color:#64748b">Receiver / vendor</div>
    <div style="flex:1;border-top:1px solid #cbd5e1;padding-top:8px;font-size:11px;text-align:right;color:#64748b">For company (authorised signatory)</div>
  </div>
  `
}

function buildVendorReceiptRootElement(receipt: VendorPaymentReceipt): HTMLDivElement {
  const root = document.createElement("div")
  root.setAttribute("class", "vendor-receipt-pdf")
  root.style.width = "760px"
  root.style.maxWidth = "100%"
  root.style.background = "#ffffff"
  root.style.color = "#0f172a"
  root.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", sans-serif'
  root.style.boxSizing = "border-box"
  root.style.border = "1px solid #e2e8f0"
  root.innerHTML = buildVendorReceiptInnerHtml(receipt)
  return root
}

export async function downloadVendorReceipt(receipt: VendorPaymentReceipt) {
  const el = buildVendorReceiptRootElement(receipt)
  el.style.position = "fixed"
  el.style.left = "-30000px"
  el.style.top = "0"
  el.style.zIndex = "-1"
  document.body.appendChild(el)
  
  // Wait for element to be rendered
  await new Promise(resolve => setTimeout(resolve, 50))
  
  try {
    const fileName = `Vendor-Receipt-${sanitizeFilePart(receipt.vendorName)}-${sanitizeFilePart(receipt.receiptNumber)}.pdf`
    await exportElementToPdf(el, fileName)
    toast.success("PDF downloaded")
  } catch (e) {
    console.error("Vendor receipt PDF error:", e)
    const errorMessage = e instanceof Error ? e.message : "Unknown error"
    
    if (errorMessage.includes("libraries")) {
      toast.error("Failed to load PDF libraries. Please refresh and try again.")
    } else {
      toast.error("Could not create PDF. Use Print and save as PDF, or try again.")
    }
  } finally {
    document.body.removeChild(el)
  }
}

function buildLegacyVendorReceiptHtmlFile(receipt: VendorPaymentReceipt) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vendor Receipt ${escapeHtml(receipt.receiptNumber)}</title>
  <style>body { margin:0; padding:32px; background:#f1f5f9; } .wrap { max-width:760px; margin:0 auto; }</style>
</head>
<body>
  <div class="wrap vendor-receipt-html-export">${buildVendorReceiptInnerHtml(receipt)}</div>
</body>
</html>`
}

export function downloadVendorReceiptHtmlFile(receipt: VendorPaymentReceipt) {
  const html = buildLegacyVendorReceiptHtmlFile(receipt)
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `Vendor-Receipt-${sanitizeFilePart(receipt.vendorName)}-${sanitizeFilePart(receipt.receiptNumber)}.html`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  toast.message("HTML file saved. Prefer “Download PDF” for a print-ready file.")
}

export function printVendorReceipt(receipt: VendorPaymentReceipt) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Vendor ${escapeHtml(receipt.receiptNumber)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body onload="setTimeout(function(){ window.focus(); window.print(); }, 200)">
  <div style="max-width:800px;margin:0 auto">${buildVendorReceiptInnerHtml(receipt)}</div>
</body>
</html>`
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720")
  if (!printWindow) {
    toast.error("Pop-up was blocked. Allow pop-ups to print this receipt.")
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
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
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Vendor payment</p>
            <h3 className="mt-2 text-2xl font-serif text-foreground">Payment voucher</h3>
            <p className="mt-2 text-[11px] text-muted-foreground">Review and download a PDF, or open print to save as PDF.</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground/40 transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 sm:p-8">
          <div className="border border-border bg-card shadow-sm">
            <div
              className="vendor-receipt-preview text-slate-900"
              dangerouslySetInnerHTML={{ __html: buildVendorReceiptInnerHtml(receipt) }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">Download PDF for sharing; use Print to save as PDF from the browser if needed.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void downloadVendorReceipt(receipt)}
              className="h-10 gap-1.5 rounded-none text-[10px] font-bold uppercase tracking-widest"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadVendorReceiptHtmlFile(receipt)}
              className="h-10 rounded-none text-[10px] font-bold uppercase tracking-widest"
            >
              Download HTML
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => printVendorReceipt(receipt)}
              className="h-10 gap-1.5 rounded-none text-[10px] font-bold uppercase tracking-widest"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
