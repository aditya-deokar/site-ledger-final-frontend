import type { jsPDF } from "jspdf"

export interface ReceiptData {
  receiptNumber: string
  receiptDate: string
  postedAt: string
  paymentMode: string
  paymentAmount: number
  paymentAmountWords: string
  referenceNumber?: string
  note?: string

  companyName: string

  customerName: string
  customerPhone?: string
  customerAddress?: string
  customerPan?: string

  projectName: string
  siteAddress?: string
  flatNumber?: string
  floorNumber?: string
  carpetArea?: string
  ratePerSqft?: string

  agreementValue: number
  totalCollected: number
  balanceDue: number

  agreementLines: Array<{
    type: string
    label: string
    affectsProfit: boolean
    signedAmount: number
    createdAt: string
  }>
}

export interface StatementData {
  generatedAt: string

  companyName: string

  customerName: string
  customerPhone?: string
  customerAddress?: string
  customerPan?: string

  projectName: string
  siteAddress?: string
  flatNumber?: string
  floorNumber?: string
  carpetArea?: string
  ratePerSqft?: string

  agreementValue: number
  totalReceived: number
  outstanding: number

  payments: Array<{
    date: string
    mode: string
    reference?: string
    note?: string
    amount: number
    cumulativePaid: number
    balance: number
  }>

  agreementLines: Array<{
    type: string
    label: string
    affectsProfit: boolean
    signedAmount: number
    createdAt: string
  }>
}

function formatINR(value: number): string {
  return "Rs. " + value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatSignedINR(value: number): string {
  if (value < 0)
    return `- Rs. ${Math.abs(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return "Rs. " + value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function generateReceiptPDF(data: ReceiptData, filename: string) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF("p", "mm", "a4")

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const ml = 15
  const mr = 15
  const cw = pageWidth - ml - mr
  let y = 0

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const setFont = (style: "bold" | "normal" | "italic", size: number, color: number = 0) => {
    doc.setFont("helvetica", style)
    doc.setFontSize(size)
    doc.setTextColor(color, color, color)
  }

  const infoRow = (label: string, value: string | undefined, x: number, iy: number, maxW: number): number => {
    if (!value) return 0
    setFont("bold", 6.5, 110)
    doc.text(label, x, iy)
    setFont("normal", 7.5, 20)
    const lines = doc.splitTextToSize(value, maxW)
    doc.text(lines, x, iy + 4)
    return lines.length * 4 + 5
  }

  // ─── HEADER BAND ──────────────────────────────────────────────────────────
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, 18, "F")
  
  // Add a simple border line at bottom
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(0, 18, pageWidth, 18)

  setFont("bold", 13, 0)
  doc.text(data.companyName.toUpperCase(), ml, 7)
  setFont("normal", 7.5, 60)
  doc.text(data.projectName, ml, 12)
  if (data.siteAddress) {
    setFont("normal", 6.5, 100)
    doc.text(doc.splitTextToSize(data.siteAddress, 100)[0], ml, 16)
  }

  // Receipt badge top-right - white background
  const badgeX = pageWidth - mr - 58
  doc.setFillColor(245, 245, 245)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(badgeX, 2, 58, 14, 1, 1, "FD")
  setFont("bold", 6.5, 80)
  doc.text("PAYMENT RECEIPT", badgeX + 29, 6.5, { align: "center" })
  setFont("bold", 7.5, 0)
  doc.text(data.receiptNumber, badgeX + 29, 11, { align: "center" })
  setFont("normal", 6, 100)
  doc.text(data.receiptDate, badgeX + 29, 14.5, { align: "center" })

  y = 22

  // ─── AMOUNT HERO STRIP ────────────────────────────────────────────────────
  doc.setFillColor(248, 248, 248)
  doc.rect(0, y, pageWidth, 16, "F")
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(0, y, pageWidth, y)

  setFont("bold", 6.5, 120)
  doc.text("AMOUNT RECEIVED", ml, y + 4.5)
  setFont("bold", 14, 0)
  doc.text(formatINR(data.paymentAmount), ml, y + 11)
  
  // Amount in words on next line
  setFont("normal", 6.5, 100)
  doc.text(data.paymentAmountWords, ml, y + 14.5)

  // Mode pill - white background
  const modeW = 28
  const modeX = pageWidth - mr - modeW
  doc.setFillColor(240, 240, 240)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(modeX, y + 3.5, modeW, 8, 1.5, 1.5, "FD")
  setFont("bold", 7, 0)
  doc.text(data.paymentMode.toUpperCase(), modeX + modeW / 2, y + 9, { align: "center" })

  y += 17
  doc.setFillColor(210, 210, 210)
  doc.rect(0, y, pageWidth, 0.3, "F")
  y += 5

  // ─── 3-COLUMN INFO GRID ───────────────────────────────────────────────────
  const col = cw / 3
  const c1 = ml
  const c2 = ml + col + 3
  const c3 = ml + col * 2 + 6
  const colInnerW = col - 6

  const sectionLabel = (label: string, x: number, sy: number) => {
    setFont("bold", 6, 130)
    doc.text(label, x, sy)
    doc.setLineWidth(0.15)
    doc.setDrawColor(200, 200, 200)
    doc.line(x, sy + 1, x + col - 4, sy + 1)
  }

  const gridY = y
  let lh1 = 0, lh2 = 0, lh3 = 0

  // Col 1 — Customer
  sectionLabel("CUSTOMER", c1, gridY)
  lh1 += 4
  lh1 += infoRow("NAME", data.customerName, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("PHONE", data.customerPhone, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("PAN", data.customerPan, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("ADDRESS", data.customerAddress, c1, gridY + lh1, colInnerW)

  // Col 2 — Property
  sectionLabel("PROPERTY", c2, gridY)
  lh2 += 4
  lh2 += infoRow("PROJECT", data.projectName, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("UNIT", data.flatNumber, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("FLOOR", data.floorNumber, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("CARPET AREA", data.carpetArea, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("RATE / SQFT", data.ratePerSqft, c2, gridY + lh2, colInnerW)

  // Col 3 — Transaction
  sectionLabel("TRANSACTION", c3, gridY)
  lh3 += 4
  lh3 += infoRow("DATE", data.receiptDate, c3, gridY + lh3, colInnerW)
  lh3 += infoRow("MODE", data.paymentMode, c3, gridY + lh3, colInnerW)
  lh3 += infoRow("REFERENCE", data.referenceNumber || "—", c3, gridY + lh3, colInnerW)
  lh3 += infoRow("NOTE", data.note, c3, gridY + lh3, colInnerW)

  const maxLH = Math.max(lh1, lh2, lh3) + 2

  // Vertical dividers
  doc.setDrawColor(215, 215, 215)
  doc.setLineWidth(0.15)
  doc.line(c2 - 2, gridY - 1, c2 - 2, gridY + maxLH)
  doc.line(c3 - 2, gridY - 1, c3 - 2, gridY + maxLH)

  y = gridY + maxLH + 4

  // ─── ACCOUNT SUMMARY TILES ────────────────────────────────────────────────
  doc.setFillColor(210, 210, 210)
  doc.rect(ml, y, cw, 0.3, "F")
  y += 4

  setFont("bold", 6.5, 100)
  doc.text("ACCOUNT POSITION", ml, y)
  y += 4

  const tileW = (cw - 4) / 3
  const tileH = 14

  ;[
    { label: "AGREEMENT VALUE", value: formatINR(data.agreementValue), dark: false },
    { label: "TOTAL COLLECTED", value: formatINR(data.totalCollected), dark: false },
    { label: "BALANCE DUE", value: formatINR(data.balanceDue), dark: false },
  ].forEach((tile, i) => {
    const tx = ml + i * (tileW + 2)
    doc.setFillColor(245, 245, 245)
    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.2)
    doc.roundedRect(tx, y, tileW, tileH, 1, 1, "FD")
    setFont("bold", 6, 120)
    doc.text(tile.label, tx + 3, y + 4.5)
    setFont("bold", 9, 0)
    doc.text(tile.value, tx + 3, y + 11)
  })

  y += tileH + 5

  // ─── AGREEMENT LINE ITEMS ─────────────────────────────────────────────────
  if (data.agreementLines && data.agreementLines.length > 0) {
    doc.setFillColor(210, 210, 210)
    doc.rect(ml, y, cw, 0.3, "F")
    y += 4

    setFont("bold", 6.5, 100)
    doc.text("AGREEMENT LINE ITEMS", ml, y)
    y += 4

    doc.setFillColor(30, 30, 30)
    doc.rect(ml, y, cw, 6, "F")
    setFont("bold", 6, 200)
    doc.text("DATE", ml + 2, y + 4)
    doc.text("TYPE", ml + 28, y + 4)
    doc.text("PARTICULARS", ml + 52, y + 4)
    doc.text("P&L", ml + 122, y + 4)
    doc.text("AMOUNT", pageWidth - mr - 2, y + 4, { align: "right" })
    y += 6

    data.agreementLines.forEach((line, idx) => {
      if (y > pageHeight - 30) {
        doc.addPage()
        y = 15
        doc.setFillColor(30, 30, 30)
        doc.rect(ml, y, cw, 6, "F")
        setFont("bold", 6, 200)
        doc.text("DATE", ml + 2, y + 4)
        doc.text("TYPE", ml + 28, y + 4)
        doc.text("PARTICULARS", ml + 52, y + 4)
        doc.text("P&L", ml + 122, y + 4)
        doc.text("AMOUNT", pageWidth - mr - 2, y + 4, { align: "right" })
        y += 6
      }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(ml, y, cw, 5.5, "F")
      }

      setFont("normal", 6.5, 40)
      doc.text(line.createdAt.substring(0, 11), ml + 2, y + 3.8)
      doc.text(line.type.substring(0, 12), ml + 28, y + 3.8)
      doc.text(line.label.substring(0, 38), ml + 52, y + 3.8)
      doc.text(line.affectsProfit ? "Yes" : "No", ml + 122, y + 3.8)
      setFont("normal", 6.5, 0)
      doc.text(formatSignedINR(line.signedAmount), pageWidth - mr - 2, y + 3.8, { align: "right" })

      doc.setDrawColor(235, 235, 235)
      doc.setLineWidth(0.1)
      doc.line(ml, y + 5.5, pageWidth - mr, y + 5.5)
      y += 5.5
    })

    y += 3
  }

  // ─── SIGNATURE + FOOTER ───────────────────────────────────────────────────
  y += 5
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(ml, y, ml + 45, y)
  doc.line(pageWidth - mr - 45, y, pageWidth - mr, y)
  setFont("normal", 6.5, 140)
  doc.text("Customer Signature", ml, y + 4)
  doc.text("Authorised Signatory", pageWidth - mr, y + 4, { align: "right" })

  doc.setFillColor(255, 255, 255)
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F")
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(0, pageHeight - 8, pageWidth, pageHeight - 8)
  setFont("normal", 6, 100)
  doc.text(
    `Generated on ${data.postedAt}  •  ${data.receiptNumber}`,
    pageWidth / 2,
    pageHeight - 3,
    { align: "center" }
  )

  doc.save(filename)
}

export async function downloadReceiptPDF(
  customerId: string,
  paymentId: string,
  customer: any,
  payment: any,
  agreement: any,
  siteData: any,
  companyData: any
): Promise<void> {
  try {
    // Helper functions for data transformation
    const formatShortDate = (iso?: string | null): string => {
      if (!iso) return "-"
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return "-"
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    }

    const formatDateTime = (iso?: string | null): string => {
      if (!iso) return "-"
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return "-"
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    }

    const getPaymentModeLabel = (mode?: string | null): string => {
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

    const getAgreementTypeLabel = (type: string): string => {
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

    const buildReceiptNumber = (paymentId: string, postedAt: string): string => {
      const dateToken = postedAt.slice(2, 10).replace(/-/g, "")
      const paymentToken = paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()
      return `RCP-${dateToken}-${paymentToken}`
    }

    const sanitizeFilename = (value: string): string => {
      return value.trim().replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "document"
    }

    const convertToIndianWords = (num: number): string => {
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

    // Calculate cumulative paid and balance
    const agreementValue = agreement?.totalValue || 0
    const payments = agreement?.payments || []
    
    // Sort payments by date
    const sortedPayments = [...payments].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      if (aTime !== bTime) return aTime - bTime
      return a.id.localeCompare(b.id)
    })

    // Calculate cumulative paid up to this payment
    let cumulativePaid = 0
    for (const p of sortedPayments) {
      cumulativePaid += p.amount
      if (p.id === paymentId) break
    }

    const balanceDue = Math.max(agreementValue - cumulativePaid, 0)

    // Build receipt number and amount in words
    const receiptNumber = buildReceiptNumber(paymentId, payment.createdAt)
    const paymentAmountWords = convertToIndianWords(payment.amount)

    // Build ReceiptData object
    const receiptData: ReceiptData = {
      receiptNumber,
      receiptDate: formatShortDate(payment.createdAt),
      postedAt: formatDateTime(payment.createdAt),
      paymentMode: getPaymentModeLabel(payment.paymentMode),
      paymentAmount: payment.amount,
      paymentAmountWords,
      referenceNumber: payment.referenceNumber || undefined,
      note: payment.note || undefined,

      companyName: companyData?.name || "Company Name",

      customerName: customer.name || "Customer Name",
      customerPhone: customer.phone || undefined,
      customerAddress: customer.address || undefined,
      customerPan: customer.pan || undefined,

      projectName: siteData?.name || "Project Name",
      siteAddress: siteData?.address || undefined,
      flatNumber: agreement?.flatNumber || undefined,
      floorNumber: agreement?.floorNumber || undefined,
      carpetArea: agreement?.carpetArea || undefined,
      ratePerSqft: agreement?.ratePerSqft || undefined,

      agreementValue,
      totalCollected: cumulativePaid,
      balanceDue,

      agreementLines: (agreement?.lines || []).map((row: any) => ({
        type: getAgreementTypeLabel(row.type),
        label: row.label,
        affectsProfit: row.affectsProfit,
        signedAmount: row.signedAmount,
        createdAt: formatShortDate(row.createdAt),
      })),
    }

    // Generate filename with sanitization
    const filename = `Receipt-${sanitizeFilename(customer.name || "Customer")}-${sanitizeFilename(receiptNumber)}.pdf`

    // Call existing generateReceiptPDF function
    await generateReceiptPDF(receiptData, filename)
  } catch (error) {
    console.error("Error generating receipt PDF:", error)
    throw new Error("Failed to generate receipt PDF")
  }
}

export async function generateStatementPDF(data: StatementData, filename: string) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF("p", "mm", "a4")

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const ml = 15
  const mr = 15
  const cw = pageWidth - ml - mr
  let y = 0

  const setFont = (style: "bold" | "normal" | "italic", size: number, color: number = 0) => {
    doc.setFont("helvetica", style)
    doc.setFontSize(size)
    doc.setTextColor(color, color, color)
  }

  // ─── HEADER ───────────────────────────────────────────────────────────────
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, 18, "F")
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(0, 18, pageWidth, 18)

  setFont("bold", 13, 0)
  doc.text(data.companyName.toUpperCase(), ml, 7)
  setFont("normal", 7.5, 60)
  doc.text(data.projectName, ml, 12)
  if (data.siteAddress) {
    setFont("normal", 6.5, 100)
    doc.text(doc.splitTextToSize(data.siteAddress, 100)[0], ml, 16)
  }

  const badgeX = pageWidth - mr - 62
  doc.setFillColor(245, 245, 245)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(badgeX, 2, 62, 14, 1, 1, "FD")
  setFont("bold", 6.5, 80)
  doc.text("STATEMENT OF ACCOUNT", badgeX + 31, 7, { align: "center" })
  setFont("normal", 6.5, 100)
  doc.text(`As of ${data.generatedAt}`, badgeX + 31, 12, { align: "center" })

  y = 22

  // ─── SUMMARY TILES ────────────────────────────────────────────────────────
  const tileW = (cw - 4) / 3
  const tileH = 14

  ;[
    { label: "AGREEMENT VALUE", value: formatINR(data.agreementValue), dark: false },
    { label: "TOTAL RECEIVED", value: formatINR(data.totalReceived), dark: false },
    { label: "OUTSTANDING", value: formatINR(data.outstanding), dark: true },
  ].forEach((tile, i) => {
    const tx = ml + i * (tileW + 2)
    doc.setFillColor(245, 245, 245)
    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.2)
    doc.roundedRect(tx, y, tileW, tileH, 1, 1, "FD")
    setFont("bold", 6, 120)
    doc.text(tile.label, tx + 3, y + 4.5)
    setFont("bold", 9, 0)
    doc.text(tile.value, tx + 3, y + 11)
  })

  y += tileH + 4

  // ─── CUSTOMER + PROPERTY ROW ──────────────────────────────────────────────
  const halfW = (cw - 3) / 2

  doc.setFillColor(248, 248, 248)
  doc.setDrawColor(210, 210, 210)
  doc.setLineWidth(0.2)
  doc.roundedRect(ml, y, halfW, 20, 1, 1, "FD")
  doc.roundedRect(ml + halfW + 3, y, halfW, 20, 1, 1, "FD")

  setFont("bold", 6, 130)
  doc.text("CUSTOMER", ml + 3, y + 4)
  setFont("bold", 8, 0)
  doc.text(data.customerName, ml + 3, y + 9)
  setFont("normal", 7, 80)
  if (data.customerPhone) doc.text(`Ph: ${data.customerPhone}`, ml + 3, y + 14)
  if (data.customerPan) doc.text(`PAN: ${data.customerPan}`, ml + 3, y + 18)

  const px = ml + halfW + 6
  setFont("bold", 6, 130)
  doc.text("PROPERTY", px, y + 4)
  setFont("bold", 8, 0)
  doc.text(data.projectName, px, y + 9)
  setFont("normal", 7, 80)
  const propDetails = [
    data.flatNumber && `Unit: ${data.flatNumber}`,
    data.floorNumber && `Floor: ${data.floorNumber}`,
    data.carpetArea && `Area: ${data.carpetArea}`,
  ].filter(Boolean).join("  •  ")
  if (propDetails) doc.text(propDetails, px, y + 14)

  y += 24

  // ─── PAYMENT LEDGER TABLE ─────────────────────────────────────────────────
  setFont("bold", 6.5, 100)
  doc.text("PAYMENT LEDGER", ml, y)
  y += 4

  const lcols = {
    date: ml + 2,
    mode: ml + 28,
    ref: ml + 50,
    note: ml + 75,
    amt: ml + 105,
    total: ml + 132,
    bal: pageWidth - mr - 2,
  }

  const drawLedgerHeader = () => {
    doc.setFillColor(30, 30, 30)
    doc.rect(ml, y, cw, 6, "F")
    setFont("bold", 6, 200)
    doc.text("DATE", lcols.date, y + 4)
    doc.text("MODE", lcols.mode, y + 4)
    doc.text("REFERENCE", lcols.ref, y + 4)
    doc.text("NOTE", lcols.note, y + 4)
    doc.text("AMOUNT", lcols.amt, y + 4)
    doc.text("CUMULATIVE", lcols.total, y + 4)
    doc.text("BALANCE", lcols.bal, y + 4, { align: "right" })
    y += 6
  }

  drawLedgerHeader()

  data.payments.forEach((p, idx) => {
    if (y > pageHeight - 30) {
      doc.addPage()
      y = 15
      drawLedgerHeader()
    }

    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(ml, y, cw, 5.5, "F")
    }

    setFont("normal", 6.5, 40)
    doc.text(p.date.substring(0, 11), lcols.date, y + 3.8)
    doc.text(p.mode.substring(0, 10), lcols.mode, y + 3.8)
    doc.text((p.reference || "—").substring(0, 12), lcols.ref, y + 3.8)
    doc.text((p.note || "—").substring(0, 14), lcols.note, y + 3.8)
    setFont("normal", 6.5, 0)
    doc.text(formatINR(p.amount), lcols.amt, y + 3.8)
    doc.text(formatINR(p.cumulativePaid), lcols.total, y + 3.8)
    doc.text(formatINR(p.balance), lcols.bal, y + 3.8, { align: "right" })

    doc.setDrawColor(235, 235, 235)
    doc.setLineWidth(0.1)
    doc.line(ml, y + 5.5, pageWidth - mr, y + 5.5)
    y += 5.5
  })

  y += 4

  // ─── AGREEMENT LINE ITEMS ─────────────────────────────────────────────────
  if (data.agreementLines && data.agreementLines.length > 0 && y < pageHeight - 40) {
    doc.setFillColor(210, 210, 210)
    doc.rect(ml, y, cw, 0.3, "F")
    y += 4

    setFont("bold", 6.5, 100)
    doc.text("AGREEMENT LINE ITEMS", ml, y)
    y += 4

    doc.setFillColor(30, 30, 30)
    doc.rect(ml, y, cw, 6, "F")
    setFont("bold", 6, 200)
    doc.text("DATE", ml + 2, y + 4)
    doc.text("TYPE", ml + 28, y + 4)
    doc.text("PARTICULARS", ml + 52, y + 4)
    doc.text("AMOUNT", pageWidth - mr - 2, y + 4, { align: "right" })
    y += 6

    data.agreementLines.forEach((line, idx) => {
      if (y > pageHeight - 30) return

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(ml, y, cw, 5.5, "F")
      }

      setFont("normal", 6.5, 40)
      doc.text(line.createdAt.substring(0, 11), ml + 2, y + 3.8)
      doc.text(line.type.substring(0, 12), ml + 28, y + 3.8)
      doc.text(line.label.substring(0, 45), ml + 52, y + 3.8)
      setFont("normal", 6.5, 0)
      doc.text(formatSignedINR(line.signedAmount), pageWidth - mr - 2, y + 3.8, { align: "right" })

      doc.setDrawColor(235, 235, 235)
      doc.setLineWidth(0.1)
      doc.line(ml, y + 5.5, pageWidth - mr, y + 5.5)
      y += 5.5
    })
  }

  // ─── FOOTER ───────────────────────────────────────────────────────────────
  doc.setFillColor(255, 255, 255)
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F")
  doc.setDrawColor(235, 235, 235)
  doc.setLineWidth(0.5)
  doc.line(ml, pageHeight - 8, pageWidth - mr, pageHeight - 8)
  setFont("normal", 6, 100)
  doc.text(
    `Generated on ${data.generatedAt}  •  ${data.companyName}`,
    pageWidth / 2,
    pageHeight - 3,
    { align: "center" }
  )

  doc.save(filename)
}

export async function downloadStatementPDF(
  customerId: string,
  customer: any,
  payments: any[],
  agreement: any,
  siteData: any,
  companyData: any
): Promise<void> {
  try {
    // Helper functions for data transformation
    const formatShortDate = (iso?: string | null): string => {
      if (!iso) return "-"
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return "-"
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    }

    const formatDateTime = (iso?: string | null): string => {
      if (!iso) return "-"
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return "-"
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    }

    const getPaymentModeLabel = (mode?: string | null): string => {
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

    const getAgreementTypeLabel = (type: string): string => {
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

    const sanitizeFilename = (value: string): string => {
      return value.trim().replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "document"
    }

    // Calculate agreement value and totals
    const agreementValue = agreement?.totalValue || 0
    
    // Sort payments by date
    const sortedPayments = [...payments].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      if (aTime !== bTime) return aTime - bTime
      return a.id.localeCompare(b.id)
    })

    // Calculate cumulative paid and balance for each payment
    let cumulativePaid = 0
    const paymentHistory = sortedPayments.map((p) => {
      cumulativePaid += p.amount
      const balance = Math.max(agreementValue - cumulativePaid, 0)
      
      return {
        date: formatShortDate(p.createdAt),
        mode: getPaymentModeLabel(p.paymentMode),
        reference: p.referenceNumber || undefined,
        note: p.note || undefined,
        amount: p.amount,
        cumulativePaid,
        balance,
      }
    })

    const totalReceived = cumulativePaid
    const outstanding = Math.max(agreementValue - totalReceived, 0)

    // Build StatementData object
    const statementData: StatementData = {
      generatedAt: formatDateTime(new Date().toISOString()),

      companyName: companyData?.name || "Company Name",

      customerName: customer.name || "Customer Name",
      customerPhone: customer.phone || undefined,
      customerAddress: customer.address || undefined,
      customerPan: customer.pan || undefined,

      projectName: siteData?.name || "Project Name",
      siteAddress: siteData?.address || undefined,
      flatNumber: agreement?.flatNumber || undefined,
      floorNumber: agreement?.floorNumber || undefined,
      carpetArea: agreement?.carpetArea || undefined,
      ratePerSqft: agreement?.ratePerSqft || undefined,

      agreementValue,
      totalReceived,
      outstanding,

      payments: paymentHistory,

      agreementLines: (agreement?.lines || []).map((row: any) => ({
        type: getAgreementTypeLabel(row.type),
        label: row.label,
        affectsProfit: row.affectsProfit,
        signedAmount: row.signedAmount,
        createdAt: formatShortDate(row.createdAt),
      })),
    }

    // Generate filename with sanitization
    const now = new Date()
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).replace(":", "")
    const currentDate = `${formatShortDate(now.toISOString()).replace(/\s+/g, "-")}-${timeStr}`
    const filename = `Statement-${sanitizeFilename(customer.name || "Customer")}-${sanitizeFilename(currentDate)}.pdf`

    // Call existing generateStatementPDF function
    await generateStatementPDF(statementData, filename)
  } catch (error) {
    console.error("Error generating statement PDF:", error)
    throw new Error("Failed to generate statement PDF")
  }
}
