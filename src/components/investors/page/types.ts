import type { Investor } from '@/schemas/investor.schema';

export type InvestorTypeFilter = Investor['type'] | undefined;
export type InvestorLedgerMode = 'invest' | 'return' | 'interest';
