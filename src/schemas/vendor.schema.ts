import { z } from 'zod';

export const VENDOR_TYPES = ['ELECTRICIAN', 'PLUMBER', 'SUPPLIER', 'PAINTER', 'ARCHITECT'] as const;

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(VENDOR_TYPES),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = createVendorSchema.partial();
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export interface Vendor {
  id: string;
  name: string;
  type: (typeof VENDOR_TYPES)[number];
  phone: string | null;
  email: string | null;
  createdAt: string;
}

export interface VendorProfile extends Vendor {
  totalExpenses: number;
  expenseCount: number;
  totalPaid: number;
  remainingBalance: number;
}

export interface VendorTransaction {
  id: string;
  siteId: string;
  amount: number;
  description: string | null;
  reason: string | null;
  siteName: string | null;
  amountPaid: number;
  paymentDate: string | null;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  createdAt: string;
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
  data: { transactions: VendorTransaction[]; totalPaid: number; totalBilled: number };
}
