import { z } from 'zod';

const vendorTypeSchema = z.string().trim().min(1, 'Vendor type is required');

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: vendorTypeSchema,
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = createVendorSchema.partial();
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export interface Vendor {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

export interface VendorProfile extends Vendor {
  totalExpenses: number;
  totalBilled: number;
  expenseCount: number;
  billCount: number;
  totalPaid: number;
  totalOutstanding: number;
  remainingBalance: number;
}

export interface VendorBill {
  id: string;
  siteId: string;
  amount: number;
  description: string | null;
  reason: string | null;
  siteName: string | null;
  amountPaid: number;
  remaining: number;
  paymentDate: string | null;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  billDate: string;
  createdAt: string;
}

export type VendorTransaction = VendorBill;

export interface VendorPayment {
  id: string;
  expenseId: string;
  expenseAmount: number;
  amount: number;
  note: string | null;
  siteId: string | null;
  siteName: string | null;
  description: string | null;
  reason: string | null;
  createdAt: string;
  paymentDate: string;
}

export interface VendorStatementEntry {
  entryType: 'BILL' | 'PAYMENT';
  referenceId: string;
  expenseId: string;
  date: string;
  billAmount: number;
  paymentAmount: number;
  balance: number;
  description: string | null;
  reason: string | null;
  note: string | null;
  siteId: string | null;
  siteName: string | null;
}

export interface VendorsResponse {
  ok: boolean;
  data: { vendors: Vendor[] };
}

export interface VendorProfileResponse {
  ok: boolean;
  data: { vendor: VendorProfile };
}

export interface VendorTransactionsResponse {
  ok: boolean;
  data: {
    transactions: VendorTransaction[];
    totalPaid: number;
    totalBilled: number;
    totalOutstanding: number;
    billCount: number;
  };
}

export interface VendorPaymentsResponse {
  ok: boolean;
  data: {
    payments: VendorPayment[];
    totalPaid: number;
    paymentCount: number;
  };
}

export interface VendorStatementResponse {
  ok: boolean;
  data: {
    statement: VendorStatementEntry[];
    totalBilled: number;
    totalPaid: number;
    closingBalance: number;
  };
}
