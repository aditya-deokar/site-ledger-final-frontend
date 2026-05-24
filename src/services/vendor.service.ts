import api from '@/lib/axios';
import {
  CreateVendorDocumentInput,
  CreateVendorInput,
  UpdateVendorInput,
  VendorAssignmentsResponse,
  VendorDocumentsResponse,
  VendorDocumentUploadResponse,
  VendorListQuery,
  VendorPaymentsResponse,
  VendorProfileResponse,
  VendorReceiptsResponse,
  VendorSiteAssignmentUpsertInput,
  VendorStatementResponse,
  VendorTransactionsResponse,
  VendorsResponse,
  VendorStatus,
} from '@/schemas/vendor.schema';

function buildQueryParams(query?: VendorListQuery) {
  if (!query) return undefined;

  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

function normalizeVendorPayload<T extends Record<string, unknown>>(data: T): T {
  const normalizedEntries = Object.entries(data).map(([key, value]) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return [key, trimmed === '' ? undefined : trimmed];
    }

    return [key, value];
  });

  return Object.fromEntries(normalizedEntries) as T;
}

export const vendorService = {
  getVendors: (query?: VendorListQuery): Promise<VendorsResponse> =>
    api.get('/vendors', { params: buildQueryParams(query) }),

  getVendor: (id: string): Promise<VendorProfileResponse> =>
    api.get(`/vendors/${id}`),

  getVendorTransactions: (id: string, page?: number, size?: number): Promise<VendorTransactionsResponse> =>
    api.get(`/vendors/${id}/transactions`, { params: buildQueryParams({ page, size }) }),

  getVendorBills: (id: string, page?: number, size?: number): Promise<VendorTransactionsResponse> =>
    api.get(`/vendors/${id}/bills`, { params: buildQueryParams({ page, size }) }),

  getVendorPayments: (id: string, page?: number, size?: number): Promise<VendorPaymentsResponse> =>
    api.get(`/vendors/${id}/payments`, { params: buildQueryParams({ page, size }) }),

  getVendorReceipts: (id: string, page?: number, size?: number): Promise<VendorReceiptsResponse> =>
    api.get(`/vendors/${id}/receipts`, { params: buildQueryParams({ page, size }) }),

  getVendorStatement: (id: string, page?: number, size?: number): Promise<VendorStatementResponse> =>
    api.get(`/vendors/${id}/statement`, { params: buildQueryParams({ page, size }) }),

  getVendorAssignments: (id: string): Promise<VendorAssignmentsResponse> =>
    api.get(`/vendors/${id}/site-assignments`),

  upsertVendorAssignment: (id: string, siteId: string, data: VendorSiteAssignmentUpsertInput) =>
    api.put(`/vendors/${id}/site-assignments/${siteId}`, normalizeVendorPayload(data)),

  getVendorDocuments: (id: string): Promise<VendorDocumentsResponse> =>
    api.get(`/vendors/${id}/documents`),

  createVendorDocument: (id: string, data: CreateVendorDocumentInput) =>
    api.post(`/vendors/${id}/documents`, normalizeVendorPayload(data)),

  deleteVendorDocument: (id: string, documentId: string) =>
    api.delete(`/vendors/${id}/documents/${documentId}`),

  uploadVendorDocumentToS3: async (file: File): Promise<string> => {
    const uploadEndpoint = process.env.NEXT_PUBLIC_VENDOR_DOCUMENT_UPLOAD_URL || '/uploads/vendor-document';
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(uploadEndpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }) as VendorDocumentUploadResponse | any;

    const url = response?.data?.url || response?.url;
    if (!url) {
      throw new Error('Upload response missing URL');
    }

    return String(url);
  },

  createVendor: (data: CreateVendorInput) =>
    api.post('/vendors', normalizeVendorPayload(data)),

  updateVendor: (id: string, data: UpdateVendorInput) =>
    api.put(`/vendors/${id}`, normalizeVendorPayload(data)),

  patchVendorStatus: (id: string, status: VendorStatus) =>
    api.patch(`/vendors/${id}/status`, { status }),

  deleteVendor: (id: string) =>
    api.delete(`/vendors/${id}`),
};
