import { z } from 'zod';

export const vendorStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'ARCHIVED']);
export type VendorStatus = z.infer<typeof vendorStatusSchema>;

export const vendorSiteAssignmentStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type VendorSiteAssignmentStatus = z.infer<typeof vendorSiteAssignmentStatusSchema>;

export const paymentModeSchema = z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI']);
export type VendorPaymentMode = z.infer<typeof paymentModeSchema>;

export const receiptStatusSchema = z.enum(['ACTIVE', 'VOIDED']);
export type VendorReceiptStatus = z.infer<typeof receiptStatusSchema>;

const optionalTextFieldSchema = z.string().optional().or(z.literal(''));
const optionalEmailFieldSchema = z.string().email('Invalid email').optional().or(z.literal(''));

export const createVendorSchema = z.object({
  name: z.string().trim().min(1, 'Vendor name is required'),
  type: z.string().trim().min(1, 'Vendor category is required'),
  status: vendorStatusSchema.optional(),
  contactPersonName: optionalTextFieldSchema,
  phone: optionalTextFieldSchema,
  email: optionalEmailFieldSchema,
  address: optionalTextFieldSchema,
  gstin: optionalTextFieldSchema,
  pan: optionalTextFieldSchema,
  bankAccountName: optionalTextFieldSchema,
  bankName: optionalTextFieldSchema,
  accountNumber: optionalTextFieldSchema,
  ifscCode: optionalTextFieldSchema,
  upiId: optionalTextFieldSchema,
  paymentTermsDays: z.number().int().min(0).max(3650).optional(),
  notes: optionalTextFieldSchema,
  openingBalanceAmount: z.number().min(0).optional(),
  openingBalanceDate: optionalTextFieldSchema,
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = createVendorSchema.partial();
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export const vendorSiteAssignmentUpsertSchema = z.object({
  status: vendorSiteAssignmentStatusSchema.optional(),
  isPreferred: z.boolean().optional(),
  paymentTermsDaysOverride: z.number().int().min(0).max(3650).nullable().optional(),
  notes: optionalTextFieldSchema,
});
export type VendorSiteAssignmentUpsertInput = z.infer<typeof vendorSiteAssignmentUpsertSchema>;

export const createVendorDocumentSchema = z.object({
  documentType: z.string().trim().min(1, 'Document type is required'),
  documentName: z.string().trim().min(1, 'Document name is required'),
  fileUrl: z.string().url('Document URL is required'),
  note: optionalTextFieldSchema,
  siteId: z.string().optional(),
  expenseId: z.string().optional(),
});
export type CreateVendorDocumentInput = z.infer<typeof createVendorDocumentSchema>;

export type VendorListQuery = {
  type?: string;
  search?: string;
  status?: VendorStatus;
  siteId?: string;
  hasOutstanding?: boolean;
  hasDocuments?: boolean;
  includeArchived?: boolean;
  page?: number;
  size?: number;
};

export interface PaginationMeta {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface VendorBase {
  id: string;
  name: string;
  type: string;
  status: VendorStatus;
  contactPersonName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  upiId: string | null;
  paymentTermsDays: number | null;
  notes: string | null;
  openingBalanceAmount: number;
  openingBalanceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorAssignment {
  id: string;
  siteId: string;
  siteName: string;
  status: VendorSiteAssignmentStatus;
  isPreferred: boolean;
  paymentTermsDaysOverride: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorListItem extends VendorBase {
  siteCount: number;
  documentCount: number;
  billCount: number;
  paymentCount: number;
  overdueBillCount: number;
  totalExpenses: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  remainingBalance: number;
  lastBillDate: string | null;
  lastPaymentDate: string | null;
}

export type Vendor = VendorListItem;

export interface VendorSummary extends VendorListItem {
  assignments: VendorAssignment[];
}

export type VendorProfile = VendorSummary;

export interface VendorDocument {
  id: string;
  vendorId: string;
  siteId: string | null;
  siteName: string | null;
  expenseId: string | null;
  billNumber: string | null;
  documentType: string;
  documentName: string;
  fileUrl: string;
  note: string | null;
  uploadedAt: string;
}

export interface VendorBill {
  id: string;
  siteId: string;
  amount: number;
  amountPaid: number;
  remaining: number;
  paymentDate: string | null;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  description: string | null;
  reason: string | null;
  siteName: string;
  billNumber: string | null;
  billDate: string;
  dueDate: string | null;
  isOverdue: boolean;
  documentCount: number;
  createdAt: string;
}

export type VendorTransaction = VendorBill;

export interface VendorPaymentReceiptSummary {
  id: string;
  receiptNumber: string;
  status: VendorReceiptStatus;
  createdAt: string;
}

export interface VendorPayment {
  id: string;
  expenseId: string;
  expenseAmount: number;
  amount: number;
  direction: 'IN' | 'OUT';
  note: string | null;
  paymentMode: VendorPaymentMode | null;
  referenceNumber: string | null;
  siteId: string | null;
  siteName: string | null;
  description: string | null;
  reason: string | null;
  billNumber: string | null;
  createdAt: string;
  paymentDate: string;
  receipt: VendorPaymentReceiptSummary | null;
}

export interface VendorReceipt {
  id: string;
  paymentId: string;
  expenseId: string;
  siteId: string | null;
  siteName: string | null;
  siteAddress: string | null;
  vendorId: string;
  vendorName: string;
  vendorType: string;
  contactPersonName: string | null;
  vendorPhone: string | null;
  vendorEmail: string | null;
  vendorAddress: string | null;
  vendorGstin: string | null;
  vendorPan: string | null;
  billNumber: string | null;
  billAmount: number;
  billDate: string;
  dueDate: string | null;
  description: string | null;
  reason: string | null;
  amount: number;
  amountPaidToDate: number;
  balanceDue: number;
  paymentMode: VendorPaymentMode | null;
  referenceNumber: string | null;
  note: string | null;
  date: string;
  receiptNumber: string;
  status: VendorReceiptStatus;
  createdAt: string;
}

export interface VendorStatementEntry {
  id: string;
  entryType: 'OPENING_BALANCE' | 'BILL' | 'PAYMENT';
  referenceId: string;
  expenseId: string | null;
  date: string;
  billAmount: number;
  paymentAmount: number;
  balance: number;
  description: string | null;
  reason: string | null;
  note: string | null;
  siteId: string | null;
  siteName: string | null;
  billNumber: string | null;
  dueDate: string | null;
  paymentMode: VendorPaymentMode | null;
  referenceNumber: string | null;
}

export interface VendorsResponse {
  ok: boolean;
  data: {
    vendors: VendorListItem[];
    pagination: PaginationMeta;
  };
}

export interface VendorProfileResponse {
  ok: boolean;
  data: { vendor: VendorSummary };
}

export interface VendorTransactionsResponse {
  ok: boolean;
  data: {
    transactions: VendorTransaction[];
    totalPaid: number;
    totalBilled: number;
    totalOutstanding: number;
    billCount: number;
    overdueBillCount: number;
    pagination: PaginationMeta;
  };
}

export interface VendorPaymentsResponse {
  ok: boolean;
  data: {
    payments: VendorPayment[];
    totalPaid: number;
    paymentCount: number;
    pagination: PaginationMeta;
  };
}

export interface VendorReceiptsResponse {
  ok: boolean;
  data: {
    receipts: VendorReceipt[];
    pagination: PaginationMeta;
  };
}

export interface VendorStatementResponse {
  ok: boolean;
  data: {
    statement: VendorStatementEntry[];
    totalBilled: number;
    totalPaid: number;
    closingBalance: number;
    pagination: PaginationMeta;
  };
}

export interface VendorAssignmentsResponse {
  ok: boolean;
  data: {
    assignments: VendorAssignment[];
  };
}

export interface VendorDocumentsResponse {
  ok: boolean;
  data: {
    documents: VendorDocument[];
  };
}

export interface VendorDocumentUploadResponse {
  ok: boolean;
  data: {
    key: string;
    url: string;
  };
}
