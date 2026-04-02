import api from '@/lib/axios';
import { CreateCompanyInput, UpdateCompanyInput, CompanyResponse, CreateCompanyResponse, PartnerInput } from '@/schemas/company.schema';

export const companyService = {
  createCompany: async (data: CreateCompanyInput): Promise<CreateCompanyResponse> => {
    return api.post('/company', data);
  },

  getCompany: async (): Promise<CompanyResponse> => {
    return api.get('/company');
  },

  updateCompany: async (data: UpdateCompanyInput): Promise<CompanyResponse> => {
    return api.put('/company', data);
  },

  deleteCompany: async (): Promise<{ ok: boolean; data: { message: string } }> => {
    return api.delete('/company');
  },

  addPartner: async (data: PartnerInput) => {
    return api.post('/company/partners', data);
  },

  updatePartner: async (id: string, data: PartnerInput) => {
    return api.put(`/company/partners/${id}`, data);
  },

  deletePartner: async (id: string) => {
    return api.delete(`/company/partners/${id}`);
  },

  withdrawFund: async (data: { amount: number; note?: string }) => {
    return api.post('/company/withdraw', data);
  },

  getActivity: async (cursor?: string) => {
    const params = cursor ? `?cursor=${cursor}` : '';
    return api.get(`/company/activity${params}`);
  },

  getExpenses: async (page: number = 1) => {
    return api.get(`/company/expenses?page=${page}&limit=20`);
  },
};
