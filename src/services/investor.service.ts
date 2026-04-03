import api from '@/lib/axios';
import {
  CreateInvestorInput,
  UpdateInvestorInput,
  TransactionInput,
  InvestorsResponse,
  InvestorDetailResponse,
  SiteInvestorsResponse,
  TransactionsResponse,
} from '@/schemas/investor.schema';

export const investorService = {
  getInvestors: (type?: string): Promise<InvestorsResponse> =>
    api.get('/investors', { params: type ? { type } : {} }),

  getInvestor: (id: string): Promise<InvestorDetailResponse> =>
    api.get(`/investors/${id}`),

  createInvestor: (data: CreateInvestorInput) =>
    api.post('/investors', data),

  updateInvestor: (id: string, data: UpdateInvestorInput) =>
    api.put(`/investors/${id}`, data),

  deleteInvestor: (id: string) =>
    api.delete(`/investors/${id}`),

  // Site-scoped equity investors
  getSiteInvestors: (siteId: string): Promise<SiteInvestorsResponse> =>
    api.get(`/sites/${siteId}/investors`),

  // Transactions
  getTransactions: (investorId: string): Promise<TransactionsResponse> =>
    api.get(`/investors/${investorId}/transactions`),

  addTransaction: (investorId: string, data: TransactionInput) =>
    api.post(`/investors/${investorId}/transactions`, data),

  returnInvestment: (investorId: string, data: TransactionInput) =>
    api.post(`/investors/${investorId}/return`, data),

  payInterest: (investorId: string, data: TransactionInput) =>
    api.post(`/investors/${investorId}/interest`, data),

  updateTransactionPayment: (investorId: string, transactionId: string, data: { amount: number; note?: string }) =>
    api.patch(`/investors/${investorId}/transactions/${transactionId}/payment`, data),
};
