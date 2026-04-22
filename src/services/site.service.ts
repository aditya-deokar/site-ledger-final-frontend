import api from '@/lib/axios';
import { CreateSiteInput, SiteDetailResponse, SiteTransferDirection, SiteTransferResponse, SitesResponse, SiteFundHistoryResponse, WingsResponse } from '@/schemas/site.schema';
import { SiteReportResponse } from '@/schemas/site-report.schema';

export const siteService = {
  getSites: (showArchived?: 'true' | 'only'): Promise<SitesResponse> =>
    api.get('/sites', { params: showArchived ? { showArchived } : {} }),

  getSite: (id: string): Promise<SiteDetailResponse> =>
    api.get(`/sites/${id}`),

  getSiteReport: (id: string): Promise<SiteReportResponse> =>
    api.get(`/sites/${id}/report`),

  createSite: (data: CreateSiteInput) =>
    api.post('/sites', data),

  toggleSite: (id: string) =>
    api.patch(`/sites/${id}/toggle`),

  deleteSite: (id: string, keepCustomers = false) =>
    api.delete(`/sites/${id}`, { params: { keepCustomers: String(keepCustomers) } }),

  transfer: (id: string, data: { amount: number; direction: SiteTransferDirection; note?: string }) : Promise<SiteTransferResponse> =>
    api.post(`/sites/${id}/transfer`, data),

  addFund: (id: string, data: { amount: number; note?: string }) =>
    siteService.transfer(id, { ...data, direction: 'COMPANY_TO_SITE' }),

  withdrawFund: (id: string, data: { amount: number; note?: string }) =>
    siteService.transfer(id, { ...data, direction: 'SITE_TO_COMPANY' }),

  getFloors: (siteId: string) =>
    api.get(`/sites/${siteId}/floors`),

  getWings: (siteId: string): Promise<WingsResponse> =>
    api.get(`/sites/${siteId}/wings`),

  createWing: (siteId: string, data: { name: string }) =>
    api.post(`/sites/${siteId}/wings`, data),

  updateWing: (siteId: string, wingId: string, data: { name: string }) =>
    api.patch(`/sites/${siteId}/wings/${wingId}`, data),

  deleteWing: (siteId: string, wingId: string) =>
    api.delete(`/sites/${siteId}/wings/${wingId}`),

  createFloor: (siteId: string, data: import('@/schemas/site.schema').CreateFloorInput) =>
    api.post(`/sites/${siteId}/floors`, data),

  updateFloor: (siteId: string, floorId: string, data: import('@/schemas/site.schema').CreateFloorInput) =>
    api.patch(`/sites/${siteId}/floors/${floorId}`, data),

  deleteFloor: (siteId: string, floorId: string) =>
    api.delete(`/sites/${siteId}/floors/${floorId}`),

  createFlat: (siteId: string, floorId: string, data: import('@/schemas/site.schema').CreateFlatInput) =>
    api.post(`/sites/${siteId}/floors/${floorId}/flats`, data),

  updateFlatDetails: (siteId: string, flatId: string, data: import('@/schemas/site.schema').UpdateFlatDetailsInput) =>
    api.patch(`/sites/${siteId}/flats/${flatId}`, data),

  deleteFlat: (siteId: string, flatId: string) =>
    api.delete(`/sites/${siteId}/flats/${flatId}`),

  bookFlat: (siteId: string, flatId: string, data: import('@/schemas/site.schema').BookFlatInput) =>
    api.post(`/sites/${siteId}/flats/${flatId}/customer`, data),

  getExpenses: (siteId: string) =>
    api.get(`/sites/${siteId}/expenses`),

  getFundHistory: (siteId: string): Promise<SiteFundHistoryResponse> =>
    api.get(`/sites/${siteId}/fund-history`),

  addExpense: (siteId: string, data: import('@/schemas/site.schema').CreateExpenseInput) =>
    api.post(`/sites/${siteId}/expenses`, data),

  updateExpensePayment: (siteId: string, expenseId: string, data: { amount: number; note?: string }) =>
    api.patch(`/sites/${siteId}/expenses/${expenseId}/payment`, data),
};
