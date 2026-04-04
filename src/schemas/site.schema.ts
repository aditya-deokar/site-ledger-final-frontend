import { z } from 'zod';

export const bookFlatSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  sellingPrice: z.number().min(1, 'Required'),
  bookingAmount: z.number().min(0),
});
export type BookFlatInput = z.infer<typeof bookFlatSchema>;

export interface FlatCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  sellingPrice: number;
  bookingAmount: number;
  amountPaid: number;
  remaining: number;
  customerType?: 'CUSTOMER' | 'EXISTING_OWNER';
}

export interface Flat {
  id: string;
  flatNumber: number | null;
  customFlatId: string | null;
  status: 'AVAILABLE' | 'BOOKED' | 'SOLD';
  flatType: 'CUSTOMER' | 'EXISTING_OWNER';
  customer: FlatCustomer | null;
}

export interface Floor {
  id: string;
  floorNumber: number;
  floorName: string | null;
  flats: Flat[];
}

export interface FloorsResponse {
  ok: boolean;
  data: { floors: Floor[] };
}

export const createFloorSchema = z.object({
  floorName: z.string().min(1, 'Floor name is required'),
});
export type CreateFloorInput = z.infer<typeof createFloorSchema>;

export const createFlatSchema = z.object({
  customFlatId: z.string().min(1, 'Flat ID is required'),
  flatType: z.enum(['CUSTOMER', 'EXISTING_OWNER']).optional().default('CUSTOMER'),
});
export type CreateFlatInput = z.input<typeof createFlatSchema>;

// ── Expenses ──────────────────────────────────────────

export const createExpenseSchema = z.object({
  type: z.enum(['GENERAL', 'VENDOR']),
  reason: z.string().optional(),
  vendorId: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  amountPaid: z.number().min(0).optional(),
  paymentDate: z.string().optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export interface Expense {
  id: string;
  type: 'GENERAL' | 'VENDOR';
  reason: string | null;
  vendorId: string | null;
  vendorName: string | null;
  vendorType: string | null;
  description: string | null;
  amount: number;
  amountPaid: number;
  remaining: number;
  paymentDate: string | null;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  createdAt: string;
}

export interface ExpensesResponse {
  ok: boolean;
  data: { expenses: Expense[] };
}

// ── Sites ─────────────────────────────────────────────

export const createSiteSchema = z.object({
  name: z.string().min(1, 'Site name is required'),
  address: z.string().min(1, 'Address is required'),
  projectType: z.enum(['NEW_CONSTRUCTION', 'REDEVELOPMENT']).optional().default('NEW_CONSTRUCTION'),
});
export type CreateSiteInput = z.input<typeof createSiteSchema>;

export interface Site {
  id: string;
  name: string;
  address: string;
  projectType: 'NEW_CONSTRUCTION' | 'REDEVELOPMENT';
  totalFloors: number | null;
  totalFlats: number | null;
  slug: string;
  isActive: boolean;
  partnerAllocatedFund: number;
  investorAllocatedFund: number;
  allocatedFund: number;
  totalExpenses: number;
  customerPayments: number;
  remainingFund: number;
  totalProfit: number;
  createdAt: string;
  flatsSummary?: FlatsSummary;
}

export interface FlatsSummary {
  available: number;
  booked: number;
  sold: number;
  customerFlats?: number;
  ownerFlats?: number;
}

export interface SiteDetail extends Site {
  flatsSummary: FlatsSummary;
}

export interface SitesResponse {
  ok: boolean;
  data: { sites: Site[] };
}

export interface SiteDetailResponse {
  ok: boolean;
  data: { site: SiteDetail };
}

export type SiteTransferDirection = 'COMPANY_TO_SITE' | 'SITE_TO_COMPANY';

export interface SiteTransferResponse {
  ok: boolean;
  data: {
    transfer: {
      entryGroupId: string;
      direction: SiteTransferDirection;
      amount: number;
      companyEntryId: string;
      siteEntryId: string;
    };
    companyAvailableFund: number;
    siteBalance: number;
    siteAllocatedFund: number;
  };
}

export interface SiteFundHistoryEntry {
  id: string;
  type: 'ALLOCATION' | 'WITHDRAWAL';
  amount: number;
  note: string | null;
  createdAt: string;
  runningBalance?: number;
}

export interface SiteFundHistoryResponse {
  ok: boolean;
  data: { history: SiteFundHistoryEntry[] };
}
