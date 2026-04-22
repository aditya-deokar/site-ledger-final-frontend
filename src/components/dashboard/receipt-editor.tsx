"use client"

import { useEffect, useState } from "react"
import { Download, IndianRupee, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRecordCustomerPayment } from "@/hooks/api/customer.hooks"
import { type Customer, type CustomerPaymentHistoryItem } from "@/schemas/customer.schema"
import { cn } from "@/lib/utils"
import { RecordPaymentModal } from "./record-payment-modal"

type WorkspaceMode = "receipt" | "statement"
type TaxType = "percentage" | "amount"

type TaxRow = {
  id: string
  name: string
  type: TaxType
  value: number
}

type StatementRow = {
  payment: CustomerPaymentHistoryItem
  cumulativePaid: number
  balance: number
}

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

function formatINR(value: number) {
  return "\u20B9" + value.toLocaleString("en-IN")
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

function formatIsoDate(iso?: string | null) {
  if (!iso) return ""
  return iso.slice(0, 10)
}

function sanitizeFilename(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "document"
}

function escapeHtml(value?: string | null) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
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

function buildReceiptNumber(paymentId: string, postedAt: string) {
  const dateToken = postedAt.slice(2, 10).replace(/-/g, "")
  const paymentToken = paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()
  return `RCP-${dateToken}-${paymentToken}`
}

function createEditorRowId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

function buildStatementRows(payments: CustomerPaymentHistoryItem[], sellingPrice: number): StatementRow[] {
  let cumulativePaid = 0

  return [...payments].sort(comparePayments).map((payment) => {
    cumulativePaid += payment.amount
    return {
      payment,
      cumulativePaid,
      balance: Math.max(sellingPrice - cumulativePaid, 0),
    }
  })
}

function calculateTaxAmount(tax: TaxRow, baseAmount: number) {
  if (tax.type === "percentage") {
    return (baseAmount * tax.value) / 100
  }

  return tax.value
}

function downloadHtmlFile(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function buildReceiptHtml(input: {
  receiptNumber: string
  selectedPayment: CustomerPaymentHistoryItem
  statementRow: StatementRow
  printDetails: PrintDetails
  paymentAmountWords: string
  printTaxBaseAmount: number
  taxRows: Array<TaxRow & { calculatedAmount: number }>
  totalPrintTaxAmount: number
}) {
  const { receiptNumber, selectedPayment, statementRow, printDetails, paymentAmountWords, printTaxBaseAmount, taxRows, totalPrintTaxAmount } = input
  const paymentModeLabel = getPaymentModeLabel(selectedPayment.paymentMode)
  const taxRowsHtml = taxRows.length > 0
    ? taxRows.map((tax, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(tax.name || "Tax Row")}</td>
          <td>${tax.type === "percentage" ? `${tax.value}%` : formatINR(tax.value)}</td>
          <td class="text-right">${formatINR(tax.calculatedAmount)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" class="muted">No print-only taxes added</td></tr>`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt - ${escapeHtml(printDetails.customerName)}</title>
  <style>
    :root {
      color-scheme: light;
      --border: #1f2937;
      --muted: #6b7280;
      --soft: #f3f4f6;
      --accent: #0f766e;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.45;
    }

    .page {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }

    .title-block {
      border: 2px solid var(--border);
      padding: 18px 20px;
      margin-bottom: 18px;
    }

    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 0.08em;
    }

    .title-sub {
      color: var(--muted);
      margin-top: 6px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .receipt-meta {
      text-align: right;
      min-width: 220px;
    }

    .receipt-meta div {
      margin-bottom: 6px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }

    .panel {
      border: 1px solid var(--border);
      padding: 14px;
    }

    .panel h2 {
      margin: 0 0 10px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }

    .field {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 4px 0;
      border-bottom: 1px dashed #d1d5db;
    }

    .field:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .field-label {
      color: var(--muted);
      min-width: 140px;
    }

    .amount-box {
      border: 2px solid var(--border);
      padding: 18px 20px;
      margin-bottom: 18px;
    }

    .amount-box .amount {
      font-size: 26px;
      font-weight: 700;
      color: var(--accent);
    }

    .amount-box .words {
      margin-top: 8px;
      font-size: 15px;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    th, td {
      border: 1px solid var(--border);
      padding: 9px 10px;
      vertical-align: top;
    }

    th {
      background: var(--soft);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.08em;
    }

    .text-right {
      text-align: right;
    }

    .muted {
      color: var(--muted);
    }

    .note {
      margin-top: 10px;
      color: var(--muted);
      font-size: 11px;
    }

    .signature-row {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-top: 44px;
    }

    .signature-box {
      width: 260px;
      padding-top: 32px;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 12px;
    }

    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="title-block">
      <div class="title-row">
        <div>
          <h1>PAYMENT RECEIPT</h1>
          <div class="title-sub">Single payment acknowledgement</div>
        </div>
        <div class="receipt-meta">
          <div><strong>Receipt No:</strong> ${escapeHtml(receiptNumber)}</div>
          <div><strong>Receipt Date:</strong> ${escapeHtml(formatShortDate(selectedPayment.createdAt))}</div>
          <div><strong>Payment Posted:</strong> ${escapeHtml(formatDateTime(selectedPayment.createdAt))}</div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="panel">
        <h2>Customer Details</h2>
        <div class="field"><span class="field-label">Customer Name</span><strong>${escapeHtml(printDetails.customerName)}</strong></div>
        <div class="field"><span class="field-label">Phone</span><span>${escapeHtml(printDetails.customerPhone || "-")}</span></div>
        <div class="field"><span class="field-label">Address</span><span>${escapeHtml(printDetails.customerAddress || "-")}</span></div>
        <div class="field"><span class="field-label">PAN Number</span><span>${escapeHtml(printDetails.customerPan || "-")}</span></div>
      </div>
      <div class="panel">
        <h2>Project & Flat Details</h2>
        <div class="field"><span class="field-label">Project</span><strong>${escapeHtml(printDetails.projectName || "-")}</strong></div>
        <div class="field"><span class="field-label">Site Address</span><span>${escapeHtml(printDetails.siteAddress || "-")}</span></div>
        <div class="field"><span class="field-label">Flat / Unit</span><span>${escapeHtml(printDetails.flatNumber || "-")}</span></div>
        <div class="field"><span class="field-label">Floor</span><span>${escapeHtml(printDetails.floorNumber || "-")}</span></div>
        <div class="field"><span class="field-label">Carpet Area</span><span>${escapeHtml(printDetails.carpetArea || "-")}</span></div>
        <div class="field"><span class="field-label">Rate / Sq Ft</span><span>${escapeHtml(printDetails.ratePerSqft || "-")}</span></div>
      </div>
    </div>

    <div class="amount-box">
      <div><strong>Received Amount:</strong></div>
      <div class="amount">${formatINR(selectedPayment.amount)}</div>
      <div class="words">${escapeHtml(paymentAmountWords)}</div>
    </div>

    <div class="panel">
      <h2>Payment Details</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Mode</th>
            <th>Reference</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(formatDateTime(selectedPayment.createdAt))}</td>
            <td>${escapeHtml(paymentModeLabel)}</td>
            <td>${escapeHtml(selectedPayment.referenceNumber || "-")}</td>
            <td>${escapeHtml(selectedPayment.note || "-")}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top: 18px;">
      <h2>Running Account Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Agreement Value</th>
            <th>Total Received So Far</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-right">${formatINR(statementRow.balance + statementRow.cumulativePaid)}</td>
            <td class="text-right">${formatINR(statementRow.cumulativePaid)}</td>
            <td class="text-right">${formatINR(statementRow.balance)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top: 18px;">
      <h2>Print-only Tax Breakup</h2>
      <table>
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Tax Name</th>
            <th>Rate / Amount</th>
            <th>Calculated Amount</th>
          </tr>
        </thead>
        <tbody>
          ${taxRowsHtml}
          <tr>
            <td colspan="3" class="text-right"><strong>Total Print-only Tax</strong></td>
            <td class="text-right"><strong>${formatINR(totalPrintTaxAmount)}</strong></td>
          </tr>
        </tbody>
      </table>
      <div class="note">
        Print-only tax calculations are based on ${formatINR(printTaxBaseAmount)} and do not change the customer ledger, agreement balance, or booking value.
      </div>
    </div>

    <div class="signature-row">
      <div class="signature-box">Customer Signature</div>
      <div class="signature-box">Authorized Signatory</div>
    </div>
  </div>
</body>
</html>
  `
}

function buildStatementHtml(input: {
  printDetails: PrintDetails
  statementRows: StatementRow[]
  sellingPrice: number
}) {
  const { printDetails, statementRows, sellingPrice } = input
  const latestBalance = statementRows.at(-1)?.balance ?? sellingPrice
  const totalReceived = statementRows.at(-1)?.cumulativePaid ?? 0
  const rowsHtml = statementRows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(formatDateTime(row.payment.createdAt))}</td>
      <td class="text-right">${formatINR(row.payment.amount)}</td>
      <td>${escapeHtml(getPaymentModeLabel(row.payment.paymentMode))}</td>
      <td>${escapeHtml(row.payment.referenceNumber || "-")}</td>
      <td>${escapeHtml(row.payment.note || "-")}</td>
      <td class="text-right">${formatINR(row.cumulativePaid)}</td>
      <td class="text-right">${formatINR(row.balance)}</td>
    </tr>
  `).join("")

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Account Statement - ${escapeHtml(printDetails.customerName)}</title>
  <style>
    :root {
      color-scheme: light;
      --border: #111827;
      --muted: #6b7280;
      --soft: #f3f4f6;
      --accent: #1d4ed8;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.45;
    }

    .page {
      width: 100%;
      max-width: 980px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      border: 2px solid var(--border);
      padding: 18px 20px;
      margin-bottom: 18px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 14px;
    }

    h1 {
      margin: 0;
      font-size: 26px;
      letter-spacing: 0.08em;
    }

    .subtitle {
      margin-top: 6px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 11px;
    }

    .meta {
      text-align: right;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .summary-box {
      border: 1px solid var(--border);
      padding: 12px;
      background: var(--soft);
    }

    .summary-label {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 10px;
      margin-bottom: 6px;
    }

    .summary-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--accent);
    }

    .details {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .panel {
      border: 1px solid var(--border);
      padding: 14px;
    }

    .panel h2 {
      margin: 0 0 10px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    .field {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 4px 0;
      border-bottom: 1px dashed #d1d5db;
    }

    .field:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .field-label {
      color: var(--muted);
      min-width: 140px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      border: 1px solid var(--border);
      padding: 8px 9px;
      vertical-align: top;
    }

    th {
      background: var(--soft);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .text-right {
      text-align: right;
    }

    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-top">
        <div>
          <h1>ACCOUNT STATEMENT</h1>
          <div class="subtitle">Customer collection history</div>
        </div>
        <div class="meta">
          <div><strong>Generated On:</strong> ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
          <div><strong>Customer:</strong> ${escapeHtml(printDetails.customerName)}</div>
          <div><strong>Project:</strong> ${escapeHtml(printDetails.projectName || "-")}</div>
        </div>
      </div>

      <div class="summary">
        <div class="summary-box">
          <div class="summary-label">Agreement Value</div>
          <div class="summary-value">${formatINR(sellingPrice)}</div>
        </div>
        <div class="summary-box">
          <div class="summary-label">Total Received</div>
          <div class="summary-value">${formatINR(totalReceived)}</div>
        </div>
        <div class="summary-box">
          <div class="summary-label">Balance</div>
          <div class="summary-value">${formatINR(latestBalance)}</div>
        </div>
      </div>
    </div>

    <div class="details">
      <div class="panel">
        <h2>Customer Details</h2>
        <div class="field"><span class="field-label">Name</span><strong>${escapeHtml(printDetails.customerName)}</strong></div>
        <div class="field"><span class="field-label">Phone</span><span>${escapeHtml(printDetails.customerPhone || "-")}</span></div>
        <div class="field"><span class="field-label">Address</span><span>${escapeHtml(printDetails.customerAddress || "-")}</span></div>
        <div class="field"><span class="field-label">PAN Number</span><span>${escapeHtml(printDetails.customerPan || "-")}</span></div>
      </div>
      <div class="panel">
        <h2>Project & Flat Details</h2>
        <div class="field"><span class="field-label">Project</span><strong>${escapeHtml(printDetails.projectName || "-")}</strong></div>
        <div class="field"><span class="field-label">Flat / Unit</span><span>${escapeHtml(printDetails.flatNumber || "-")}</span></div>
        <div class="field"><span class="field-label">Floor</span><span>${escapeHtml(printDetails.floorNumber || "-")}</span></div>
        <div class="field"><span class="field-label">Site Address</span><span>${escapeHtml(printDetails.siteAddress || "-")}</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Sr.</th>
          <th>Date</th>
          <th>Amount</th>
          <th>Mode</th>
          <th>Reference</th>
          <th>Note</th>
          <th>Cumulative Paid</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>
  `
}

interface ReceiptEditorProps {
  customer: Customer & { siteName?: string | null }
  siteId?: string
  siteAddress?: string
  payments: CustomerPaymentHistoryItem[]
  onClose: () => void
}

export function ReceiptEditor({ customer, siteId, siteAddress, payments, onClose }: ReceiptEditorProps) {
  const incomingCustomerPayments = payments.filter(
    (payment) => payment.direction === "IN" && payment.movementType === "CUSTOMER_PAYMENT",
  )
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("receipt")
  const [ledgerPayments, setLedgerPayments] = useState<CustomerPaymentHistoryItem[]>(incomingCustomerPayments)
  const [selectedPaymentId, setSelectedPaymentId] = useState("")
  const [isLedgerPaymentModalOpen, setIsLedgerPaymentModalOpen] = useState(false)
  const [printTaxBaseAmount, setPrintTaxBaseAmount] = useState(0)
  const [taxes, setTaxes] = useState<TaxRow[]>([])
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
  const {
    mutate: recordPayment,
    isPending: isRecordingPayment,
    error: paymentError,
    reset: resetPaymentState,
  } = useRecordCustomerPayment()

  useEffect(() => {
    setLedgerPayments(incomingCustomerPayments)
  }, [payments])

  useEffect(() => {
    if (siteAddress) {
      setPrintDetails((current) => current.siteAddress ? current : { ...current, siteAddress })
    }
  }, [siteAddress])

  const statementRows = buildStatementRows(ledgerPayments, customer.sellingPrice)
  const selectedStatementRow = statementRows.find((row) => row.payment.id === selectedPaymentId) ?? null
  const selectedPayment = selectedStatementRow?.payment ?? null
  const totalReceived = statementRows.at(-1)?.cumulativePaid ?? 0
  const ledgerBalance = Math.max(customer.sellingPrice - totalReceived, 0)
  const paymentAmountWords = selectedPayment ? convertToIndianWords(selectedPayment.amount) : "Select a payment to generate the receipt."
  const receiptNumber = selectedPayment ? buildReceiptNumber(selectedPayment.id, selectedPayment.createdAt) : ""
  const calculatedTaxes = taxes.map((tax) => ({
    ...tax,
    calculatedAmount: calculateTaxAmount(tax, printTaxBaseAmount),
  }))
  const totalPrintTaxAmount = calculatedTaxes.reduce((sum, tax) => sum + tax.calculatedAmount, 0)
  const hasPayments = statementRows.length > 0
  const canRecordPayment = ledgerBalance > 0
  const downloadDisabled = workspaceMode === "receipt" ? !selectedPayment : !hasPayments
  const downloadDisabledMessage = !hasPayments
    ? "No customer payments are recorded yet. Record the first collection before downloading a receipt or statement."
    : workspaceMode === "receipt" && !selectedPayment
      ? "Select one recorded payment to generate its receipt."
      : ""

  useEffect(() => {
    if (statementRows.length === 0) {
      setSelectedPaymentId("")
      setPrintTaxBaseAmount(0)
      return
    }

    if (statementRows.length === 1) {
      setSelectedPaymentId(statementRows[0].payment.id)
      return
    }

    if (selectedPaymentId && !statementRows.some((row) => row.payment.id === selectedPaymentId)) {
      setSelectedPaymentId("")
    }
  }, [selectedPaymentId, statementRows])

  useEffect(() => {
    setPrintTaxBaseAmount(selectedPayment?.amount ?? 0)
  }, [selectedPayment?.amount, selectedPaymentId])

  const handlePrintDetailChange = (field: keyof PrintDetails, value: string) => {
    setPrintDetails((current) => ({ ...current, [field]: value }))
  }

  const addTaxRow = () => {
    setTaxes((current) => [
      ...current,
      {
        id: createEditorRowId("tax"),
        name: "",
        type: "percentage",
        value: 0,
      },
    ])
  }

  const updateTaxRow = (taxId: string, field: keyof TaxRow, value: string | number) => {
    setTaxes((current) =>
      current.map((tax) => tax.id === taxId ? { ...tax, [field]: value } : tax),
    )
  }

  const removeTaxRow = (taxId: string) => {
    setTaxes((current) => current.filter((tax) => tax.id !== taxId))
  }

  const handleDownload = () => {
    if (workspaceMode === "receipt") {
      if (!selectedPayment || !selectedStatementRow) return

      const html = buildReceiptHtml({
        receiptNumber,
        selectedPayment,
        statementRow: selectedStatementRow,
        printDetails,
        paymentAmountWords,
        printTaxBaseAmount,
        taxRows: calculatedTaxes,
        totalPrintTaxAmount,
      })
      downloadHtmlFile(
        `receipt-${sanitizeFilename(printDetails.customerName)}-${sanitizeFilename(receiptNumber)}.html`,
        html,
      )
      return
    }

    const html = buildStatementHtml({
      printDetails,
      statementRows,
      sellingPrice: customer.sellingPrice,
    })
    downloadHtmlFile(`statement-${sanitizeFilename(printDetails.customerName)}.html`, html)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden border border-border bg-background sm:h-auto sm:max-h-[92vh]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 p-6 backdrop-blur">
          <div>
            <h2 className="text-2xl font-serif text-foreground">Receipt & Statement Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Receipt mode prints one recorded payment. Statement mode prints the full payment trail with running balance.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
          >
            Cancel
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Account Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Customer</p>
                  <p className="mt-2 text-base font-serif text-foreground">{printDetails.customerName || "Pending name"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Project</p>
                  <p className="mt-2 text-base font-serif text-foreground">{printDetails.projectName || "Pending project"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Agreement Value</p>
                  <p className="mt-2 text-base font-serif text-foreground">{formatINR(customer.sellingPrice)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Current Balance</p>
                  <p className={cn("mt-2 text-base font-serif", ledgerBalance > 0 ? "text-red-500" : "text-emerald-600")}>
                    {formatINR(ledgerBalance)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Workspace Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={workspaceMode === "receipt" ? "default" : "outline"}
                    onClick={() => setWorkspaceMode("receipt")}
                    className="rounded-none text-[10px] font-bold uppercase tracking-widest"
                  >
                    Receipt
                  </Button>
                  <Button
                    type="button"
                    variant={workspaceMode === "statement" ? "default" : "outline"}
                    onClick={() => setWorkspaceMode("statement")}
                    className="rounded-none text-[10px] font-bold uppercase tracking-widest"
                  >
                    Statement
                  </Button>
                </div>

                <div className="space-y-3 border border-border/70 p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Total Received</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600">{formatINR(totalReceived)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetPaymentState()
                      setIsLedgerPaymentModalOpen(true)
                    }}
                    disabled={!canRecordPayment}
                    className="w-full rounded-none text-[10px] font-bold uppercase tracking-widest"
                  >
                    <IndianRupee className="mr-2 h-4 w-4" />
                    {canRecordPayment ? "Record Payment" : "Fully Paid"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Print Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={printDetails.customerName}
                    onChange={(event) => handlePrintDetailChange("customerName", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={printDetails.customerPhone}
                    onChange={(event) => handlePrintDetailChange("customerPhone", event.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="customerAddress">Address</Label>
                  <Input
                    id="customerAddress"
                    value={printDetails.customerAddress}
                    onChange={(event) => handlePrintDetailChange("customerAddress", event.target.value)}
                    placeholder="Manual print-only field"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPan">PAN Number</Label>
                  <Input
                    id="customerPan"
                    value={printDetails.customerPan}
                    onChange={(event) => handlePrintDetailChange("customerPan", event.target.value)}
                    placeholder="Manual print-only field"
                  />
                </div>
                <div>
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={printDetails.projectName}
                    onChange={(event) => handlePrintDetailChange("projectName", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="flatNumber">Flat / Unit</Label>
                  <Input
                    id="flatNumber"
                    value={printDetails.flatNumber}
                    onChange={(event) => handlePrintDetailChange("flatNumber", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="floorNumber">Floor</Label>
                  <Input
                    id="floorNumber"
                    value={printDetails.floorNumber}
                    onChange={(event) => handlePrintDetailChange("floorNumber", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="carpetArea">Carpet Area</Label>
                  <Input
                    id="carpetArea"
                    value={printDetails.carpetArea}
                    onChange={(event) => handlePrintDetailChange("carpetArea", event.target.value)}
                    placeholder="Manual print-only field"
                  />
                </div>
                <div>
                  <Label htmlFor="ratePerSqft">Rate per Sq Ft</Label>
                  <Input
                    id="ratePerSqft"
                    value={printDetails.ratePerSqft}
                    onChange={(event) => handlePrintDetailChange("ratePerSqft", event.target.value)}
                    placeholder="Manual print-only field"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="siteAddress">Site Address</Label>
                  <Input
                    id="siteAddress"
                    value={printDetails.siteAddress}
                    onChange={(event) => handlePrintDetailChange("siteAddress", event.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Address, PAN number, carpet area, and rate per square foot are now manual print fields here. They are no longer prefetched from missing customer properties.
              </p>
            </CardContent>
          </Card>

          {workspaceMode === "receipt" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Receipt Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!hasPayments ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      No customer payments are recorded yet. Record the first collection before generating a receipt.
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                        <div>
                          <Label htmlFor="receiptPayment">Recorded Payment</Label>
                          <select
                            id="receiptPayment"
                            value={selectedPaymentId}
                            onChange={(event) => setSelectedPaymentId(event.target.value)}
                            className="mt-2 h-11 w-full rounded-none border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">Select one payment</option>
                            {statementRows.map((row) => (
                              <option key={row.payment.id} value={row.payment.id}>
                                {`${formatShortDate(row.payment.createdAt)} | ${formatINR(row.payment.amount)} | ${getPaymentModeLabel(row.payment.paymentMode)}`}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-xs text-muted-foreground">
                            If only one payment exists it is selected automatically. Each receipt is now tied to one real payment only.
                          </p>
                        </div>
                        <div className="border border-border/70 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Receipt Number</p>
                          <p className="mt-2 text-lg font-serif text-foreground">{receiptNumber || "Select a payment"}</p>
                          <p className="mt-3 text-[10px] text-muted-foreground">
                            Generated from the selected payment id and posted date, so each receipt stays unique.
                          </p>
                        </div>
                      </div>

                      {selectedPayment && selectedStatementRow ? (
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                          <Card className="border-border/60">
                            <CardHeader>
                              <CardTitle className="text-base">Selected Payment</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <Label>Receipt Date</Label>
                                  <Input value={formatIsoDate(selectedPayment.createdAt)} readOnly className="mt-2 bg-muted/60" />
                                </div>
                                <div>
                                  <Label>Posted At</Label>
                                  <Input value={formatDateTime(selectedPayment.createdAt)} readOnly className="mt-2 bg-muted/60" />
                                </div>
                                <div>
                                  <Label>Payment Amount</Label>
                                  <Input value={formatINR(selectedPayment.amount)} readOnly className="mt-2 bg-muted/60 font-bold text-emerald-600" />
                                </div>
                                <div>
                                  <Label>Amount in Words</Label>
                                  <Input value={paymentAmountWords} readOnly className="mt-2 bg-muted/60" />
                                </div>
                                <div>
                                  <Label>Payment Mode</Label>
                                  <Input value={getPaymentModeLabel(selectedPayment.paymentMode)} readOnly className="mt-2 bg-muted/60" />
                                </div>
                                <div>
                                  <Label>Reference Number</Label>
                                  <Input value={selectedPayment.referenceNumber || "Not recorded"} readOnly className="mt-2 bg-muted/60" />
                                </div>
                                <div className="sm:col-span-2">
                                  <Label>Ledger Note</Label>
                                  <Input value={selectedPayment.note || "-"} readOnly className="mt-2 bg-muted/60" />
                                </div>
                              </div>
                              {!selectedPayment.paymentMode && (
                                <div className="border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-700">
                                  This is a legacy payment recorded before payment mode tracking was added. The receipt will show that the mode was not recorded, rather than inventing one on the frontend.
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card className="border-dashed">
                            <CardHeader>
                              <CardTitle className="text-base">Running Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Agreement Value</p>
                                <p className="mt-1 text-2xl font-bold text-foreground">{formatINR(customer.sellingPrice)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Total Received So Far</p>
                                <p className="mt-1 text-2xl font-bold text-emerald-600">{formatINR(selectedStatementRow.cumulativePaid)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Balance</p>
                                <p className={cn("mt-1 text-2xl font-bold", selectedStatementRow.balance > 0 ? "text-red-500" : "text-emerald-600")}>
                                  {formatINR(selectedStatementRow.balance)}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This summary uses the real customer ledger only. Print-only taxes below never affect booking balance.
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Print-only Tax Breakup</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addTaxRow}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tax
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div>
                      <Label htmlFor="printTaxBaseAmount">Print Amount for Tax Rows</Label>
                      <Input
                        id="printTaxBaseAmount"
                        type="number"
                        value={printTaxBaseAmount || ""}
                        onChange={(event) => setPrintTaxBaseAmount(Number(event.target.value) || 0)}
                        className="mt-2"
                      />
                    </div>
                    <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                      Taxes here are print-only. They recalculate whenever this print amount changes, but they never change the real ledger total, cumulative paid amount, or booking balance.
                    </div>
                  </div>

                  {taxes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      No print-only taxes added.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {calculatedTaxes.map((tax, index) => (
                        <div
                          key={tax.id}
                          className="grid grid-cols-1 gap-2 border border-border/60 p-3 md:grid-cols-[auto_minmax(0,1.3fr)_180px_150px_140px_auto] md:items-center"
                        >
                          <div className="text-sm font-medium text-muted-foreground">#{index + 1}</div>
                          <Input
                            value={tax.name}
                            onChange={(event) => updateTaxRow(tax.id, "name", event.target.value)}
                            placeholder="Tax name"
                          />
                          <select
                            value={tax.type}
                            onChange={(event) => updateTaxRow(tax.id, "type", event.target.value as TaxType)}
                            className="h-10 rounded-none border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="amount">Fixed Amount</option>
                          </select>
                          <Input
                            type="number"
                            value={tax.value}
                            onChange={(event) => updateTaxRow(tax.id, "value", Number(event.target.value) || 0)}
                            placeholder={tax.type === "percentage" ? "18" : "5000"}
                          />
                          <div className="text-sm font-bold text-primary">{formatINR(tax.calculatedAmount)}</div>
                          <Button type="button" variant="outline" size="sm" onClick={() => removeTaxRow(tax.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-4 rounded-lg bg-muted/50 p-4 md:grid-cols-2">
                    <div>
                      <Label>Total Print-only Tax</Label>
                      <div className="text-lg font-bold text-orange-600">{formatINR(totalPrintTaxAmount)}</div>
                    </div>
                    <div>
                      <Label>Print Total Including Tax</Label>
                      <div className="text-lg font-bold text-primary">{formatINR(printTaxBaseAmount + totalPrintTaxAmount)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Statement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasPayments ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No customer payments are recorded yet. Record the first collection before generating a statement.
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Statement mode includes every recorded customer payment in chronological order, with running cumulative total and remaining balance on each row.
                    </p>
                    <div className="overflow-x-auto border border-border">
                      <table className="min-w-full border-collapse text-sm">
                        <thead className="bg-muted/50">
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Date</th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Amount</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Mode</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Reference</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Note</th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Cumulative</th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statementRows.map((row) => (
                            <tr key={row.payment.id} className="border-b border-border/60">
                              <td className="px-3 py-3">{formatDateTime(row.payment.createdAt)}</td>
                              <td className="px-3 py-3 text-right font-bold text-emerald-600">{formatINR(row.payment.amount)}</td>
                              <td className="px-3 py-3">{getPaymentModeLabel(row.payment.paymentMode)}</td>
                              <td className="px-3 py-3">{row.payment.referenceNumber || "-"}</td>
                              <td className="px-3 py-3">{row.payment.note || "-"}</td>
                              <td className="px-3 py-3 text-right">{formatINR(row.cumulativePaid)}</td>
                              <td className="px-3 py-3 text-right">{formatINR(row.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {paymentError && (
            <div className="border border-red-500/20 bg-red-500/10 p-3 text-[11px] text-red-600">
              {typeof paymentError === "string"
                ? paymentError
                : typeof paymentError === "object" && paymentError !== null && "error" in paymentError && typeof paymentError.error === "string"
                  ? paymentError.error
                  : "Payment could not be recorded from the receipt workspace."}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-background/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {downloadDisabledMessage || (workspaceMode === "receipt"
              ? "Download a single-payment receipt for the selected ledger entry."
              : "Download a full account statement for all recorded payments.")}
          </div>
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" className="gap-2" disabled={downloadDisabled} onClick={handleDownload}>
              <Download className="h-4 w-4" />
              {workspaceMode === "receipt" ? "Download Receipt" : "Download Statement"}
            </Button>
          </div>
        </div>
      </div>

      {isLedgerPaymentModalOpen && (
        <RecordPaymentModal
          title={`Customer: ${customer.name}`}
          totalAmount={customer.sellingPrice}
          currentlyPaid={totalReceived}
          entityType="customer-booking"
          entityId={customer.id}
          siteId={siteId}
          isPending={isRecordingPayment}
          onClose={() => {
            setIsLedgerPaymentModalOpen(false)
            resetPaymentState()
          }}
          onSubmit={(paymentInput) => {
            recordPayment(
              { customerId: customer.id, siteId, data: paymentInput },
              {
                onSuccess: (response: any) => {
                  const payment = response?.data?.payment
                  if (payment) {
                    setLedgerPayments((current) => [
                      ...current,
                      {
                        id: payment.id,
                        amount: payment.amount,
                        direction: "IN",
                        movementType: "CUSTOMER_PAYMENT",
                        paymentMode: payment.paymentMode ?? null,
                        referenceNumber: payment.referenceNumber ?? null,
                        note: payment.note ?? null,
                        createdAt: payment.createdAt,
                      },
                    ])
                    setSelectedPaymentId(payment.id)
                    setWorkspaceMode("receipt")
                  }
                  setIsLedgerPaymentModalOpen(false)
                  resetPaymentState()
                },
              },
            )
          }}
        />
      )}
    </div>
  )
}
