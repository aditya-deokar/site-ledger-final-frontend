import { z } from 'zod';
import { paymentModeSchema } from './customer.schema';

export const bookFlatSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  sellingPrice: z.number().min(0, 'Required'),
  bookingAmount: z.number().min(0),
  paymentMode: paymentModeSchema.optional(),
  referenceNumber: z.string().optional().or(z.literal('')),
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
  createdAt: string;
}

export interface Flat {
  id: string;
  flatNumber: number | null;
  customFlatId: string | null;
  unitType: string | null;
  status: 'AVAILABLE' | 'BOOKED' | 'SOLD';
  flatType: 'CUSTOMER' | 'EXISTING_OWNER';
  customer: FlatCustomer | null;
}

export interface Floor {
  id: string;
  floorNumber: number;
  floorName: string | null;
  wingId?: string | null;
  wingName?: string | null;
  flats: Flat[];
}

export interface FloorsResponse {
  ok: boolean;
  data: { floors: Floor[] };
}

export const createFloorSchema = z.object({
  floorName: z.string().min(1, 'Floor name is required'),
  wingId: z.string().optional(),
});
export type CreateFloorInput = z.infer<typeof createFloorSchema>;

export const createFlatSchema = z.object({
  customFlatId: z.string().min(1, 'Flat ID is required'),
  unitType: z.string().trim().min(1, 'Unit type is required').optional(),
  flatType: z.enum(['CUSTOMER', 'EXISTING_OWNER']).optional().default('CUSTOMER'),
});
export type CreateFlatInput = z.input<typeof createFlatSchema>;

export const updateFlatDetailsSchema = z.object({
  customFlatId: z.string().min(1, 'Flat ID is required'),
  unitType: z.string().trim().min(1, 'Unit type is required').optional(),
  floorId: z.string().min(1, 'Floor is required').optional(),
  flatType: z.enum(['CUSTOMER', 'EXISTING_OWNER']).optional().default('CUSTOMER'),
});
export type UpdateFlatDetailsInput = z.input<typeof updateFlatDetailsSchema>;

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
  totalFloors: z.number().int('Total floors must be a whole number').min(1, 'Total floors must be at least 1').optional(),
  totalFlats: z.number().int('Total flats must be a whole number').min(1, 'Total flats must be at least 1').optional(),
  hasMultipleWings: z.boolean().optional().default(false),
  wings: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Wing name is required'),
        floorCount: z.number().int('Floor count must be a whole number').min(1, 'Each wing needs at least 1 floor'),
      }),
    )
    .optional(),
}).superRefine((data, ctx) => {
  const hasWings = (data.wings?.length ?? 0) > 0;

  if (data.hasMultipleWings && !hasWings) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wings'],
      message: 'Add at least one wing when multiple wings is enabled.',
    });
  }

  if (!hasWings && data.totalFlats && !data.totalFloors) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['totalFloors'],
      message: 'Add at least 1 floor before generating flats.',
    });
  }
});
export type CreateSiteInput = z.input<typeof createSiteSchema>;

export interface Wing {
  id: string;
  siteId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  floorsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WingsResponse {
  ok: boolean;
  data: { wings: Wing[] };
}

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
