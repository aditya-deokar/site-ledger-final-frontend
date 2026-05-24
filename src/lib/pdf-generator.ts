import type { jsPDF } from "jspdf"
import { resolveCompanyLogoUrl } from "@/lib/company-logo"

export interface ReceiptData {
  receiptNumber: string
  receiptDate: string
  postedAt: string
  status?: string
  paymentMode: string
  paymentAmount: number
  paymentAmountWords: string
  referenceNumber?: string
  note?: string

  companyName: string
  companyLogoUrl?: string
  companyAddress?: string
  companySupportContact?: string
  companyGstin?: string
  companyPan?: string
  companyReraNumber?: string

  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerType?: string
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
  companyLogoUrl?: string
  companyAddress?: string
  companySupportContact?: string
  companyGstin?: string
  companyPan?: string
  companyReraNumber?: string

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

function getAgreementPayableTotal(agreement: any, fallback: number = 0) {
  return agreement?.totals?.payableTotal ?? agreement?.totalValue ?? fallback
}

function getSignedPaymentAmount(payment: any) {
  const amount = Number(payment?.amount || 0)
  return payment?.direction === "OUT" ? -amount : amount
}

async function loadImageAsPngDataUrl(imageUrl?: string) {
  if (!imageUrl || typeof window === "undefined") return null

  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = objectUrl
      })

      const canvas = document.createElement("canvas")
      canvas.width = image.naturalWidth || image.width
      canvas.height = image.naturalHeight || image.height
      const context = canvas.getContext("2d")
      if (!context) return null

      context.drawImage(image, 0, 0)
      return canvas.toDataURL("image/png")
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch {
    return null
  }
}

type PdfColor = [number, number, number]

type ReceiptDetailEntry = {
  label: string
  value?: string | null
}

type ReceiptDetailSection = {
  title: string
  entries: ReceiptDetailEntry[]
}

type ReceiptMetric = {
  label: string
  value: string
  hint?: string
}

type ReceiptTableColumn<T> = {
  header: string
  width: number
  align?: "left" | "right"
  value: (row: T) => string
}

type ReceiptTableConfig<T> = {
  title: string
  subtitle?: string
  rows: T[]
  columns: ReceiptTableColumn<T>[]
}

type ProfessionalReceiptConfig<T> = {
  accent: PdfColor
  accentSoft: PdfColor
  kindLabel: string
  headline: string
  receiptNumber: string
  receiptDate: string
  status?: string
  companyName: string
  companyLines: string[]
  companyLogoDataUrl?: string | null
  narration: string
  amountLabel: string
  amount: number
  amountWords: string
  metaItems: Array<{ label: string; value?: string | null }>
  sections: ReceiptDetailSection[]
  metrics: ReceiptMetric[]
  table?: ReceiptTableConfig<T>
  notes?: string
  supportingNote: string
  signatureLeft: string
  signatureRight: string
  footerContext?: string
}

function formatShortDate(iso?: string | null): string {
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

function formatDateTime(iso?: string | null): string {
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

function getPaymentModeLabel(mode?: string | null): string {
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

function sanitizeFilename(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "document"
}

function setPdfFont(doc: jsPDF, style: "bold" | "normal" | "italic", size: number, color: PdfColor = [15, 23, 42]) {
  doc.setFont("helvetica", style)
  doc.setFontSize(size)
  doc.setTextColor(color[0], color[1], color[2])
}

function splitPdfText(doc: jsPDF, text: string, maxWidth: number) {
  return doc.splitTextToSize(text, Math.max(maxWidth, 12)) as string[]
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: {
    style?: "bold" | "normal" | "italic"
    size?: number
    color?: PdfColor
    lineHeight?: number
    align?: "left" | "right" | "center"
  } = {},
) {
  const lines = splitPdfText(doc, text, maxWidth)
  const lineHeight = options.lineHeight ?? 3.8
  setPdfFont(doc, options.style ?? "normal", options.size ?? 8, options.color ?? [15, 23, 42])
  doc.text(lines, x, y, options.align ? { align: options.align } : undefined)
  return lines.length * lineHeight
}

function measureEntryHeight(doc: jsPDF, value: string, maxWidth: number) {
  return splitPdfText(doc, value, maxWidth).length * 3.8 + 5.5
}

function buildStatusColors(status?: string) {
  if (status === "VOIDED") {
    return {
      fill: [254, 242, 242] as PdfColor,
      text: [185, 28, 28] as PdfColor,
      border: [252, 165, 165] as PdfColor,
    }
  }

  return {
    fill: [240, 253, 244] as PdfColor,
    text: [21, 128, 61] as PdfColor,
    border: [134, 239, 172] as PdfColor,
  }
}

function drawReceiptFooter(doc: jsPDF, receiptNumber: string, generatedAt: string, context?: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageCount = doc.getNumberOfPages()

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.25)
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11)

    setPdfFont(doc, "normal", 6.5, [100, 116, 139])
    doc.text(`Generated on ${generatedAt}`, 14, pageHeight - 6.5)
    doc.text(receiptNumber, pageWidth / 2, pageHeight - 6.5, { align: "center" })
    doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - 14, pageHeight - 6.5, { align: "right" })

    if (context) {
      setPdfFont(doc, "normal", 5.5, [148, 163, 184])
      doc.text(context, pageWidth / 2, pageHeight - 3, { align: "center" })
    }
  }
}

function renderProfessionalReceiptPDF<T>(doc: jsPDF, config: ProfessionalReceiptConfig<T>) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const ml = 14
  const mr = 14
  const cw = pageWidth - ml - mr
  const footerReserve = 18
  const bodyBottom = pageHeight - footerReserve
  const muted = [100, 116, 139] as PdfColor
  const border = [203, 213, 225] as PdfColor
  let y = 0

  const ensureSpace = (requiredHeight: number, continuationLabel?: string) => {
    if (y + requiredHeight <= bodyBottom) return
    doc.addPage()
    y = 18
    if (continuationLabel) {
      setPdfFont(doc, "bold", 10, config.accent)
      doc.text(continuationLabel, ml, y)
      y += 6
      setPdfFont(doc, "normal", 7, muted)
      doc.text(`${config.kindLabel} | ${config.receiptNumber}`, ml, y)
      y += 7
    }
  }

  const drawSectionBlock = (section: ReceiptDetailSection, x: number, top: number, width: number, height: number) => {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(border[0], border[1], border[2])
    doc.setLineWidth(0.25)
    doc.roundedRect(x, top, width, height, 2.2, 2.2, "FD")

    doc.setFillColor(config.accentSoft[0], config.accentSoft[1], config.accentSoft[2])
    doc.roundedRect(x + 2, top + 2, width - 4, 7, 1.4, 1.4, "F")
    setPdfFont(doc, "bold", 8, config.accent)
    doc.text(section.title.toUpperCase(), x + 5, top + 7)

    let innerY = top + 13.5
    for (const entry of section.entries) {
      if (!entry.value) continue
      setPdfFont(doc, "bold", 6.2, muted)
      doc.text(entry.label.toUpperCase(), x + 5, innerY)
      innerY += 3.8
      const lines = splitPdfText(doc, entry.value, width - 10)
      setPdfFont(doc, "normal", 8, [15, 23, 42])
      doc.text(lines, x + 5, innerY)
      innerY += lines.length * 3.8 + 1.7
    }
  }

  const drawMetricBlock = (metric: ReceiptMetric, x: number, top: number, width: number) => {
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(border[0], border[1], border[2])
    doc.setLineWidth(0.25)
    doc.roundedRect(x, top, width, 18, 2, 2, "FD")
    setPdfFont(doc, "bold", 6.4, muted)
    doc.text(metric.label.toUpperCase(), x + 4, top + 5.2)
    setPdfFont(doc, "bold", 10.5, [15, 23, 42])
    doc.text(metric.value, x + 4, top + 11.7)
    if (metric.hint) {
      setPdfFont(doc, "normal", 6.2, muted)
      doc.text(metric.hint, x + 4, top + 15.8)
    }
  }

  const drawTable = (table: ReceiptTableConfig<T>) => {
    ensureSpace(18, `${table.title} (continued)`)
    setPdfFont(doc, "bold", 9.2, [15, 23, 42])
    doc.text(table.title, ml, y)
    y += 4.8

    if (table.subtitle) {
      setPdfFont(doc, "normal", 7.2, muted)
      doc.text(splitPdfText(doc, table.subtitle, cw), ml, y)
      y += splitPdfText(doc, table.subtitle, cw).length * 3.4 + 2
    }

    const tableX = ml
    const tableWidth = cw
    const drawHeader = () => {
      doc.setFillColor(config.accent[0], config.accent[1], config.accent[2])
      doc.roundedRect(tableX, y, tableWidth, 8, 1.6, 1.6, "F")

      let cursorX = tableX + 3
      table.columns.forEach((column) => {
        const columnWidth = (column.width / 100) * tableWidth
        setPdfFont(doc, "bold", 6.7, [255, 255, 255])
        doc.text(column.header.toUpperCase(), column.align === "right" ? cursorX + columnWidth - 3 : cursorX, y + 5.2, column.align === "right" ? { align: "right" } : undefined)
        cursorX += columnWidth
      })
      y += 10
    }

    drawHeader()

    table.rows.forEach((row, index) => {
      const rowValues = table.columns.map((column) => column.value(row) || "-")
      const rowHeights = rowValues.map((value, columnIndex) => {
        const columnWidth = (table.columns[columnIndex].width / 100) * tableWidth
        return splitPdfText(doc, value, columnWidth - 6).length * 3.6 + 4
      })
      const rowHeight = Math.max(8, ...rowHeights)

      if (y + rowHeight > bodyBottom) {
        ensureSpace(rowHeight + 12, `${table.title} (continued)`)
        drawHeader()
      }

      doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252)
      doc.setDrawColor(226, 232, 240)
      doc.rect(tableX, y - 2, tableWidth, rowHeight, "FD")

      let cursorX = tableX + 3
      rowValues.forEach((value, columnIndex) => {
        const column = table.columns[columnIndex]
        const columnWidth = (column.width / 100) * tableWidth
        const lines = splitPdfText(doc, value, columnWidth - 6)
        setPdfFont(doc, "normal", 7.2, [15, 23, 42])
        doc.text(lines, column.align === "right" ? cursorX + columnWidth - 3 : cursorX, y + 2.8, column.align === "right" ? { align: "right" } : undefined)
        cursorX += columnWidth
      })

      y += rowHeight
    })

    y += 4
  }

  const companyLines = config.companyLines.filter(Boolean)
  const headerHeight = 40 + Math.max(0, companyLines.length - 1) * 4
  doc.setFillColor(config.accentSoft[0], config.accentSoft[1], config.accentSoft[2])
  doc.rect(0, 0, pageWidth, headerHeight, "F")
  doc.setFillColor(config.accent[0], config.accent[1], config.accent[2])
  doc.rect(0, 0, pageWidth, 5, "F")

  const logoSize = config.companyLogoDataUrl ? 24 : 0
  const logoX = ml
  const logoY = 10
  const textX = config.companyLogoDataUrl ? logoX + logoSize + 5 : ml
  const badgeWidth = 58
  const badgeX = pageWidth - mr - badgeWidth

  if (config.companyLogoDataUrl) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(border[0], border[1], border[2])
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 2.4, 2.4, "FD")
    doc.addImage(config.companyLogoDataUrl, "PNG", logoX + 1.5, logoY + 1.5, logoSize - 3, logoSize - 3, undefined, "FAST")
  }

  setPdfFont(doc, "bold", 9.2, config.accent)
  doc.text(config.kindLabel.toUpperCase(), textX, logoY + 3)
  setPdfFont(doc, "bold", 18, [15, 23, 42])
  doc.text(config.companyName, textX, logoY + 11)

  let companyY = logoY + 16
  companyLines.forEach((line, index) => {
    setPdfFont(doc, "normal", index === 0 ? 8 : 7.2, index === 0 ? [51, 65, 85] : muted)
    doc.text(splitPdfText(doc, line, badgeX - textX - 8), textX, companyY)
    companyY += 4
  })

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(border[0], border[1], border[2])
  doc.roundedRect(badgeX, 10, badgeWidth, 25, 2.4, 2.4, "FD")
  setPdfFont(doc, "bold", 6.8, muted)
  doc.text("Receipt No.", badgeX + 4, 16)
  setPdfFont(doc, "bold", 10.8, [15, 23, 42])
  doc.text(config.receiptNumber, badgeX + 4, 22)
  setPdfFont(doc, "normal", 6.8, muted)
  doc.text(`Date: ${config.receiptDate}`, badgeX + 4, 27)

  if (config.status) {
    const statusColors = buildStatusColors(config.status)
    doc.setFillColor(statusColors.fill[0], statusColors.fill[1], statusColors.fill[2])
    doc.setDrawColor(statusColors.border[0], statusColors.border[1], statusColors.border[2])
    doc.roundedRect(badgeX + 4, 29.2, 22, 4.6, 1.4, 1.4, "FD")
    setPdfFont(doc, "bold", 6, statusColors.text)
    doc.text(config.status.toUpperCase(), badgeX + 15, 32.4, { align: "center" })
  }

  y = headerHeight + 8

  const heroHeight = 30
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(border[0], border[1], border[2])
  doc.roundedRect(ml, y, cw, heroHeight, 2.8, 2.8, "FD")
  doc.setFillColor(config.accent[0], config.accent[1], config.accent[2])
  doc.roundedRect(ml, y, 4, heroHeight, 2.8, 2.8, "F")

  setPdfFont(doc, "bold", 7.2, config.accent)
  doc.text(config.headline.toUpperCase(), ml + 8, y + 5.5)
  const narrationHeight = drawWrappedText(doc, config.narration, ml + 8, y + 10.2, cw - 66, {
    size: 8.4,
    color: [30, 41, 59],
    lineHeight: 4.1,
  })

  const metaText = config.metaItems
    .filter((item) => item.value)
    .map((item) => `${item.label}: ${item.value}`)
    .join(" | ")
  if (metaText) {
    drawWrappedText(doc, metaText, ml + 8, y + 11.2 + narrationHeight, cw - 66, {
      size: 7,
      color: muted,
      lineHeight: 3.4,
    })
  }

  doc.setFillColor(config.accentSoft[0], config.accentSoft[1], config.accentSoft[2])
  doc.roundedRect(pageWidth - mr - 54, y + 4, 50, 22, 2.2, 2.2, "F")
  setPdfFont(doc, "bold", 6.6, muted)
  doc.text(config.amountLabel.toUpperCase(), pageWidth - mr - 50, y + 9)
  setPdfFont(doc, "bold", 13, [15, 23, 42])
  doc.text(formatINR(config.amount), pageWidth - mr - 50, y + 15)
  drawWrappedText(doc, config.amountWords, pageWidth - mr - 50, y + 19.3, 44, {
    size: 6.2,
    color: muted,
    lineHeight: 3,
  })

  y += heroHeight + 7

  const sectionGap = 4
  const sectionWidth = (cw - sectionGap * (config.sections.length - 1)) / config.sections.length
  const sectionHeights = config.sections.map((section) =>
    section.entries.reduce((height, entry) => {
      if (!entry.value) return height
      return height + measureEntryHeight(doc, entry.value, sectionWidth - 10)
    }, 15),
  )
  const sectionHeight = Math.max(...sectionHeights, 28)

  ensureSpace(sectionHeight + 4)
  config.sections.forEach((section, index) => {
    drawSectionBlock(section, ml + index * (sectionWidth + sectionGap), y, sectionWidth, sectionHeight)
  })
  y += sectionHeight + 6

  const metricGap = 4
  const metricWidth = (cw - metricGap * (config.metrics.length - 1)) / config.metrics.length
  ensureSpace(22)
  config.metrics.forEach((metric, index) => {
    drawMetricBlock(metric, ml + index * (metricWidth + metricGap), y, metricWidth)
  })
  y += 24

  if (config.table && config.table.rows.length > 0) {
    drawTable(config.table)
  }

  if (config.notes) {
    const noteHeight = splitPdfText(doc, config.notes, cw - 10).length * 3.8 + 13
    ensureSpace(noteHeight)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(border[0], border[1], border[2])
    doc.roundedRect(ml, y, cw, noteHeight, 2.2, 2.2, "FD")
    setPdfFont(doc, "bold", 7, config.accent)
    doc.text("Notes", ml + 4, y + 5.5)
    drawWrappedText(doc, config.notes, ml + 4, y + 10, cw - 8, {
      size: 7.6,
      color: [51, 65, 85],
      lineHeight: 3.8,
    })
    y += noteHeight + 5
  }

  const supportingHeight = splitPdfText(doc, config.supportingNote, cw - 10).length * 3.4 + 11
  ensureSpace(supportingHeight)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(border[0], border[1], border[2])
  doc.roundedRect(ml, y, cw, supportingHeight, 2, 2, "FD")
  setPdfFont(doc, "normal", 7, muted)
  doc.text(splitPdfText(doc, config.supportingNote, cw - 8), ml + 4, y + 6)
  y += supportingHeight + 9

  ensureSpace(18)
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.3)
  doc.line(ml, y, ml + 48, y)
  doc.line(pageWidth - mr - 48, y, pageWidth - mr, y)
  setPdfFont(doc, "normal", 7, muted)
  doc.text(config.signatureLeft, ml, y + 4.5)
  doc.text(config.signatureRight, pageWidth - mr, y + 4.5, { align: "right" })
}

async function generateLegacyReceiptPDF(data: ReceiptData, filename: string) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF("p", "mm", "a4")
  const companyLogoDataUrl = await loadImageAsPngDataUrl(data.companyLogoUrl)

  const companyLines = [
    data.companyAddress,
    data.companySupportContact ? `Support: ${data.companySupportContact}` : undefined,
    [data.companyGstin ? `GSTIN: ${data.companyGstin}` : null, data.companyPan ? `PAN: ${data.companyPan}` : null, data.companyReraNumber ? `RERA: ${data.companyReraNumber}` : null]
      .filter(Boolean)
      .join(" | "),
  ].filter(Boolean) as string[]

  const propertyLabel = [data.flatNumber, data.floorNumber].filter(Boolean).join(" | ")
  const receiptStatus = data.status ?? "ACTIVE"

  renderProfessionalReceiptPDF(doc, {
    accent: [29, 78, 216],
    accentSoft: [239, 246, 255],
    kindLabel: "Customer Payment Receipt",
    headline: "Payment acknowledged against booking",
    receiptNumber: data.receiptNumber,
    receiptDate: data.receiptDate,
    status: receiptStatus,
    companyName: data.companyName,
    companyLines,
    companyLogoDataUrl,
    narration: `Received from ${data.customerName} towards ${propertyLabel || data.projectName} at ${data.projectName}.`,
    amountLabel: "Amount Received",
    amount: data.paymentAmount,
    amountWords: data.paymentAmountWords,
    metaItems: [
      { label: "Mode", value: data.paymentMode },
      { label: "Reference", value: data.referenceNumber ?? "Not recorded" },
      { label: "Status", value: receiptStatus },
    ],
    sections: [
      {
        title: "Received From",
        entries: [
          { label: "Customer", value: data.customerName },
          { label: "Type", value: data.customerType },
          { label: "Phone", value: data.customerPhone },
          { label: "Email", value: data.customerEmail },
        ],
      },
      {
        title: "Property Context",
        entries: [
          { label: "Project", value: data.projectName },
          { label: "Unit", value: data.flatNumber },
          { label: "Floor", value: data.floorNumber },
          { label: "Site Address", value: data.siteAddress },
          { label: "Carpet Area", value: data.carpetArea },
          { label: "Rate / Sq Ft", value: data.ratePerSqft },
        ],
      },
      {
        title: "Receipt Details",
        entries: [
          { label: "Receipt Date", value: data.receiptDate },
          { label: "Payment Mode", value: data.paymentMode },
          { label: "Reference", value: data.referenceNumber ?? "Not recorded" },
          { label: "Status", value: receiptStatus },
          { label: "Remark", value: data.note },
        ],
      },
    ],
    metrics: [
      { label: "Agreement Value", value: formatINR(data.agreementValue) },
      { label: "Collected Till This Receipt", value: formatINR(data.totalCollected) },
      { label: "Balance Due", value: formatINR(data.balanceDue) },
    ],
    table: {
      title: "Agreement Schedule",
      subtitle: "Commercial components currently attached to this booking.",
      rows: data.agreementLines,
      columns: [
        { header: "Date", width: 18, value: (row) => row.createdAt },
        { header: "Type", width: 18, value: (row) => row.type },
        { header: "Particulars", width: 44, value: (row) => row.label },
        { header: "Amount", width: 20, align: "right", value: (row) => formatSignedINR(row.signedAmount) },
      ],
    },
    notes: data.note,
    supportingNote: "This is a computer-generated acknowledgement of payment captured in the project ledger. Please retain it with the customer agreement and payment reference for future reconciliation.",
    signatureLeft: "Customer Signature",
    signatureRight: "Authorized Signatory",
    footerContext: `${data.companyName} | ${data.projectName}`,
  })

  drawReceiptFooter(doc, data.receiptNumber, data.postedAt, `${data.companyName} | ${data.projectName}`)
  doc.save(filename)
}

export async function generateReceiptPDF(data: ReceiptData, filename: string) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF("p", "mm", "a4")
  const companyLogoDataUrl = await loadImageAsPngDataUrl(data.companyLogoUrl)

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
  const badgeX = pageWidth - mr - 58
  const logoBoxW = 20
  const logoBoxH = 14
  const logoX = ml
  const logoY = 3
  const textStartX = companyLogoDataUrl ? logoX + logoBoxW + 4 : ml
  const headerTextMaxWidth = badgeX - textStartX - 6
  const complianceParts = [
    data.companyGstin ? `GSTIN: ${data.companyGstin}` : null,
    data.companyPan ? `PAN: ${data.companyPan}` : null,
    data.companyReraNumber ? `RERA: ${data.companyReraNumber}` : null,
  ].filter(Boolean) as string[]
  const headerLines = [
    data.projectName,
    data.companyAddress || data.siteAddress,
    data.companySupportContact ? `Support: ${data.companySupportContact}` : undefined,
    complianceParts.length > 0 ? complianceParts.join("  •  ") : undefined,
  ].filter(Boolean) as string[]
  const headerHeight = Math.max(22, 12 + headerLines.length * 4 + 6)
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, headerHeight, "F")
  
  // Add a simple border line at bottom
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(0, headerHeight, pageWidth, headerHeight)

  if (companyLogoDataUrl) {
    doc.setDrawColor(215, 215, 215)
    doc.setLineWidth(0.2)
    doc.roundedRect(logoX, logoY, logoBoxW, logoBoxH, 1, 1, "S")
    doc.addImage(companyLogoDataUrl, "PNG", logoX + 1, logoY + 1, logoBoxW - 2, logoBoxH - 2, undefined, "FAST")
  }

  setFont("bold", 13, 0)
  doc.text(data.companyName.toUpperCase(), textStartX, 7)

  let headerLineY = 12
  headerLines.forEach((line, index) => {
    setFont(index === 0 ? "normal" : "normal", index === 0 ? 7.5 : 6.5, index === 0 ? 60 : 100)
    doc.text(doc.splitTextToSize(line, headerTextMaxWidth)[0], textStartX, headerLineY)
    headerLineY += 4
  })

  // Receipt badge top-right - white background without border
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(badgeX, 2, 58, 14, 1, 1, "F")
  setFont("bold", 6.5, 80)
  doc.text("PAYMENT RECEIPT", badgeX + 29, 6.5, { align: "center" })
  setFont("bold", 7.5, 0)
  doc.text(data.receiptNumber, badgeX + 29, 11, { align: "center" })
  setFont("normal", 6, 100)
  doc.text(data.receiptDate, badgeX + 29, 14.5, { align: "center" })

  y = headerHeight + 4

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
      doc.text(line.label.substring(0, 52), ml + 52, y + 3.8)
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
  y += 2
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(ml, y, ml + 45, y)
  doc.line(pageWidth - mr - 45, y, pageWidth - mr, y)
  setFont("normal", 6.5, 140)
  doc.text("Customer Signature", ml, y + 3.4)
  doc.text("Authorised Signatory", pageWidth - mr, y + 3.4, { align: "right" })

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
  paymentHistory: any[],
  agreement: any,
  siteData: any,
  companyData: any
): Promise<void> {
  try {
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

    // Calculate cumulative paid and balance
    const agreementValue = getAgreementPayableTotal(agreement, customer?.sellingPrice || 0)
    const payments = Array.isArray(paymentHistory) ? paymentHistory : []
    
    // Sort payments by date
    const sortedPayments = [...payments].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      if (aTime !== bTime) return aTime - bTime
      return a.id.localeCompare(b.id)
    })

    // Calculate cumulative paid up to this payment
    let cumulativePaid = 0
    let foundPayment = false
    for (const p of sortedPayments) {
      cumulativePaid += getSignedPaymentAmount(p)
      if (p.id === paymentId) {
        foundPayment = true
        break
      }
    }

    if (!foundPayment && agreement?.amountPaid != null) {
      cumulativePaid = Number(agreement.amountPaid)
    }

    const balanceDue = Math.max(agreementValue - cumulativePaid, 0)

    const unitLabel = customer?.customFlatId || (customer?.flatNumber != null ? `Flat ${customer.flatNumber}` : undefined)
    const floorLabel = customer?.floorName || (customer?.floorNumber != null ? `Floor ${customer.floorNumber}` : undefined)
    const receiptNumber = payment?.receiptNumber || buildReceiptNumber(paymentId, payment.createdAt)
    const receiptStatus = payment?.receiptStatus || "ACTIVE"
    const paymentAmountWords = convertToIndianWords(payment.amount)

    const receiptData: ReceiptData = {
      receiptNumber,
      receiptDate: formatShortDate(payment.createdAt),
      postedAt: formatDateTime(new Date().toISOString()),
      status: receiptStatus,
      paymentMode: getPaymentModeLabel(payment.paymentMode),
      paymentAmount: payment.amount,
      paymentAmountWords,
      referenceNumber: payment.referenceNumber || undefined,
      note: payment.note || undefined,

      companyName: companyData?.name || "Company Name",
      companyLogoUrl:
        companyData?.receiptSettings?.showCompanyLogo !== false && companyData?.logo
          ? (resolveCompanyLogoUrl(companyData.logo) ?? undefined)
          : undefined,
      companyAddress:
        companyData?.receiptSettings?.showCorporateAddress && companyData?.address
          ? companyData.address
          : undefined,
      companySupportContact:
        companyData?.receiptSettings?.showSupportContact && companyData?.phone
          ? companyData.phone
          : undefined,
      companyGstin:
        companyData?.receiptSettings?.showGstin && companyData?.gstin
          ? companyData.gstin
          : undefined,
      companyPan:
        companyData?.receiptSettings?.showPan && companyData?.pan
          ? companyData.pan
          : undefined,
      companyReraNumber:
        companyData?.receiptSettings?.showReraNumber && companyData?.reraNumber
          ? companyData.reraNumber
          : undefined,

      customerName: customer.name || "Customer Name",
      customerPhone: customer.phone || undefined,
      customerEmail: customer.email || undefined,
      customerType: customer.customerType ? String(customer.customerType).replaceAll("_", " ") : undefined,
      customerAddress: customer.address || undefined,
      customerPan: customer.pan || undefined,

      projectName: siteData?.name || "Project Name",
      siteAddress: siteData?.address || undefined,
      flatNumber: unitLabel,
      floorNumber: floorLabel,
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

    const filename = `Receipt-${sanitizeFilename(customer.name || "Customer")}-${sanitizeFilename(receiptNumber)}.pdf`
    await generateReceiptPDF(receiptData, filename)
  } catch (error) {
    console.error("Error generating receipt PDF:", error)
    throw new Error("Failed to generate receipt PDF")
  }
}

export async function generateStatementPDF(data: StatementData, filename: string) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF("p", "mm", "a4")
  const companyLogoDataUrl = await loadImageAsPngDataUrl(data.companyLogoUrl)

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
  const badgeX = pageWidth - mr - 62
  const logoBoxW = 20
  const logoBoxH = 14
  const logoX = ml
  const logoY = 3
  const textStartX = companyLogoDataUrl ? logoX + logoBoxW + 4 : ml
  const headerTextMaxWidth = badgeX - textStartX - 6
  const complianceParts = [
    data.companyGstin ? `GSTIN: ${data.companyGstin}` : null,
    data.companyPan ? `PAN: ${data.companyPan}` : null,
    data.companyReraNumber ? `RERA: ${data.companyReraNumber}` : null,
  ].filter(Boolean) as string[]
  const headerLines = [
    data.projectName,
    data.companyAddress || data.siteAddress,
    data.companySupportContact ? `Support: ${data.companySupportContact}` : undefined,
    complianceParts.length > 0 ? complianceParts.join("  •  ") : undefined,
  ].filter(Boolean) as string[]
  const headerHeight = Math.max(22, 12 + headerLines.length * 4 + 6)

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, headerHeight, "F")
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(0, headerHeight, pageWidth, headerHeight)

  if (companyLogoDataUrl) {
    doc.setDrawColor(215, 215, 215)
    doc.setLineWidth(0.2)
    doc.roundedRect(logoX, logoY, logoBoxW, logoBoxH, 1, 1, "S")
    doc.addImage(companyLogoDataUrl, "PNG", logoX + 1, logoY + 1, logoBoxW - 2, logoBoxH - 2, undefined, "FAST")
  }

  setFont("bold", 13, 0)
  doc.text(data.companyName.toUpperCase(), textStartX, 7)

  let headerLineY = 12
  headerLines.forEach((line, index) => {
    setFont("normal", index === 0 ? 7.5 : 6.5, index === 0 ? 60 : 100)
    doc.text(doc.splitTextToSize(line, headerTextMaxWidth)[0], textStartX, headerLineY)
    headerLineY += 4
  })
  doc.setFillColor(245, 245, 245)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(badgeX, 2, 62, 14, 1, 1, "FD")
  setFont("bold", 6.5, 80)
  doc.text("STATEMENT OF ACCOUNT", badgeX + 31, 7, { align: "center" })
  setFont("normal", 6.5, 100)
  doc.text(`As of ${data.generatedAt}`, badgeX + 31, 12, { align: "center" })

  y = headerHeight + 4

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
    const agreementValue = getAgreementPayableTotal(agreement, customer?.sellingPrice || 0)
    
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
      cumulativePaid += getSignedPaymentAmount(p)
      const balance = Math.max(agreementValue - cumulativePaid, 0)
      
      return {
        date: formatShortDate(p.createdAt),
        mode: getPaymentModeLabel(p.paymentMode),
        reference: p.referenceNumber || undefined,
        note: p.note || undefined,
        amount: getSignedPaymentAmount(p),
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
      companyLogoUrl:
        companyData?.receiptSettings?.showCompanyLogo && companyData?.logo
          ? (resolveCompanyLogoUrl(companyData.logo) ?? undefined)
          : undefined,
      companyAddress:
        companyData?.receiptSettings?.showCorporateAddress && companyData?.address
          ? companyData.address
          : undefined,
      companySupportContact:
        companyData?.receiptSettings?.showSupportContact && companyData?.phone
          ? companyData.phone
          : undefined,
      companyGstin:
        companyData?.receiptSettings?.showGstin && companyData?.gstin
          ? companyData.gstin
          : undefined,
      companyPan:
        companyData?.receiptSettings?.showPan && companyData?.pan
          ? companyData.pan
          : undefined,
      companyReraNumber:
        companyData?.receiptSettings?.showReraNumber && companyData?.reraNumber
          ? companyData.reraNumber
          : undefined,

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

// ─── VENDOR RECEIPT DATA ──────────────────────────────────────────────────────

export interface VendorReceiptPdfData {
  receiptNumber: string
  receiptDate: string
  postedAt: string
  status: string
  paymentMode: string
  paymentAmount: number
  paymentAmountWords: string
  referenceNumber?: string
  note?: string

  companyName: string
  companyLogoUrl?: string
  companyAddress?: string
  companySupportContact?: string
  companyGstin?: string
  companyPan?: string
  companyReraNumber?: string

  vendorName: string
  vendorType?: string
  vendorPhone?: string
  vendorEmail?: string
  vendorAddress?: string
  vendorGstin?: string
  vendorPan?: string
  contactPersonName?: string

  siteName?: string
  siteAddress?: string
  billNumber?: string
  billAmount?: number
  billDate?: string
  dueDate?: string
  description?: string
  reason?: string
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
  if (decimalPart > 0) result += ` and ${convertLessThanOneThousand(decimalPart)} Paise`
  return `${result} Only`
}

export async function generateVendorReceiptPDF(data: VendorReceiptPdfData, filename: string) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF("p", "mm", "a4")
  const companyLogoDataUrl = await loadImageAsPngDataUrl(data.companyLogoUrl)

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
  const badgeX = pageWidth - mr - 58
  const logoBoxW = 20
  const logoBoxH = 14
  const logoX = ml
  const logoY = 3
  const textStartX = companyLogoDataUrl ? logoX + logoBoxW + 4 : ml
  const headerTextMaxWidth = badgeX - textStartX - 6
  const complianceParts = [
    data.companyGstin ? `GSTIN: ${data.companyGstin}` : null,
    data.companyPan ? `PAN: ${data.companyPan}` : null,
    data.companyReraNumber ? `RERA: ${data.companyReraNumber}` : null,
  ].filter(Boolean) as string[]
  const headerLines = [
    data.companyAddress,
    data.companySupportContact ? `Support: ${data.companySupportContact}` : undefined,
    complianceParts.length > 0 ? complianceParts.join("  •  ") : undefined,
  ].filter(Boolean) as string[]
  const headerHeight = Math.max(22, 12 + headerLines.length * 4 + 6)

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, headerHeight, "F")
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(0, headerHeight, pageWidth, headerHeight)

  if (companyLogoDataUrl) {
    doc.setDrawColor(215, 215, 215)
    doc.setLineWidth(0.2)
    doc.roundedRect(logoX, logoY, logoBoxW, logoBoxH, 1, 1, "S")
    doc.addImage(companyLogoDataUrl, "PNG", logoX + 1, logoY + 1, logoBoxW - 2, logoBoxH - 2, undefined, "FAST")
  }

  setFont("bold", 13, 0)
  doc.text(data.companyName.toUpperCase(), textStartX, 7)

  let headerLineY = 12
  headerLines.forEach((line, index) => {
    setFont("normal", index === 0 ? 7.5 : 6.5, index === 0 ? 60 : 100)
    doc.text(doc.splitTextToSize(line, headerTextMaxWidth)[0], textStartX, headerLineY)
    headerLineY += 4
  })

  // Receipt badge top-right
  setFont("bold", 6.5, 80)
  doc.text("VENDOR PAYMENT RECEIPT", badgeX + 29, 6.5, { align: "center" })
  setFont("bold", 7.5, 0)
  doc.text(data.receiptNumber, badgeX + 29, 11, { align: "center" })
  setFont("normal", 6, 100)
  doc.text(data.receiptDate, badgeX + 29, 14.5, { align: "center" })

  y = headerHeight + 4

  // ─── AMOUNT HERO STRIP ────────────────────────────────────────────────────
  doc.setFillColor(248, 248, 248)
  doc.rect(0, y, pageWidth, 16, "F")
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(0, y, pageWidth, y)

  setFont("bold", 6.5, 120)
  doc.text("AMOUNT PAID", ml, y + 4.5)
  setFont("bold", 14, 0)
  doc.text(formatINR(data.paymentAmount), ml, y + 11)
  setFont("normal", 6.5, 100)
  doc.text(data.paymentAmountWords, ml, y + 14.5)

  // Mode pill
  const modeW = 28
  const modeX = pageWidth - mr - modeW
  doc.setFillColor(240, 240, 240)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(modeX, y + 3.5, modeW, 8, 1.5, 1.5, "FD")
  setFont("bold", 7, 0)
  doc.text(data.paymentMode.toUpperCase(), modeX + modeW / 2, y + 9, { align: "center" })

  // Status badge
  const statusColor = data.status === "VOIDED" ? [220, 38, 38] : [21, 128, 61]
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.roundedRect(modeX - 32, y + 3.5, 28, 8, 1.5, 1.5, "F")
  setFont("bold", 7, 255)
  doc.text(data.status.toUpperCase(), modeX - 32 + 14, y + 9, { align: "center" })

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

  // Col 1 — Vendor
  sectionLabel("VENDOR", c1, gridY)
  lh1 += 4
  lh1 += infoRow("NAME", data.vendorName, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("TYPE", data.vendorType, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("CONTACT", data.contactPersonName, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("PHONE", data.vendorPhone, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("GSTIN", data.vendorGstin, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("PAN", data.vendorPan, c1, gridY + lh1, colInnerW)

  // Col 2 — Bill / Work
  sectionLabel("BILL DETAILS", c2, gridY)
  lh2 += 4
  lh2 += infoRow("BILL NO.", data.billNumber, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("BILL AMOUNT", data.billAmount !== undefined ? formatINR(data.billAmount) : undefined, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("SITE", data.siteName, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("DESCRIPTION", data.description, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("REASON", data.reason, c2, gridY + lh2, colInnerW)

  // Col 3 — Transaction
  sectionLabel("TRANSACTION", c3, gridY)
  lh3 += 4
  lh3 += infoRow("DATE", data.receiptDate, c3, gridY + lh3, colInnerW)
  lh3 += infoRow("MODE", data.paymentMode, c3, gridY + lh3, colInnerW)
  lh3 += infoRow("REFERENCE", data.referenceNumber || undefined, c3, gridY + lh3, colInnerW)
  lh3 += infoRow("NOTE", data.note, c3, gridY + lh3, colInnerW)

  const maxLH = Math.max(lh1, lh2, lh3) + 2

  // Vertical dividers
  doc.setDrawColor(215, 215, 215)
  doc.setLineWidth(0.15)
  doc.line(c2 - 2, gridY - 1, c2 - 2, gridY + maxLH)
  doc.line(c3 - 2, gridY - 1, c3 - 2, gridY + maxLH)

  y = gridY + maxLH + 4

  // ─── SIGNATURE + FOOTER ───────────────────────────────────────────────────
  y += 8
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(ml, y, ml + 45, y)
  doc.line(pageWidth - mr - 45, y, pageWidth - mr, y)
  setFont("normal", 6.5, 140)
  doc.text("Vendor Acknowledgement", ml, y + 5.5)
  doc.text("Authorised Signatory", pageWidth - mr, y + 5.5, { align: "right" })

  doc.setFillColor(255, 255, 255)
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F")
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(0, pageHeight - 8, pageWidth, pageHeight - 8)
  setFont("normal", 6, 100)
  doc.text(
    `Generated on ${data.postedAt}  •  ${data.receiptNumber}  •  ${data.companyName}`,
    pageWidth / 2,
    pageHeight - 3,
    { align: "center" },
  )

  doc.save(filename)
}

async function generateEnhancedVendorReceiptPDF(data: VendorReceiptPdfData, filename: string) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF("p", "mm", "a4")
  const companyLogoDataUrl = await loadImageAsPngDataUrl(data.companyLogoUrl)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const ml = 15
  const mr = 15
  const cw = pageWidth - ml - mr
  const pendingAgainstBill = Math.max((data.billAmount ?? data.paymentAmount) - data.paymentAmount, 0)
  let y = 0

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

  const badgeX = pageWidth - mr - 58
  const logoBoxW = 20
  const logoBoxH = 14
  const logoX = ml
  const logoY = 3
  const textStartX = companyLogoDataUrl ? logoX + logoBoxW + 4 : ml
  const headerTextMaxWidth = badgeX - textStartX - 6
  const complianceParts = [
    data.companyGstin ? `GSTIN: ${data.companyGstin}` : null,
    data.companyPan ? `PAN: ${data.companyPan}` : null,
    data.companyReraNumber ? `RERA: ${data.companyReraNumber}` : null,
  ].filter(Boolean) as string[]
  const headerLines = [
    data.siteName || "Vendor Payment",
    data.siteAddress || data.companyAddress,
    data.companySupportContact ? `Support: ${data.companySupportContact}` : undefined,
    complianceParts.length > 0 ? complianceParts.join("  •  ") : undefined,
  ].filter(Boolean) as string[]
  const headerHeight = Math.max(22, 12 + headerLines.length * 4 + 6)

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, headerHeight, "F")
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(0, headerHeight, pageWidth, headerHeight)

  if (companyLogoDataUrl) {
    doc.setDrawColor(215, 215, 215)
    doc.setLineWidth(0.2)
    doc.roundedRect(logoX, logoY, logoBoxW, logoBoxH, 1, 1, "S")
    doc.addImage(companyLogoDataUrl, "PNG", logoX + 1, logoY + 1, logoBoxW - 2, logoBoxH - 2, undefined, "FAST")
  }

  setFont("bold", 13, 0)
  doc.text(data.companyName.toUpperCase(), textStartX, 7)

  let headerLineY = 12
  headerLines.forEach((line, index) => {
    setFont("normal", index === 0 ? 7.5 : 6.5, index === 0 ? 60 : 100)
    doc.text(doc.splitTextToSize(line, headerTextMaxWidth)[0], textStartX, headerLineY)
    headerLineY += 4
  })

  setFont("bold", 6.5, 80)
  doc.text("PAYMENT RECEIPT", badgeX + 29, 6.5, { align: "center" })
  setFont("bold", 7.5, 0)
  doc.text(data.receiptNumber, badgeX + 29, 11, { align: "center" })
  setFont("normal", 6, 100)
  doc.text(data.receiptDate, badgeX + 29, 14.5, { align: "center" })

  y = headerHeight + 4

  doc.setFillColor(248, 248, 248)
  doc.rect(0, y, pageWidth, 16, "F")
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(0, y, pageWidth, y)

  setFont("bold", 6.5, 120)
  doc.text("AMOUNT PAID", ml, y + 4.5)
  setFont("bold", 14, 0)
  doc.text(formatINR(data.paymentAmount), ml, y + 11)
  setFont("normal", 6.5, 100)
  doc.text(data.paymentAmountWords, ml, y + 14.5)

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
  let lh1 = 0
  let lh2 = 0
  let lh3 = 0

  sectionLabel("VENDOR", c1, gridY)
  lh1 += 4
  lh1 += infoRow("NAME", data.vendorName, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("PHONE", data.vendorPhone, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("CONTACT", data.contactPersonName, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("GSTIN", data.vendorGstin, c1, gridY + lh1, colInnerW)
  lh1 += infoRow("EMAIL", data.vendorEmail, c1, gridY + lh1, colInnerW)

  sectionLabel("PROPERTY", c2, gridY)
  lh2 += 4
  lh2 += infoRow("PROJECT", data.siteName, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("BILL NO.", data.billNumber, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("BILL DATE", data.billDate, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("DUE DATE", data.dueDate, c2, gridY + lh2, colInnerW)
  lh2 += infoRow("ADDRESS", data.siteAddress || data.vendorAddress, c2, gridY + lh2, colInnerW)

  sectionLabel("TRANSACTION", c3, gridY)
  lh3 += 4
  lh3 += infoRow("DATE", data.receiptDate, c3, gridY + lh3, colInnerW)
  lh3 += infoRow("MODE", data.paymentMode, c3, gridY + lh3, colInnerW)
  lh3 += infoRow("REFERENCE", data.referenceNumber || undefined, c3, gridY + lh3, colInnerW)
  lh3 += infoRow("NOTE", data.note, c3, gridY + lh3, colInnerW)

  const maxLH = Math.max(lh1, lh2, lh3) + 2

  doc.setDrawColor(215, 215, 215)
  doc.setLineWidth(0.15)
  doc.line(c2 - 2, gridY - 1, c2 - 2, gridY + maxLH)
  doc.line(c3 - 2, gridY - 1, c3 - 2, gridY + maxLH)

  y = gridY + maxLH + 4

  doc.setFillColor(210, 210, 210)
  doc.rect(ml, y, cw, 0.3, "F")
  y += 4

  setFont("bold", 6.5, 100)
  doc.text("ACCOUNT POSITION", ml, y)
  y += 4

  const tileW = (cw - 4) / 3
  const tileH = 14
  ;[
    { label: "BILL AMOUNT", value: formatINR(data.billAmount ?? data.paymentAmount) },
    { label: "TOTAL PAID", value: formatINR(data.paymentAmount) },
    { label: "BALANCE DUE", value: formatINR(pendingAgainstBill) },
  ].forEach((tile, index) => {
    const tx = ml + index * (tileW + 2)
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

  const billParticulars = [
    data.billNumber ? `Bill ${data.billNumber}` : null,
    data.description ?? null,
    data.reason ?? null,
    data.siteName ? `Site: ${data.siteName}` : null,
  ].filter(Boolean).join(" • ")
  const paymentParticulars = [
    data.paymentMode ? `Paid via ${data.paymentMode}` : null,
    data.referenceNumber ? `Ref ${data.referenceNumber}` : null,
    data.note ?? null,
  ].filter(Boolean).join(" • ")

  const lineItems = [
    {
      date: data.billDate || data.receiptDate,
      type: "Bill",
      label: billParticulars || "Vendor bill",
      signedAmount: data.billAmount ?? data.paymentAmount,
    },
    {
      date: data.receiptDate,
      type: "Payment",
      label: paymentParticulars || "Vendor payment",
      signedAmount: -data.paymentAmount,
    },
  ]

  doc.setFillColor(210, 210, 210)
  doc.rect(ml, y, cw, 0.3, "F")
  y += 4

  setFont("bold", 6.5, 100)
  doc.text("BILL LINE ITEMS", ml, y)
  y += 4

  doc.setFillColor(30, 30, 30)
  doc.rect(ml, y, cw, 6, "F")
  setFont("bold", 6, 200)
  doc.text("DATE", ml + 2, y + 4)
  doc.text("TYPE", ml + 28, y + 4)
  doc.text("PARTICULARS", ml + 52, y + 4)
  doc.text("AMOUNT", pageWidth - mr - 2, y + 4, { align: "right" })
  y += 6

  lineItems.forEach((line, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(ml, y, cw, 5.5, "F")
    }

    setFont("normal", 6.5, 40)
    doc.text(line.date.substring(0, 11), ml + 2, y + 3.8)
    doc.text(line.type.substring(0, 12), ml + 28, y + 3.8)
    doc.text(line.label.substring(0, 52), ml + 52, y + 3.8)
    setFont("normal", 6.5, 0)
    doc.text(formatSignedINR(line.signedAmount), pageWidth - mr - 2, y + 3.8, { align: "right" })

    doc.setDrawColor(235, 235, 235)
    doc.setLineWidth(0.1)
    doc.line(ml, y + 5.5, pageWidth - mr, y + 5.5)
    y += 5.5
  })

  y += 11
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(ml, y, ml + 45, y)
  doc.line(pageWidth - mr - 45, y, pageWidth - mr, y)
  setFont("normal", 6.5, 140)
  doc.text("Vendor Signature", ml, y + 5.5)
  doc.text("Authorised Signatory", pageWidth - mr, y + 5.5, { align: "right" })

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
    { align: "center" },
  )

  doc.save(filename)
}

export async function downloadVendorReceiptPDF(
  receipt: {
    receiptNumber: string
    date: string
    status: string
    amount: number
    paymentMode: string | null
    referenceNumber: string | null
    note: string | null
    vendorName: string
    vendorType: string
    contactPersonName: string | null
    vendorPhone: string | null
    vendorEmail: string | null
    vendorAddress: string | null
    vendorGstin: string | null
    vendorPan: string | null
    billNumber: string | null
    billAmount: number
    billDate: string
    dueDate: string | null
    description: string | null
    reason: string | null
    siteName: string | null
    siteAddress: string | null
  },
  companyData?: any,
): Promise<void> {
  const pdfData: VendorReceiptPdfData = {
    receiptNumber: receipt.receiptNumber,
    receiptDate: formatShortDate(receipt.date),
    postedAt: formatDateTime(new Date().toISOString()),
    status: receipt.status,
    paymentMode: getPaymentModeLabel(receipt.paymentMode),
    paymentAmount: receipt.amount,
    paymentAmountWords: convertToIndianWords(receipt.amount),
    referenceNumber: receipt.referenceNumber ?? undefined,
    note: receipt.note ?? undefined,

    companyName: companyData?.name || "Company",
    companyLogoUrl:
      companyData?.receiptSettings?.showCompanyLogo !== false && companyData?.logo
        ? (resolveCompanyLogoUrl(companyData.logo) ?? undefined)
        : undefined,
    companyAddress:
      companyData?.receiptSettings?.showCorporateAddress && companyData?.address
        ? companyData.address
        : undefined,
    companySupportContact:
      companyData?.receiptSettings?.showSupportContact && companyData?.phone
        ? companyData.phone
        : undefined,
    companyGstin:
      companyData?.receiptSettings?.showGstin && companyData?.gstin
        ? companyData.gstin
        : undefined,
    companyPan:
      companyData?.receiptSettings?.showPan && companyData?.pan
        ? companyData.pan
        : undefined,
    companyReraNumber:
      companyData?.receiptSettings?.showReraNumber && companyData?.reraNumber
        ? companyData.reraNumber
        : undefined,

    vendorName: receipt.vendorName,
    vendorType: receipt.vendorType,
    contactPersonName: receipt.contactPersonName ?? undefined,
    vendorPhone: receipt.vendorPhone ?? undefined,
    vendorEmail: receipt.vendorEmail ?? undefined,
    vendorAddress: receipt.vendorAddress ?? undefined,
    vendorGstin: receipt.vendorGstin ?? undefined,
    vendorPan: receipt.vendorPan ?? undefined,
    siteName: receipt.siteName ?? undefined,
    siteAddress: receipt.siteAddress ?? undefined,
    billNumber: receipt.billNumber ?? undefined,
    billAmount: receipt.billAmount,
    billDate: formatShortDate(receipt.billDate),
    dueDate: receipt.dueDate ? formatShortDate(receipt.dueDate) : undefined,
    description: receipt.description ?? undefined,
    reason: receipt.reason ?? undefined,
  }

  const filename = `Vendor-Receipt-${sanitizeFilename(receipt.vendorName)}-${sanitizeFilename(receipt.receiptNumber)}.pdf`
  await generateEnhancedVendorReceiptPDF(pdfData, filename)
}
