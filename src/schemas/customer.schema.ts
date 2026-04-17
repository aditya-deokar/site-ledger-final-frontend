import { z } from 'zod';

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const recordPaymentSchema = z.object({
  amount: z.number().positive('Amount is required'),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const cancelDealSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required'),
  refundAmount: z.coerce.number().min(0, 'Refund amount cannot be negative'),
});
export type CancelDealInput = z.infer<typeof cancelDealSchema>;

export type DealStatus = 'ACTIVE' | 'CANCELLED';
export type CustomerFlatStatus = 'BOOKED' | 'SOLD' | 'AVAILABLE';
export type CustomerPaymentMovementType = 'CUSTOMER_PAYMENT' | 'CUSTOMER_REFUND';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  sellingPrice: number;
  bookingAmount: number;
  amountPaid: number;
  remaining: number;
  dealStatus: DealStatus;
  flatId: string | null;
  flatNumber: number | null;
  customFlatId?: string | null;
  floorNumber: number | null;
  floorName?: string | null;
  customerType?: 'CUSTOMER' | 'EXISTING_OWNER' | null;
  flatStatus: CustomerFlatStatus | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledByUserId: string | null;
  cancelledFromFlatStatus: CustomerFlatStatus | null;
  cancelledFlatId: string | null;
  cancelledFlatDisplay: string | null;
  cancelledFloorNumber: number | null;
  cancelledFloorName: string | null;
  createdAt: string;
}

export interface SiteCustomersResponse {
  ok: boolean;
  data: { customers: Customer[] };
}

export interface AllCustomersResponse {
  ok: boolean;
  data: {
    customers: Array<Customer & { siteId: string | null; siteName: string | null }>;
  };
}

export interface CustomerPaymentHistoryItem {
  id: string;
  amount: number;
  direction: 'IN' | 'OUT';
  movementType: CustomerPaymentMovementType;
  note: string | null;
  createdAt: string;
}

export interface CustomerPaymentsResponse {
  ok: boolean;
  data: { payments: CustomerPaymentHistoryItem[] };
}
