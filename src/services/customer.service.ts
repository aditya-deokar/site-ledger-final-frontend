import api from '@/lib/axios';
import {
  AllCustomersResponse,
  CancelDealInput,
  CustomerAgreementLineInput,
  CustomerAgreementResponse,
  CustomerPaymentsResponse,
  RecordPaymentInput,
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

  recordPayment: (customerId: string, data: RecordPaymentInput) =>
    api.patch(`/customers/${customerId}/payment`, data),

  getPayments: (customerId: string): Promise<CustomerPaymentsResponse> =>
    api.get(`/customers/${customerId}/payments`),

  getAgreement: (customerId: string): Promise<CustomerAgreementResponse> =>
    api.get(`/customers/${customerId}/agreement`),

  addAgreementLine: (customerId: string, data: CustomerAgreementLineInput) =>
    api.post(`/customers/${customerId}/agreement-lines`, data),

  updateAgreementLine: (customerId: string, lineId: string, data: CustomerAgreementLineInput) =>
    api.put(`/customers/${customerId}/agreement-lines/${lineId}`, data),

  deleteAgreementLine: (customerId: string, lineId: string) =>
    api.delete(`/customers/${customerId}/agreement-lines/${lineId}`),

  cancelDeal: (siteId: string, flatId: string, customerId: string, data: CancelDealInput) =>
    api.patch(`/sites/${siteId}/flats/${flatId}/customer/${customerId}/cancel`, data),
};
