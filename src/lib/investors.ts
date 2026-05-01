import type { Investor } from '@/schemas/investor.schema';

type FixedRateCadence = Investor['fixedRateCadence'];

export function normalizeFixedRateCadence(cadence: FixedRateCadence) {
  return cadence === 'MONTHLY' ? 'MONTHLY' : 'YEARLY';
}

export function getFixedRateInputLabel(cadence: FixedRateCadence) {
  return normalizeFixedRateCadence(cadence) === 'MONTHLY'
    ? 'Fixed Rate (% per month)'
    : 'Fixed Rate (% per year)';
}

export function formatFixedRateTerms(
  rate: number | null | undefined,
  cadence: FixedRateCadence,
) {
  const safeRate = rate ?? 0;

  return normalizeFixedRateCadence(cadence) === 'MONTHLY'
    ? `${safeRate}% per month`
    : `${safeRate}% p.a.`;
}

export function calculateFixedRateInterest(
  principal: number,
  rate: number | null | undefined,
  cadence: FixedRateCadence,
) {
  const safePrincipal = Math.max(principal, 0);
  const safeRate = rate ?? 0;

  if (normalizeFixedRateCadence(cadence) === 'MONTHLY') {
    const monthly = Math.round((safeRate / 100) * safePrincipal);
    const annual = Math.round(monthly * 12);
    const daily = Math.round(annual / 365);
    return { annual, monthly, daily };
  }

  const annual = Math.round((safeRate / 100) * safePrincipal);
  const monthly = Math.round(annual / 12);
  const daily = Math.round(annual / 365);
  return { annual, monthly, daily };
}
