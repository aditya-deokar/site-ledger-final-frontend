import api from '@/lib/axios';
import { CreateVendorInput, UpdateVendorInput, VendorsResponse, VendorProfileResponse, VendorTransactionsResponse } from '@/schemas/vendor.schema';

export const vendorService = {
  getVendors: (type?: string): Promise<VendorsResponse> =>
    api.get('/vendors', { params: type ? { type } : {} }),

  getVendor: (id: string): Promise<VendorProfileResponse> =>
    api.get(`/vendors/${id}`),

  getVendorTransactions: (id: string): Promise<VendorTransactionsResponse> =>
    api.get(`/vendors/${id}/transactions`),

  createVendor: (data: CreateVendorInput) =>
    api.post('/vendors', data),

  updateVendor: (id: string, data: UpdateVendorInput) =>
    api.put(`/vendors/${id}`, data),

  deleteVendor: (id: string) =>
    api.delete(`/vendors/${id}`),
};
