import { z } from 'zod';

export const INVESTOR_TYPES = ['EQUITY', 'FIXED_RATE'] as const;

export const createInvestorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  type: z.enum(INVESTOR_TYPES),
  siteId: z.string().optional(),
  equityPercentage: z.number().min(0).max(100).optional(),
  fixedRate: z.number().min(0).optional(),
});
export type CreateInvestorInput = z.infer<typeof createInvestorSchema>;

export const updateInvestorSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  equityPercentage: z.number().min(0).max(100).optional(),
  fixedRate: z.number().min(0).optional(),
});
export type UpdateInvestorInput = z.infer<typeof updateInvestorSchema>;

export const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  note: z.string().optional(),
  amountPaid: z.number().min(0, 'Must be positive').optional(),
  paymentDate: z.string().optional(),
});
export type TransactionInput = z.infer<typeof transactionSchema>;

export interface Investor {
  id: string;
  name: string;
  phone: string | null;
  type: 'EQUITY' | 'FIXED_RATE';
  siteId: string | null;
  siteName: string | null;
  equityPercentage: number | null;
  fixedRate: number | null;
  totalInvested: number;
  totalReturned: number;
  isClosed: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  note: string | null;
  amountPaid: number;
  paymentDate: string | null;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  createdAt: string;
}

export interface InvestorsResponse {
  ok: boolean;
  data: { investors: Investor[] };
}

export interface InvestorDetailResponse {
  ok: boolean;
  data: { investor: Investor; transactions: Transaction[] };
}

export interface SiteInvestorsResponse {
  ok: boolean;
  data: { investors: { id: string; name: string; phone: string | null; equityPercentage: number | null; totalInvested: number; totalReturned: number; isClosed: boolean; createdAt: string }[]; totalInvested: number };
}

export interface TransactionsResponse {
  ok: boolean;
  data: { transactions: Transaction[]; totalInvested: number; totalReturned: number };
}
