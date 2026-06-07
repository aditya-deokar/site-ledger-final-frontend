import type {
  CreateInvestorInput,
  Investor,
  Transaction,
} from '@/schemas/investor.schema';

import { formatMoney } from '@/lib/money';

import type { InvestorTypeFilter } from './types';

const AVATAR_COLORS = [
  'bg-teal-600',
  'bg-blue-600',
  'bg-amber-500',
  'bg-rose-600',
  'bg-violet-600',
  'bg-emerald-600',
] as const;

export const investorTypeTabs: Array<{
  key: InvestorTypeFilter;
  label: string;
}> = [
  { key: undefined, label: 'All' },
  { key: 'EQUITY', label: 'Equity (Site)' },
  { key: 'FIXED_RATE', label: 'Fixed Rate (Company)' },
];

export function formatINR(value: number) {
  return formatMoney(value);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
}

export function getTodayDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function toIsoDateTime(value?: string) {
  if (!value) return undefined;
  const parsed = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function getAddInvestorDefaultValues(): CreateInvestorInput {
  return {
    type: 'EQUITY',
    equityPercentage: 0,
    fixedRate: 0,
    fixedRateCadence: 'YEARLY',
    investmentAmount: 0,
    amountPaidNow: 0,
    paymentMode: 'CASH',
    paymentDate: getTodayDateInputValue(),
    name: '',
    phone: '',
  };
}

export function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length];
}

export function initials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'NA';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function formatTransactionKind(
  kind: Transaction['kind'],
  investorType?: Investor['type'],
) {
  switch (kind) {
    case 'PRINCIPAL_IN':
      return 'Principal In';
    case 'PRINCIPAL_OUT':
      if (!investorType) return 'Payout';
      return investorType === 'EQUITY' ? 'Capital Return' : 'Principal Out';
    case 'INTEREST':
      if (!investorType) return 'Interest / Profit Share';
      return investorType === 'EQUITY' ? 'Profit Share' : 'Interest';
    default:
      return kind;
  }
}

export function transactionKindClasses(kind: Transaction['kind']) {
  switch (kind) {
    case 'PRINCIPAL_IN':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600';
    case 'INTEREST':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-600';
    case 'PRINCIPAL_OUT':
    default:
      return 'border-red-500/20 bg-red-500/10 text-red-500';
  }
}
