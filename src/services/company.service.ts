import api from '@/lib/axios';
import { createClientIdempotencyKey } from '@/lib/idempotency';
import {
  CompanyActivityResponse,
  CompanyResponse,
  CompanyWithdrawalPaymentsResponse,
  CompanyWithdrawalResponse,
  CompanyWithdrawalsResponse,
  CreateCompanyInput,
  CreateCompanyResponse,
  PartnerInput,
  UpdateCompanyInput,
} from '@/schemas/company.schema';

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
    return api.post('/company/partners', {
      ...data,
      idempotencyKey: createClientIdempotencyKey('partner-create'),
    });
  },

  updatePartner: async (id: string, data: PartnerInput) => {
    return api.put(`/company/partners/${id}`, {
      ...data,
      idempotencyKey: createClientIdempotencyKey(`partner-update:${id}`),
    });
  },

  deletePartner: async (id: string) => {
    return api.delete(`/company/partners/${id}`);
  },

  withdrawFund: async (data: { amount: number; note?: string }) => {
    return api.post('/company/withdraw', {
      ...data,
      idempotencyKey: createClientIdempotencyKey('company-withdraw'),
    });
  },

  getWithdrawals: async (): Promise<CompanyWithdrawalsResponse> => {
    return api.get('/company/withdrawals');
  },

  getWithdrawal: async (id: string): Promise<CompanyWithdrawalResponse> => {
    return api.get(`/company/withdrawals/${id}`);
  },

  recordWithdrawalPayment: async (id: string, data: { amount: number; note?: string }): Promise<CompanyWithdrawalResponse> => {
    return api.patch(`/company/withdrawals/${id}/payment`, {
      ...data,
      idempotencyKey: createClientIdempotencyKey(`company-withdrawal-payment:${id}`),
    });
  },

  updateWithdrawalNote: async (id: string, data: { note?: string }): Promise<CompanyWithdrawalResponse> => {
    return api.patch(`/company/withdrawals/${id}`, data);
  },

  deleteWithdrawal: async (id: string): Promise<{ ok: boolean; data: { message: string } }> => {
    return api.delete(`/company/withdrawals/${id}`);
  },

  getWithdrawalPayments: async (id: string): Promise<CompanyWithdrawalPaymentsResponse> => {
    return api.get(`/company/withdrawals/${id}/payments`);
  },

  getPartnerLedger: async (partnerId: string) => {
    return api.get(`/company/partners/${partnerId}/ledger`);
  },

  getActivity: async (cursor?: string, limit?: number): Promise<CompanyActivityResponse> => {
    const searchParams = new URLSearchParams();
    if (cursor) searchParams.set('cursor', cursor);
    if (limit) searchParams.set('limit', String(limit));
    const params = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return api.get(`/company/activity${params}`);
  },

  getExpenses: async (page: number = 1) => {
    return api.get(`/company/expenses?page=${page}&limit=20`);
  },

  uploadLogoToS3: async (file: File): Promise<string> => {
    const uploadEndpoint = process.env.NEXT_PUBLIC_COMPANY_LOGO_UPLOAD_URL || '/uploads/company-logo';
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(uploadEndpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }) as any;

    const url = response?.data?.url || response?.data?.data?.url || response?.url;
    if (!url) {
      throw new Error('Upload response missing URL');
    }

    return String(url);
  },
};
