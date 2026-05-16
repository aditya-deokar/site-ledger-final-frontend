import { z } from 'zod';

export const partnerInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  investmentAmount: z.number().min(0, 'Must be positive'),
  stakePercentage: z.number().min(0).max(100, 'Must be 0–100'),
});
export type PartnerInput = z.infer<typeof partnerInputSchema>;

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  tradeName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  tan: z.string().optional(),
  cin: z.string().optional(),
  reraNumber: z.string().optional(),
  msmeUdyamNumber: z.string().optional(),
  epfNumber: z.string().optional(),
  esicNumber: z.string().optional(),
  bocwNumber: z.string().optional(),
  logo: z.string().url().optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  tradeName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  tan: z.string().optional(),
  cin: z.string().optional(),
  reraNumber: z.string().optional(),
  msmeUdyamNumber: z.string().optional(),
  epfNumber: z.string().optional(),
  esicNumber: z.string().optional(),
  bocwNumber: z.string().optional(),
  logo: z.string().url().nullable().optional(),
  receiptSettings: z.object({
    showCompanyLogo: z.boolean().optional(),
    showGstin: z.boolean().optional(),
    showPan: z.boolean().optional(),
    showReraNumber: z.boolean().optional(),
    showCorporateAddress: z.boolean().optional(),
    showSupportContact: z.boolean().optional(),
  }).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export interface Partner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  investmentAmount: number;
  stakePercentage: number;
}

export interface CompanyResponse {
  ok: boolean;
  data: {
    company: {
      id: string;
      name: string;
      tradeName?: string | null;
      address: string | null;
      phone?: string | null;
      gstin?: string | null;
      pan?: string | null;
      tan?: string | null;
      cin?: string | null;
      reraNumber?: string | null;
      msmeUdyamNumber?: string | null;
      epfNumber?: string | null;
      esicNumber?: string | null;
      bocwNumber?: string | null;
      logo?: string | null;
      receiptSettings?: {
        showCompanyLogo?: boolean;
        showGstin?: boolean;
        showPan?: boolean;
        showReraNumber?: boolean;
        showCorporateAddress?: boolean;
        showSupportContact?: boolean;
      } | null;
      createdAt: string;
    };
    partner_fund: number;
    investor_fund: number;
    total_fund: number;
    available_fund: number;
    partners: Partner[];
  };
}

export interface CreateCompanyResponse {
  ok: boolean;
  data: {
    company: {
      id: string;
      name: string;
      tradeName?: string | null;
      address: string | null;
      phone?: string | null;
      gstin?: string | null;
      pan?: string | null;
      tan?: string | null;
      cin?: string | null;
      reraNumber?: string | null;
      msmeUdyamNumber?: string | null;
      epfNumber?: string | null;
      esicNumber?: string | null;
      bocwNumber?: string | null;
      logo?: string | null;
      receiptSettings?: {
        showCompanyLogo?: boolean;
        showGstin?: boolean;
        showPan?: boolean;
        showReraNumber?: boolean;
        showCorporateAddress?: boolean;
        showSupportContact?: boolean;
      } | null;
      createdAt: string;
    };
  };
}

export interface CompanyWithdrawal {
  id: string;
  amount: number;
  note: string | null;
  amountPaid: number;
  remaining: number;
  paymentDate: string | null;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  createdAt: string;
}

export interface CompanyWithdrawalsResponse {
  ok: boolean;
  data: {
    withdrawals: CompanyWithdrawal[];
  };
}

export interface CompanyWithdrawalResponse {
  ok: boolean;
  data: {
    withdrawal: CompanyWithdrawal;
  };
}

export interface LedgerPaymentRecord {
  id: string;
  amount: number;
  paymentDate?: string;
  note: string | null;
  createdAt: string;
}

export interface CompanyWithdrawalPaymentsResponse {
  ok: boolean;
  data: {
    payments: LedgerPaymentRecord[];
  };
}

export interface PartnerLedgerEntry {
  id: string;
  amount: number;
  direction: 'IN' | 'OUT';
  movementType: string;
  note: string | null;
  reversalOfPaymentId: string | null;
  date: string;
}

export interface PartnerLedgerResponse {
  ok: boolean;
  data: {
    partner: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      stakePercentage: number;
    };
    summary: {
      totalIn: number;
      totalOut: number;
      netCapital: number;
    };
    entries: PartnerLedgerEntry[];
  };
}

export interface CompanyActivityItem {
  id: string;
  type: 'withdrawal' | 'site_fund' | 'investor_tx' | 'expense';
  amount: number;
  description: string;
  date: string;
}

export interface CompanyActivityResponse {
  ok: boolean;
  data: {
    summary?: { grossFlow: number; totalInflow: number; totalOutflow: number };
    activities: CompanyActivityItem[];
    nextCursor: string | null;
  };
}
