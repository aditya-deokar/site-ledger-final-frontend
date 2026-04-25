import { z } from 'zod';

export const INVESTOR_TYPES = ['EQUITY', 'FIXED_RATE'] as const;
export const INVESTOR_TRANSACTION_KINDS = ['PRINCIPAL_IN', 'PRINCIPAL_OUT', 'INTEREST'] as const;

export const createInvestorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  type: z.enum(INVESTOR_TYPES),
  siteId: z.string().optional(),
  equityPercentage: z.number().min(0).max(100).optional(),
  fixedRate: z.number().min(0).optional(),
  investmentAmount: z.number().min(0).optional(),
  amountPaidNow: z.number().min(0).optional(),
  paymentMode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI']).optional(),
  referenceNumber: z.string().optional(),
  paymentDate: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validation: amountPaidNow cannot exceed investmentAmount
  if (data.amountPaidNow && data.investmentAmount && data.amountPaidNow > data.investmentAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Amount paid now cannot exceed total investment amount',
      path: ['amountPaidNow'],
    });
  }
  
  // Validation: payment details required if amountPaidNow > 0
  if (data.amountPaidNow && data.amountPaidNow > 0) {
    if (!data.paymentMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Payment mode is required when recording payment',
        path: ['paymentMode'],
      });
    }
    
    if (data.paymentMode !== 'CASH' && !data.referenceNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reference number required for non-cash payments',
        path: ['referenceNumber'],
      });
    }
  }
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
  interestPaid: number;
  outstandingPrincipal: number;
  isClosed: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  kind: (typeof INVESTOR_TRANSACTION_KINDS)[number];
  amount: number;
  note: string | null;
  amountPaid: number;
  remaining: number;
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
  data: {
    transactions: Transaction[];
    totalInvested: number;
    totalReturned: number;
    interestPaid: number;
    outstandingPrincipal: number;
  };
}
