import { z } from 'zod';

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  amountPaid: z.number().min(0).optional(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const recordPaymentSchema = z.object({
  amountPaid: z.number().min(0, 'Amount is required'),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  sellingPrice: number;
  bookingAmount: number;
  amountPaid: number;
  remaining: number;
  flatId: string;
  flatNumber: number;
  customFlatId?: string;
  floorNumber: number;
  floorName?: string;
  customerType?: 'CUSTOMER' | 'EXISTING_OWNER' | null;
  flatStatus: 'BOOKED' | 'SOLD' | 'AVAILABLE';
  createdAt: string;
}

export interface SiteCustomersResponse {
  ok: boolean;
  data: { customers: Customer[] };
}
