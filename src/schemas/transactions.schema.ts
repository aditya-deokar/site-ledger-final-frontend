import { z } from 'zod';

// Customer Payment Schema
export const customerPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().optional(),
  note: z.string().optional(),
  siteId: z.string().min(1, 'Site is required'),
  customerId: z.string().min(1, 'Customer is required'),
});

export type CustomerPaymentInput = z.infer<typeof customerPaymentSchema>;

// Base transaction schema for shared fields
export const baseTransactionSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().optional(),
  note: z.string().optional(),
});

export type BaseTransactionInput = z.infer<typeof baseTransactionSchema>;
