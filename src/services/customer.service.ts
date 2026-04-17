import api from '@/lib/axios';
import {
  AllCustomersResponse,
  CancelDealInput,
  CustomerPaymentsResponse,
  SiteCustomersResponse,
  UpdateCustomerInput,
} from '@/schemas/customer.schema';

export const customerService = {
  getAllCustomers: (status?: string): Promise<AllCustomersResponse> =>
    api.get('/customers', { params: status ? { status } : {} }),

  getSiteCustomers: (siteId: string): Promise<SiteCustomersResponse> =>
    api.get(`/sites/${siteId}/customers`),

  getFlatCustomer: (siteId: string, flatId: string) =>
    api.get(`/sites/${siteId}/flats/${flatId}/customer`),

  updateCustomer: (siteId: string, flatId: string, customerId: string, data: UpdateCustomerInput) =>
    api.put(`/sites/${siteId}/flats/${flatId}/customer/${customerId}`, data),

  recordPayment: (customerId: string, data: { amount: number; note?: string }) =>
    api.patch(`/customers/${customerId}/payment`, data),

  getPayments: (customerId: string): Promise<CustomerPaymentsResponse> =>
    api.get(`/customers/${customerId}/payments`),

  cancelDeal: (siteId: string, flatId: string, customerId: string, data: CancelDealInput) =>
    api.patch(`/sites/${siteId}/flats/${flatId}/customer/${customerId}/cancel`, data),
};
