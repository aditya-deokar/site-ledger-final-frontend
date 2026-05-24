import api from '@/lib/axios';
import { createClientIdempotencyKey } from '@/lib/idempotency';
import {
  CreateInvestorInput,
  type InvestorMutationResponse,
  InvestorDetailResponse,
  SiteInvestorsResponse,
  InvestorsResponse,
  TransactionInput,
  TransactionsResponse,
  UpdateInvestorInput,
} from '@/schemas/investor.schema';

export const investorService = {
  getInvestors: (type?: string, search?: string): Promise<InvestorsResponse> =>
    api.get('/investors', {
      params: {
        ...(type ? { type } : {}),
        ...(search ? { search } : {}),
      },
    }),

  getInvestor: (id: string): Promise<InvestorDetailResponse> =>
    api.get(`/investors/${id}`),

  createInvestor: (data: CreateInvestorInput): Promise<InvestorMutationResponse> =>
    api.post('/investors', data),

  updateInvestor: (id: string, data: UpdateInvestorInput): Promise<InvestorMutationResponse> =>
    api.put(`/investors/${id}`, data),

  deleteInvestor: (id: string) =>
    api.delete(`/investors/${id}`),

  // Site-scoped equity investors
  getSiteInvestors: (siteId: string): Promise<SiteInvestorsResponse> =>
    api.get(`/sites/${siteId}/investors`),

  // Transactions
  getTransactions: (investorId: string, page?: number, size?: number): Promise<TransactionsResponse> =>
    api.get(`/investors/${investorId}/transactions`, { params: { page, size } }),

  addTransaction: (investorId: string, data: TransactionInput) =>
    api.post(`/investors/${investorId}/transactions`, {
      ...data,
      idempotencyKey: createClientIdempotencyKey(`investor-principal-in:${investorId}`),
    }),

  returnInvestment: (investorId: string, data: TransactionInput) =>
    api.post(`/investors/${investorId}/return`, {
      ...data,
      idempotencyKey: createClientIdempotencyKey(`investor-principal-out:${investorId}`),
    }),

  payInterest: (investorId: string, data: TransactionInput) =>
    api.post(`/investors/${investorId}/interest`, {
      ...data,
      idempotencyKey: createClientIdempotencyKey(`investor-interest:${investorId}`),
    }),

  updateTransactionPayment: (investorId: string, transactionId: string, data: { amount: number; note?: string }) =>
    api.patch(`/investors/${investorId}/transactions/${transactionId}/payment`, {
      ...data,
      idempotencyKey: createClientIdempotencyKey(`investor-payment:${transactionId}`),
    }),
};
