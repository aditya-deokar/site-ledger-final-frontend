import api from '@/lib/axios';
import { CreateSiteInput, SitesResponse, SiteDetailResponse } from '@/schemas/site.schema';

export const siteService = {
  getSites: (showArchived?: 'true' | 'only'): Promise<SitesResponse> =>
    api.get('/sites', { params: showArchived ? { showArchived } : {} }),

  getSite: (id: string): Promise<SiteDetailResponse> =>
    api.get(`/sites/${id}`),

  createSite: (data: CreateSiteInput) =>
    api.post('/sites', data),

  toggleSite: (id: string) =>
    api.patch(`/sites/${id}/toggle`),

  deleteSite: (id: string, keepCustomers = false) =>
    api.delete(`/sites/${id}`, { params: { keepCustomers: String(keepCustomers) } }),

  addFund: (id: string, data: { amount: number; note?: string }) =>
    api.post(`/sites/${id}/fund`, data),

  withdrawFund: (id: string, data: { amount: number; note?: string }) =>
    api.post(`/sites/${id}/withdraw`, data),

  getFloors: (siteId: string) =>
    api.get(`/sites/${siteId}/floors`),

  createFloor: (siteId: string, data: import('@/schemas/site.schema').CreateFloorInput) =>
    api.post(`/sites/${siteId}/floors`, data),

  createFlat: (siteId: string, floorId: string, data: import('@/schemas/site.schema').CreateFlatInput) =>
    api.post(`/sites/${siteId}/floors/${floorId}/flats`, data),

  bookFlat: (siteId: string, flatId: string, data: import('@/schemas/site.schema').BookFlatInput) =>
    api.post(`/sites/${siteId}/flats/${flatId}/customer`, data),

  getExpenses: (siteId: string) =>
    api.get(`/sites/${siteId}/expenses`),

  getFundHistory: (siteId: string) =>
    api.get(`/sites/${siteId}/fund-history`),

  addExpense: (siteId: string, data: import('@/schemas/site.schema').CreateExpenseInput) =>
    api.post(`/sites/${siteId}/expenses`, data),

  updateExpensePayment: (siteId: string, expenseId: string, data: { amount: number; paymentDate?: string; note?: string }) =>
    api.patch(`/sites/${siteId}/expenses/${expenseId}/payment`, data),
};
