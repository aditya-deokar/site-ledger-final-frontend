// Canonical money formatting for the whole app.
//
// Every on-screen monetary value should go through `formatMoney` so the currency
// symbol, digit grouping, and decimal handling stay identical across all views.
// Previously each screen defined its own helper, producing the same amount as
// "₹1,500", "Rs. 1,500", "Rs 1,500", "INR 1,500", or "1,500" depending on where
// you looked — a reconciliation hazard in a financial ledger.
//
// PDFs use `formatMoneyAscii` instead, because the ₹ glyph is not present in
// jsPDF's built-in (core) fonts and renders as garbage there.

export const RUPEE = '₹' // ₹

type MoneyInput = number | string | null | undefined

function toNumber(value: MoneyInput): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export type FormatMoneyOptions = {
  /** Force a fixed number of decimals (sets both min and max). Defaults to 0–2. */
  decimals?: number
  /** Set false to omit the ₹ symbol and return the grouped number only. */
  symbol?: boolean
}

/**
 * Format an amount as Indian Rupees: ₹ symbol, en-IN grouping (lakh/crore),
 * and up to 2 decimals so paise are shown when present but whole amounts stay clean.
 */
export function formatMoney(value: MoneyInput, options: FormatMoneyOptions = {}): string {
  const { decimals, symbol = true } = options
  const amount = toNumber(value)

  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2,
  })

  return symbol ? `${RUPEE}${formatted}` : formatted
}

/**
 * ASCII-safe variant for jsPDF output ("Rs." instead of ₹). Always renders 2
 * decimals by default to match formal receipts/statements. Pass `signed` to
 * render negatives as "- Rs. X".
 */
export function formatMoneyAscii(
  value: MoneyInput,
  options: { decimals?: number; signed?: boolean } = {},
): string {
  const { decimals = 2, signed = false } = options
  const amount = toNumber(value)
  const magnitude = signed ? Math.abs(amount) : amount

  const formatted = magnitude.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  const prefix = signed && amount < 0 ? '- Rs. ' : 'Rs. '
  return `${prefix}${formatted}`
}
