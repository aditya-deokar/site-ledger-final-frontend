"use client"

import type { ReactNode, RefObject } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Download, FileText, ReceiptText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCustomerAgreement } from "@/hooks/api/customer.hooks"
import {
  type Customer,
  type CustomerAgreementLine,
  type CustomerAgreementLineType,
  type CustomerPaymentHistoryItem,
} from "@/schemas/customer.schema"
import { cn } from "@/lib/utils"

type WorkspaceMode = "receipt" | "statement"

type StatementRow = {
  payment: CustomerPaymentHistoryItem
  cumulativePaid: number
  balance: number
}

type RecordedAgreementRow = Pick<CustomerAgreementLine, "type" | "label" | "signedAmount" | "affectsProfit">

type PrintDetails = {
  customerName: string
  customerPhone: string
  customerAddress: string
  customerPan: string
  projectName: string
  siteAddress: string
  flatNumber: string
  floorNumber: string
  carpetArea: string
  ratePerSqft: string
}

interface ReceiptEditorProps {
  customer: Customer & { siteName?: string | null }
  siteAddress?: string
  payments: CustomerPaymentHistoryItem[]
  onClose: () => void
}

function formatINR(value: number) {
  return "\u20B9" + value.toLocaleString("en-IN")
}

function formatSignedINR(value: number) {
  if (value < 0) return `- ${formatINR(Math.abs(value))}`
  return formatINR(value)
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "-"

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "-"

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getPaymentModeLabel(mode?: string | null) {
  switch (mode) {
    case "CASH":
      return "Cash"
    case "CHEQUE":
      return "Cheque"
    case "BANK_TRANSFER":
      return "Bank Transfer"
    case "UPI":
      return "UPI"
    default:
      return "Not recorded"
  }
}

function getAgreementTypeLabel(type: CustomerAgreementLineType) {
  switch (type) {
    case "BASE_PRICE":
      return "Base Price"
    case "CHARGE":
      return "Charge"
    case "TAX":
      return "Tax / GST"
    case "DISCOUNT":
      return "Discount"
    case "CREDIT":
      return "Credit"
    default:
      return type
  }
}

function buildReceiptNumber(paymentId: string, postedAt: string) {
  const dateToken = postedAt.slice(2, 10).replace(/-/g, "")
  const paymentToken = paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()
  return `RCP-${dateToken}-${paymentToken}`
}

function sanitizeFilename(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "document"
}

function convertToIndianWords(num: number): string {
  if (num === 0) return "Zero Rupees Only"

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  const convertLessThanOneThousand = (value: number): string => {
    if (value === 0) return ""
    if (value < 10) return ones[value]
    if (value < 20) return teens[value - 10]
    if (value < 100) return tens[Math.floor(value / 10)] + (value % 10 ? ` ${ones[value % 10]}` : "")
    return ones[Math.floor(value / 100)] + " Hundred" + (value % 100 ? ` ${convertLessThanOneThousand(value % 100)}` : "")
  }

  const convert = (value: number): string => {
    if (value === 0) return ""
    if (value < 1000) return convertLessThanOneThousand(value)
    if (value < 100000) return convertLessThanOneThousand(Math.floor(value / 1000)) + " Thousand" + (value % 1000 ? ` ${convertLessThanOneThousand(value % 1000)}` : "")
    if (value < 10000000) return convertLessThanOneThousand(Math.floor(value / 100000)) + " Lakh" + (value % 100000 ? ` ${convert(value % 100000)}` : "")
    return convertLessThanOneThousand(Math.floor(value / 10000000)) + " Crore" + (value % 10000000 ? ` ${convert(value % 10000000)}` : "")
  }

  const wholePart = Math.floor(num)
  const decimalPart = Math.round((num - wholePart) * 100)

  let result = `${convert(wholePart)} Rupees`
  if (decimalPart > 0) {
    result += ` and ${convertLessThanOneThousand(decimalPart)} Paise`
  }

  return `${result} Only`
}

function comparePayments(a: CustomerPaymentHistoryItem, b: CustomerPaymentHistoryItem) {
  const aTime = new Date(a.createdAt).getTime()
  const bTime = new Date(b.createdAt).getTime()

  if (aTime !== bTime) return aTime - bTime
  return a.id.localeCompare(b.id)
}

function buildStatementRows(payments: CustomerPaymentHistoryItem[], agreementValue: number): StatementRow[] {
  let cumulativePaid = 0

  return [...payments].sort(comparePayments).map((payment) => {
    cumulativePaid += payment.amount

    return {
      payment,
      cumulativePaid,
      balance: Math.max(agreementValue - cumulativePaid, 0),
    }
  })
}

function convertLabColorToRgb(element: HTMLElement) {
  const computedStyle = window.getComputedStyle(element)
  const colorProperties = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']
  
  colorProperties.forEach(prop => {
    const value = computedStyle.getPropertyValue(prop)
    if (value && value.includes('lab(')) {
      // Get the computed RGB value by creating a temporary element
      const tempDiv = document.createElement('div')
      tempDiv.style.color = value
      document.body.appendChild(tempDiv)
      const rgbValue = window.getComputedStyle(tempDiv).color
      document.body.removeChild(tempDiv)
      element.style.setProperty(prop, rgbValue, 'important')
    }
  })
}

function cloneAndFixColors(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement
  
  // Fix colors on the clone and all its children
  const allElements = [clone, ...Array.from(clone.querySelectorAll('*'))] as HTMLElement[]
  allElements.forEach(el => {
    const computedStyle = window.getComputedStyle(el)
    
    // Convert computed colors to inline styles to avoid lab() parsing
    const colorProps = ['color', 'backgroundColor', 'borderColor']
    colorProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop)
      if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
        el.style.setProperty(prop, value, 'important')
      }
    })
  })
  
  return clone
}

async function exportElementToPdf(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])

  // Clone the element and fix color issues
  const clonedElement = cloneAndFixColors(element)
  
  // Temporarily add to DOM for rendering
  clonedElement.style.position = 'absolute'
  clonedElement.style.left = '-9999px'
  clonedElement.style.top = '0'
  document.body.appendChild(clonedElement)

  try {
    const canvas = await html2canvas(clonedElement, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: clonedElement.scrollWidth,
      windowHeight: clonedElement.scrollHeight,
    })

    const imageData = canvas.toDataURL("image/png")
    const pdf = new jsPDF("p", "mm", "a4")
    const margin = 8
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const contentWidth = pageWidth - margin * 2
    const contentHeight = (canvas.height * contentWidth) / canvas.width
    const printableHeight = pageHeight - margin * 2

    let remainingHeight = contentHeight
    let offsetY = margin

    pdf.addImage(imageData, "PNG", margin, offsetY, contentWidth, contentHeight, undefined, "FAST")
    remainingHeight -= printableHeight

    while (remainingHeight > 0) {
      pdf.addPage()
      offsetY = margin - (contentHeight - remainingHeight)
      pdf.addImage(imageData, "PNG", margin, offsetY, contentWidth, contentHeight, undefined, "FAST")
      remainingHeight -= printableHeight
    }

    pdf.save(filename)
  } finally {
    // Clean up the cloned element
    document.body.removeChild(clonedElement)
  }
}

function PreviewField({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-slate-200 py-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <span className={cn("text-right text-sm leading-6", muted ? "text-slate-500" : "font-medium text-slate-900")}>
        {value || "-"}
      </span>
    </div>
  )
}

function PreviewSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[2px] border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function DocumentShell({
  children,
  previewRef,
}: {
  children: ReactNode
  previewRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="mx-auto min-w-[820px] max-w-[920px] px-4">
      <div
        ref={previewRef}
        className="mx-auto w-full max-w-[860px] bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
      >
        {children}
      </div>
    </div>
  )
}

function ReceiptPreview({
  previewRef,
  printDetails,
  selectedPayment,
  selectedStatementRow,
  agreementValue,
  receiptNumber,
  paymentAmountWords,
  recordedAgreementRows,
}: {
  previewRef: RefObject<HTMLDivElement | null>
  printDetails: PrintDetails
  selectedPayment: CustomerPaymentHistoryItem
  selectedStatementRow: StatementRow
  agreementValue: number
  receiptNumber: string
  paymentAmountWords: string
  recordedAgreementRows: RecordedAgreementRow[]
}) {
  const receiptDate = formatShortDate(selectedPayment.createdAt)
  const paymentMode = getPaymentModeLabel(selectedPayment.paymentMode)

  return (
    <DocumentShell previewRef={previewRef}>
      <div className="border-b border-slate-900 px-10 py-10">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">Builder Collection Receipt</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">Payment Receipt</h1>
            <p className="mt-4 text-lg font-medium text-slate-900">{printDetails.projectName || "Project Name"}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{printDetails.siteAddress || "Add the site address in the details panel."}</p>
          </div>

          <div className="w-full max-w-[300px] border border-slate-200 bg-slate-50 px-5 py-4">
            <PreviewField label="Receipt No" value={receiptNumber} />
            <PreviewField label="Receipt Date" value={receiptDate} />
            <PreviewField label="Posted At" value={formatDateTime(selectedPayment.createdAt)} />
            <PreviewField label="Mode" value={paymentMode} muted={paymentMode === "Not recorded"} />
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 px-10 py-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_300px]">
          <div className="border border-emerald-200 bg-emerald-50 px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">Received Amount</p>
            <p className="mt-4 text-5xl font-semibold tracking-tight text-emerald-700">{formatINR(selectedPayment.amount)}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">{paymentAmountWords}</p>
          </div>

          <div className="border border-slate-200 px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Received From</p>
            <p className="mt-4 text-2xl font-semibold text-slate-950">{printDetails.customerName || "Customer Name"}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>{printDetails.customerPhone || "Phone number not added"}</p>
              <p>{printDetails.flatNumber || "Flat / Unit pending"}</p>
              <p>{printDetails.floorNumber || "Floor pending"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-10 py-8 md:grid-cols-2">
        <PreviewSection title="Customer Details">
          <PreviewField label="Customer" value={printDetails.customerName} />
          <PreviewField label="Phone" value={printDetails.customerPhone} muted={!printDetails.customerPhone} />
          <PreviewField label="Address" value={printDetails.customerAddress} muted={!printDetails.customerAddress} />
          <PreviewField label="PAN Number" value={printDetails.customerPan} muted={!printDetails.customerPan} />
        </PreviewSection>

        <PreviewSection title="Property Details">
          <PreviewField label="Project" value={printDetails.projectName} />
          <PreviewField label="Site Address" value={printDetails.siteAddress} muted={!printDetails.siteAddress} />
          <PreviewField label="Flat / Unit" value={printDetails.flatNumber} muted={!printDetails.flatNumber} />
          <PreviewField label="Floor" value={printDetails.floorNumber} muted={!printDetails.floorNumber} />
          <PreviewField label="Carpet Area" value={printDetails.carpetArea} muted={!printDetails.carpetArea} />
          <PreviewField label="Rate / Sq Ft" value={printDetails.ratePerSqft} muted={!printDetails.ratePerSqft} />
        </PreviewSection>
      </div>

      <div className="border-t border-slate-200 px-10 py-8">
        <PreviewSection title="Payment Details">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Reference</p>
              <p className="mt-3 text-base font-semibold text-slate-950">{selectedPayment.referenceNumber || "-"}</p>
            </div>
            <div className="border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Payment Mode</p>
              <p className="mt-3 text-base font-semibold text-slate-950">{paymentMode}</p>
            </div>
            <div className="border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Receipt Date</p>
              <p className="mt-3 text-base font-semibold text-slate-950">{receiptDate}</p>
            </div>
            <div className="border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Amount</p>
              <p className="mt-3 text-base font-semibold text-emerald-700">{formatINR(selectedPayment.amount)}</p>
            </div>
          </div>
          <div className="mt-4 border border-slate-200 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Ledger Note</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{selectedPayment.note || "No note recorded for this payment."}</p>
          </div>
        </PreviewSection>
      </div>

      <div className="border-t border-slate-200 px-10 py-8">
        <PreviewSection title="Running Account Summary">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-slate-200 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Agreement Value</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{formatINR(agreementValue)}</p>
            </div>
            <div className="border border-slate-200 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Collected Till This Receipt</p>
              <p className="mt-3 text-2xl font-semibold text-emerald-700">{formatINR(selectedStatementRow.cumulativePaid)}</p>
            </div>
            <div className="border border-slate-200 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Outstanding Balance</p>
              <p className={cn("mt-3 text-2xl font-semibold", selectedStatementRow.balance > 0 ? "text-red-600" : "text-emerald-700")}>
                {formatINR(selectedStatementRow.balance)}
              </p>
            </div>
          </div>
        </PreviewSection>
      </div>

      <div className="border-t border-slate-200 px-10 py-8">
        <PreviewSection title="Recorded Agreement Breakdown">
          {recordedAgreementRows.length === 0 ? (
            <div className="border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No recorded agreement rows found for this customer.
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-200">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Label</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Profit Effect</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Ledger Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {recordedAgreementRows.map((row, index) => (
                    <tr key={`${row.type}-${row.label}-${index}`} className="border-b border-slate-200 last:border-b-0">
                      <td className="px-4 py-3">{getAgreementTypeLabel(row.type)}</td>
                      <td className="px-4 py-3">{row.label}</td>
                      <td className="px-4 py-3 text-slate-600">{row.affectsProfit ? "Affects profit" : "Pass-through"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatSignedINR(row.signedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs leading-6 text-slate-500">
            This receipt uses only recorded agreement and payment data. Price changes, GST rows, and discounts shown here come from the stored customer ledger.
          </p>
        </PreviewSection>
      </div>

      <div className="flex justify-between gap-8 border-t border-slate-200 px-10 pb-12 pt-14">
        <div className="w-full max-w-[260px] border-t border-slate-400 pt-4 text-center text-sm text-slate-600">
          Customer Signature
        </div>
        <div className="w-full max-w-[260px] border-t border-slate-400 pt-4 text-center text-sm text-slate-600">
          Authorized Signatory
        </div>
      </div>
    </DocumentShell>
  )
}

function StatementPreview({
  previewRef,
  printDetails,
  statementRows,
  agreementValue,
  recordedAgreementRows,
}: {
  previewRef: RefObject<HTMLDivElement | null>
  printDetails: PrintDetails
  statementRows: StatementRow[]
  agreementValue: number
  recordedAgreementRows: RecordedAgreementRow[]
}) {
  const totalReceived = statementRows.at(-1)?.cumulativePaid ?? 0
  const latestBalance = statementRows.at(-1)?.balance ?? agreementValue

  return (
    <DocumentShell previewRef={previewRef}>
      <div className="border-b border-slate-900 px-10 py-10">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">Customer Account Statement</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">Account Statement</h1>
            <p className="mt-4 text-lg font-medium text-slate-900">{printDetails.projectName || "Project Name"}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{printDetails.siteAddress || "Add the site address in the details panel."}</p>
          </div>

          <div className="w-full max-w-[300px] border border-slate-200 bg-slate-50 px-5 py-4">
            <PreviewField label="Generated On" value={formatDateTime(new Date().toISOString())} />
            <PreviewField label="Customer" value={printDetails.customerName} />
            <PreviewField label="Flat / Unit" value={printDetails.flatNumber} muted={!printDetails.flatNumber} />
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 px-10 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Agreement Value</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{formatINR(agreementValue)}</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Total Collected</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-700">{formatINR(totalReceived)}</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Outstanding Balance</p>
            <p className={cn("mt-3 text-3xl font-semibold", latestBalance > 0 ? "text-red-600" : "text-emerald-700")}>
              {formatINR(latestBalance)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-10 py-8 md:grid-cols-2">
        <PreviewSection title="Customer Details">
          <PreviewField label="Customer" value={printDetails.customerName} />
          <PreviewField label="Phone" value={printDetails.customerPhone} muted={!printDetails.customerPhone} />
          <PreviewField label="Address" value={printDetails.customerAddress} muted={!printDetails.customerAddress} />
          <PreviewField label="PAN Number" value={printDetails.customerPan} muted={!printDetails.customerPan} />
        </PreviewSection>

        <PreviewSection title="Property Details">
          <PreviewField label="Project" value={printDetails.projectName} />
          <PreviewField label="Site Address" value={printDetails.siteAddress} muted={!printDetails.siteAddress} />
          <PreviewField label="Flat / Unit" value={printDetails.flatNumber} muted={!printDetails.flatNumber} />
          <PreviewField label="Floor" value={printDetails.floorNumber} muted={!printDetails.floorNumber} />
          <PreviewField label="Carpet Area" value={printDetails.carpetArea} muted={!printDetails.carpetArea} />
          <PreviewField label="Rate / Sq Ft" value={printDetails.ratePerSqft} muted={!printDetails.ratePerSqft} />
        </PreviewSection>
      </div>

      <div className="border-t border-slate-200 px-10 py-8">
        <PreviewSection title="Payment Ledger">
          <div className="overflow-hidden border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Mode</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Reference</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Note</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Cumulative</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Balance</th>
                </tr>
              </thead>
              <tbody>
                {statementRows.map((row) => (
                  <tr key={row.payment.id} className="border-b border-slate-200 last:border-b-0">
                    <td className="px-4 py-3">{formatDateTime(row.payment.createdAt)}</td>
                    <td className="px-4 py-3">{getPaymentModeLabel(row.payment.paymentMode)}</td>
                    <td className="px-4 py-3">{row.payment.referenceNumber || "-"}</td>
                    <td className="px-4 py-3">{row.payment.note || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatINR(row.payment.amount)}</td>
                    <td className="px-4 py-3 text-right">{formatINR(row.cumulativePaid)}</td>
                    <td className="px-4 py-3 text-right">{formatINR(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PreviewSection>
      </div>

      <div className="border-t border-slate-200 px-10 py-8">
        <PreviewSection title="Recorded Agreement Breakdown">
          {recordedAgreementRows.length === 0 ? (
            <div className="border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No recorded agreement rows found for this customer.
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-200">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Label</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Profit Effect</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Ledger Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {recordedAgreementRows.map((row, index) => (
                    <tr key={`${row.type}-${row.label}-${index}`} className="border-b border-slate-200 last:border-b-0">
                      <td className="px-4 py-3">{getAgreementTypeLabel(row.type)}</td>
                      <td className="px-4 py-3">{row.label}</td>
                      <td className="px-4 py-3 text-slate-600">{row.affectsProfit ? "Affects profit" : "Pass-through"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatSignedINR(row.signedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PreviewSection>
      </div>
    </DocumentShell>
  )
}

function PreviewPlaceholder({
  icon,
  title,
  message,
}: {
  icon: ReactNode
  title: string
  message: string
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] min-w-[820px] max-w-[920px] items-center justify-center px-4">
      <div className="w-full max-w-[860px] border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center bg-slate-100 text-slate-500">
          {icon}
        </div>
        <h3 className="mt-5 text-2xl font-semibold text-slate-950">{title}</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">{message}</p>
      </div>
    </div>
  )
}

export function ReceiptEditor({ customer, siteAddress, payments, onClose }: ReceiptEditorProps) {
  const receiptPreviewRef = useRef<HTMLDivElement | null>(null)
  const statementPreviewRef = useRef<HTMLDivElement | null>(null)

  const incomingCustomerPayments = useMemo(
    () => payments.filter((payment) => payment.direction === "IN" && payment.movementType === "CUSTOMER_PAYMENT"),
    [payments],
  )

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("receipt")
  const [selectedPaymentId, setSelectedPaymentId] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [printDetails, setPrintDetails] = useState<PrintDetails>({
    customerName: customer.name,
    customerPhone: customer.phone || "",
    customerAddress: "",
    customerPan: "",
    projectName: customer.siteName || "",
    siteAddress: siteAddress || "",
    flatNumber: customer.customFlatId || (customer.flatNumber !== null ? `Flat ${customer.flatNumber}` : ""),
    floorNumber: customer.floorName || (customer.floorNumber !== null ? `Floor ${customer.floorNumber}` : ""),
    carpetArea: "",
    ratePerSqft: "",
  })

  const { data: agreementData } = useCustomerAgreement(customer.id)
  const agreement = agreementData?.data?.agreement
  const agreementValue = agreement?.totals.payableTotal ?? customer.sellingPrice
  const recordedAgreementRows: RecordedAgreementRow[] = useMemo(
    () => (agreement?.lines ?? []).map((line) => ({
      type: line.type,
      label: line.label,
      signedAmount: line.signedAmount,
      affectsProfit: line.affectsProfit,
    })),
    [agreement?.lines],
  )
  const recordedTaxTotal = agreement?.totals.tax ?? 0
  const recordedNetSaleValue = agreement?.totals.profitRevenue ?? agreementValue
  const statementRows = useMemo(
    () => buildStatementRows(incomingCustomerPayments, agreementValue),
    [agreementValue, incomingCustomerPayments],
  )
  const selectedStatementRow = useMemo(
    () => statementRows.find((row) => row.payment.id === selectedPaymentId) ?? null,
    [selectedPaymentId, statementRows],
  )
  const selectedPayment = selectedStatementRow?.payment ?? null
  const totalReceived = statementRows.at(-1)?.cumulativePaid ?? 0
  const ledgerBalance = Math.max(agreementValue - totalReceived, 0)
  const receiptNumber = selectedPayment ? buildReceiptNumber(selectedPayment.id, selectedPayment.createdAt) : ""
  const paymentAmountWords = selectedPayment ? convertToIndianWords(selectedPayment.amount) : ""
  const hasPayments = statementRows.length > 0
  const downloadDisabled = workspaceMode === "receipt" ? !selectedPayment : !hasPayments
  const downloadDisabledMessage = !hasPayments
    ? "No customer payments are recorded yet. Add the payment from the customer profile before exporting a PDF."
    : workspaceMode === "receipt" && !selectedPayment
      ? "Select one recorded payment to generate the receipt PDF."
      : ""

  useEffect(() => {
    if (siteAddress) {
      setPrintDetails((current) => current.siteAddress ? current : { ...current, siteAddress })
    }
  }, [siteAddress])

  useEffect(() => {
    if (statementRows.length === 0) {
      setSelectedPaymentId("")
      return
    }

    if (selectedPaymentId && statementRows.some((row) => row.payment.id === selectedPaymentId)) {
      return
    }

    setSelectedPaymentId(statementRows[statementRows.length - 1].payment.id)
  }, [selectedPaymentId, statementRows])

  const handlePrintDetailChange = (field: keyof PrintDetails, value: string) => {
    setPrintDetails((current) => ({ ...current, [field]: value }))
  }

  const handleDownloadPdf = async () => {
    const activePreviewRef = workspaceMode === "receipt" ? receiptPreviewRef : statementPreviewRef
    const activeNode = activePreviewRef.current

    if (!activeNode) return

    const fileName = workspaceMode === "receipt"
      ? `receipt-${sanitizeFilename(printDetails.customerName)}-${sanitizeFilename(receiptNumber)}.pdf`
      : `statement-${sanitizeFilename(printDetails.customerName)}.pdf`

    setIsExporting(true)
    try {
      await exportElementToPdf(activeNode, fileName)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-background">
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60">Receipt Workspace</p>
              <h2 className="mt-2 text-2xl font-serif text-foreground">Customer Receipt & Statement</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the actual document, adjust print details, and export a PDF instead of downloading raw HTML.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="grid grid-cols-2 overflow-hidden border border-border">
                <Button
                  type="button"
                  variant={workspaceMode === "receipt" ? "default" : "ghost"}
                  onClick={() => setWorkspaceMode("receipt")}
                  className="rounded-none border-0 px-4 text-[10px] font-semibold uppercase tracking-widest"
                >
                  <ReceiptText className="mr-2 h-4 w-4" />
                  Receipt
                </Button>
                <Button
                  type="button"
                  variant={workspaceMode === "statement" ? "default" : "ghost"}
                  onClick={() => setWorkspaceMode("statement")}
                  className="rounded-none border-0 px-4 text-[10px] font-semibold uppercase tracking-widest"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Statement
                </Button>
              </div>

              <Button type="button" variant="outline" onClick={onClose} className="gap-2 rounded-none text-[10px] font-semibold uppercase tracking-widest">
                <X className="h-4 w-4" />
                Close
              </Button>
              <Button type="button" onClick={handleDownloadPdf} disabled={downloadDisabled || isExporting} className="gap-2 rounded-none text-[10px] font-semibold uppercase tracking-widest">
                <Download className="h-4 w-4" />
                {isExporting ? "Preparing PDF" : "Download PDF"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0 overflow-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)] sm:px-6">
            {workspaceMode === "receipt" ? (
              selectedPayment && selectedStatementRow ? (
                <ReceiptPreview
                  previewRef={receiptPreviewRef}
                  printDetails={printDetails}
                  selectedPayment={selectedPayment}
                  selectedStatementRow={selectedStatementRow}
                  agreementValue={agreementValue}
                  receiptNumber={receiptNumber}
                  paymentAmountWords={paymentAmountWords}
                  recordedAgreementRows={recordedAgreementRows}
                />
              ) : (
                <PreviewPlaceholder
                  icon={<ReceiptText className="h-7 w-7" />}
                  title="Select a payment to preview the receipt"
                  message="This receipt view always represents one real customer payment. Pick the payment from the right-side panel and the receipt will render here."
                />
              )
            ) : hasPayments ? (
              <StatementPreview
                previewRef={statementPreviewRef}
                printDetails={printDetails}
                statementRows={statementRows}
                agreementValue={agreementValue}
                recordedAgreementRows={recordedAgreementRows}
              />
            ) : (
              <PreviewPlaceholder
                icon={<FileText className="h-7 w-7" />}
                title="No statement available yet"
                message="The account statement becomes available once the customer has at least one recorded payment in the ledger."
              />
            )}
          </div>

          <aside className="min-h-0 overflow-y-auto border-l border-border bg-background">
            <div className="space-y-5 p-4 sm:p-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ledger Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="border border-border bg-muted/20 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Agreement Total</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatINR(agreementValue)}</p>
                    </div>
                    <div className="border border-border bg-muted/20 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Collected</p>
                      <p className="mt-2 text-lg font-semibold text-emerald-600">{formatINR(totalReceived)}</p>
                    </div>
                    <div className="border border-border bg-muted/20 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Outstanding</p>
                      <p className={cn("mt-2 text-lg font-semibold", ledgerBalance > 0 ? "text-red-500" : "text-emerald-600")}>
                        {formatINR(ledgerBalance)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                    <div className="border border-border bg-muted/20 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Recorded Tax / GST</p>
                      <p className="mt-2 text-base font-semibold text-amber-700">{formatINR(recordedTaxTotal)}</p>
                    </div>
                    <div className="border border-border bg-muted/20 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Net Sale Value</p>
                      <p className="mt-2 text-base font-semibold text-primary">{formatINR(recordedNetSaleValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {workspaceMode === "receipt" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Payment to Print</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!hasPayments ? (
                      <div className="border border-dashed border-border px-4 py-6 text-sm leading-6 text-muted-foreground">
                        No customer payments are recorded yet. Add the payment from the customer profile before generating a receipt PDF.
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="receiptPayment">Recorded Payment</Label>
                          <select
                            id="receiptPayment"
                            value={selectedPaymentId}
                            onChange={(event) => setSelectedPaymentId(event.target.value)}
                            className="mt-2 h-11 w-full rounded-none border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            {statementRows.map((row) => (
                              <option key={row.payment.id} value={row.payment.id}>
                                {`${formatShortDate(row.payment.createdAt)} | ${formatINR(row.payment.amount)} | ${getPaymentModeLabel(row.payment.paymentMode)}`}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Each receipt is tied to one real ledger payment. The latest payment is selected automatically.
                          </p>
                        </div>

                        {selectedPayment && (
                          <div className="space-y-3 border border-border bg-muted/20 px-4 py-4">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Receipt Number</p>
                              <p className="mt-2 text-lg font-semibold text-foreground">{receiptNumber}</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Amount</p>
                                <p className="mt-2 text-base font-semibold text-emerald-600">{formatINR(selectedPayment.amount)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Mode</p>
                                <p className="mt-2 text-base font-semibold text-foreground">{getPaymentModeLabel(selectedPayment.paymentMode)}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Reference</p>
                              <p className="mt-2 text-sm text-foreground">{selectedPayment.referenceNumber || "No reference recorded"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">Ledger Note</p>
                              <p className="mt-2 text-sm leading-6 text-foreground">{selectedPayment.note || "No note recorded"}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Receipt Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input
                        id="customerName"
                        value={printDetails.customerName}
                        onChange={(event) => handlePrintDetailChange("customerName", event.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">Phone Number</Label>
                      <Input
                        id="customerPhone"
                        value={printDetails.customerPhone}
                        onChange={(event) => handlePrintDetailChange("customerPhone", event.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerAddress">Customer Address</Label>
                      <Textarea
                        id="customerAddress"
                        value={printDetails.customerAddress}
                        onChange={(event) => handlePrintDetailChange("customerAddress", event.target.value)}
                        className="mt-2 min-h-[88px] rounded-none"
                        placeholder="Manual print field for the receipt body"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPan">PAN Number</Label>
                      <Input
                        id="customerPan"
                        value={printDetails.customerPan}
                        onChange={(event) => handlePrintDetailChange("customerPan", event.target.value)}
                        className="mt-2"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        value={printDetails.projectName}
                        onChange={(event) => handlePrintDetailChange("projectName", event.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="siteAddress">Site Address</Label>
                      <Textarea
                        id="siteAddress"
                        value={printDetails.siteAddress}
                        onChange={(event) => handlePrintDetailChange("siteAddress", event.target.value)}
                        className="mt-2 min-h-[88px] rounded-none"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="flatNumber">Flat / Unit</Label>
                        <Input
                          id="flatNumber"
                          value={printDetails.flatNumber}
                          onChange={(event) => handlePrintDetailChange("flatNumber", event.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="floorNumber">Floor</Label>
                        <Input
                          id="floorNumber"
                          value={printDetails.floorNumber}
                          onChange={(event) => handlePrintDetailChange("floorNumber", event.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="carpetArea">Carpet Area</Label>
                        <Input
                          id="carpetArea"
                          value={printDetails.carpetArea}
                          onChange={(event) => handlePrintDetailChange("carpetArea", event.target.value)}
                          className="mt-2"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ratePerSqft">Rate per Sq Ft</Label>
                        <Input
                          id="ratePerSqft"
                          value={printDetails.ratePerSqft}
                          onChange={(event) => handlePrintDetailChange("ratePerSqft", event.target.value)}
                          className="mt-2"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-6 text-muted-foreground">
                    These fields update the receipt preview live. They are print metadata only and do not change the customer ledger.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Export Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>{downloadDisabledMessage || (workspaceMode === "receipt"
                    ? "The visible receipt preview will be exported as a PDF."
                    : "The visible account statement preview will be exported as a PDF.")}</p>
                  <p>
                    Payment recording remains in the customer profile. This screen is now only for document review and PDF export.
                  </p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
