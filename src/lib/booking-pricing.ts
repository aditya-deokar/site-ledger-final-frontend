import type { BookFlatAgreementLineInput } from '@/schemas/site.schema';

export type BookingAgreementCalculationMode = 'FIXED_AMOUNT' | 'PERCENTAGE';

export type BookingAgreementDraftLine = {
  type?: BookFlatAgreementLineInput['type'] | '';
  label?: string;
  amount?: number;
  ratePercent?: number;
  calculationMode?: BookingAgreementCalculationMode;
  affectsProfit?: boolean;
  note?: string;
};

export type BookingAgreementPreview = {
  basePrice: number;
  charges: number;
  tax: number;
  discounts: number;
  credits: number;
  payableTotal: number;
  profitRevenue: number;
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function defaultBookingAgreementAffectsProfit(type: BookFlatAgreementLineInput['type']) {
  return type !== 'TAX';
}

export function getBookingAgreementLineCalculationMode(line: Pick<BookingAgreementDraftLine, 'type' | 'calculationMode'>) {
  if (line.type === 'TAX') return 'PERCENTAGE' as const;
  if (line.type === 'DISCOUNT') return line.calculationMode ?? 'FIXED_AMOUNT';
  return 'FIXED_AMOUNT' as const;
}

export function resolveBookingAgreementLineAmount(
  line: Pick<BookingAgreementDraftLine, 'type' | 'amount' | 'ratePercent' | 'calculationMode'>,
  basePrice: number,
) {
  if (!line.type) return 0;

  if (line.type === 'TAX') {
    return roundMoney(basePrice * ((line.ratePercent ?? 0) / 100));
  }

  if (line.type === 'DISCOUNT' && getBookingAgreementLineCalculationMode(line) === 'PERCENTAGE') {
    return roundMoney(basePrice * ((line.ratePercent ?? 0) / 100));
  }

  return roundMoney(line.amount ?? 0);
}

export function computeBookingAgreementPreview(
  basePrice: number,
  lines: BookingAgreementDraftLine[],
): BookingAgreementPreview {
  const normalizedBasePrice = roundMoney(Math.max(0, Number(basePrice) || 0));
  const totals: BookingAgreementPreview = {
    basePrice: normalizedBasePrice,
    charges: 0,
    tax: 0,
    discounts: 0,
    credits: 0,
    payableTotal: normalizedBasePrice,
    profitRevenue: normalizedBasePrice,
  };

  for (const line of lines) {
    if (!line.type) continue;

    const amount = resolveBookingAgreementLineAmount(line, normalizedBasePrice);
    const signedAmount = line.type === 'DISCOUNT' || line.type === 'CREDIT' ? -amount : amount;

    if (line.type === 'CHARGE') totals.charges += amount;
    else if (line.type === 'TAX') totals.tax += amount;
    else if (line.type === 'DISCOUNT') totals.discounts += amount;
    else if (line.type === 'CREDIT') totals.credits += amount;

    totals.payableTotal += signedAmount;

    if ((line.affectsProfit ?? defaultBookingAgreementAffectsProfit(line.type)) === true) {
      totals.profitRevenue += signedAmount;
    }
  }

  return {
    basePrice: roundMoney(totals.basePrice),
    charges: roundMoney(totals.charges),
    tax: roundMoney(totals.tax),
    discounts: roundMoney(totals.discounts),
    credits: roundMoney(totals.credits),
    payableTotal: Math.max(roundMoney(totals.payableTotal), 0),
    profitRevenue: Math.max(roundMoney(totals.profitRevenue), 0),
  };
}

export function mapBookingAgreementLinesForSubmit(
  lines: BookingAgreementDraftLine[],
  basePrice: number,
): BookFlatAgreementLineInput[] {
  const normalizedBasePrice = roundMoney(Math.max(0, Number(basePrice) || 0));

  return lines
    .filter((line): line is BookingAgreementDraftLine & { type: BookFlatAgreementLineInput['type']; label: string } => {
      return Boolean(line.type && line.label?.trim());
    })
    .map((line) => {
      const calculationMode = getBookingAgreementLineCalculationMode(line);
      const isPercentageLine =
        line.type === 'TAX' || (line.type === 'DISCOUNT' && calculationMode === 'PERCENTAGE');

      return {
        type: line.type,
        label: line.label.trim(),
        amount: resolveBookingAgreementLineAmount(line, normalizedBasePrice),
        ratePercent: isPercentageLine ? line.ratePercent : undefined,
        calculationBase: isPercentageLine ? normalizedBasePrice : undefined,
        affectsProfit: line.affectsProfit ?? defaultBookingAgreementAffectsProfit(line.type),
        note: line.note?.trim() || undefined,
      };
    });
}
