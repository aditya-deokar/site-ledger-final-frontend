import api from '@/lib/axios';
import {
  CreateVendorInput,
  UpdateVendorInput,
  VendorPaymentsResponse,
  VendorProfileResponse,
  VendorStatementResponse,
  VendorTransactionsResponse,
  VendorsResponse,
} from '@/schemas/vendor.schema';

export const vendorService = {
  getVendors: (type?: string): Promise<VendorsResponse> =>
    api.get('/vendors', { params: type ? { type } : {} }),

  getVendor: (id: string): Promise<VendorProfileResponse> =>
    api.get(`/vendors/${id}`),

  getVendorTransactions: (id: string): Promise<VendorTransactionsResponse> =>
    api.get(`/vendors/${id}/transactions`),

  getVendorPayments: (id: string): Promise<VendorPaymentsResponse> =>
    api.get(`/vendors/${id}/payments`),

  getVendorStatement: (id: string): Promise<VendorStatementResponse> =>
    api.get(`/vendors/${id}/statement`),

  createVendor: (data: CreateVendorInput) =>
    api.post('/vendors', data),

  updateVendor: (id: string, data: UpdateVendorInput) =>
    api.put(`/vendors/${id}`, data),

  deleteVendor: (id: string) =>
    api.delete(`/vendors/${id}`),
};
