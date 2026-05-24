import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { investorService } from '@/services/investor.service';
import {
  CreateInvestorInput,
  type Investor,
  TransactionInput,
  UpdateInvestorInput,
} from '@/schemas/investor.schema';

export const investorKeys = {
  all: ['investors'] as const,
  list: (type?: Investor['type'], search?: string) => [
    'investors',
    type ?? '',
    search ?? '',
  ] as const,
  detailRoot: ['investor'] as const,
  detail: (id?: string) => ['investor', id ?? ''] as const,
  siteRoot: ['siteInvestors'] as const,
  site: (siteId?: string) => ['siteInvestors', siteId ?? ''] as const,
  transactionsRoot: ['investorTransactions'] as const,
  transactionsByInvestor: (investorId?: string) => ['investorTransactions', investorId ?? ''] as const,
} as const;

function invalidateInvestorDirectory(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: investorKeys.all });
  queryClient.invalidateQueries({ queryKey: investorKeys.siteRoot });
  queryClient.invalidateQueries({ queryKey: ['activity'] });
}

function invalidateInvestorProfile(
  queryClient: ReturnType<typeof useQueryClient>,
  investorId?: string,
) {
  if (investorId) {
    queryClient.invalidateQueries({ queryKey: investorKeys.detail(investorId) });
  } else {
    queryClient.invalidateQueries({ queryKey: investorKeys.detailRoot });
  }

  invalidateInvestorDirectory(queryClient);
}

function invalidateInvestorFinancials(
  queryClient: ReturnType<typeof useQueryClient>,
  investorId?: string,
) {
  if (investorId) {
    queryClient.invalidateQueries({ queryKey: investorKeys.detail(investorId) });
    queryClient.invalidateQueries({
      queryKey: investorKeys.transactionsByInvestor(investorId),
    });
  } else {
    queryClient.invalidateQueries({ queryKey: investorKeys.detailRoot });
    queryClient.invalidateQueries({ queryKey: investorKeys.transactionsRoot });
  }

  queryClient.invalidateQueries({ queryKey: investorKeys.all });
  queryClient.invalidateQueries({ queryKey: investorKeys.siteRoot });
  queryClient.invalidateQueries({ queryKey: ['site'] });
  queryClient.invalidateQueries({ queryKey: ['company'] });
  queryClient.invalidateQueries({ queryKey: ['activity'] });
}

export const useInvestors = (
  type?: Investor['type'],
  search?: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: investorKeys.list(type, search),
    queryFn: () => investorService.getInvestors(type, search),
    placeholderData: (previousData) => previousData,
    retry: false,
    enabled: options?.enabled,
  });
};

export const useInvestor = (id?: string) => {
  return useQuery({
    queryKey: investorKeys.detail(id),
    queryFn: () => investorService.getInvestor(id!),
    retry: false,
    enabled: Boolean(id),
  });
};

export const useSiteInvestors = (siteId?: string) => {
  return useQuery({
    queryKey: investorKeys.site(siteId),
    queryFn: () => investorService.getSiteInvestors(siteId!),
    retry: false,
    enabled: Boolean(siteId),
  });
};

export const useCreateInvestor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvestorInput) => investorService.createInvestor(data),
    onSuccess: (response) => {
      invalidateInvestorProfile(queryClient, response?.data?.investor?.id);
      options?.onSuccess?.();
    },
  });
};

export const useUpdateInvestor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvestorInput }) =>
      investorService.updateInvestor(id, data),
    onSuccess: (_, variables) => {
      invalidateInvestorProfile(queryClient, variables.id);
      options?.onSuccess?.();
    },
  });
};

export const useDeleteInvestor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => investorService.deleteInvestor(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: investorKeys.all });
      queryClient.invalidateQueries({ queryKey: investorKeys.siteRoot });
      queryClient.removeQueries({ queryKey: investorKeys.detail(id) });
      queryClient.removeQueries({ queryKey: investorKeys.transactionsByInvestor(id) });
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useTransactions = (investorId?: string) => {
  return useQuery({
    queryKey: investorKeys.transactionsByInvestor(investorId),
    queryFn: () => investorService.getTransactions(investorId!),
    retry: false,
    enabled: Boolean(investorId),
  });
};

export const useAddTransaction = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ investorId, data }: { investorId: string; data: TransactionInput }) =>
      investorService.addTransaction(investorId, data),
    onSuccess: (_, variables) => {
      invalidateInvestorFinancials(queryClient, variables.investorId);
      options?.onSuccess?.();
    },
  });
};

export const usePayInterest = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ investorId, data }: { investorId: string; data: TransactionInput }) =>
      investorService.payInterest(investorId, data),
    onSuccess: (_, variables) => {
      invalidateInvestorFinancials(queryClient, variables.investorId);
      options?.onSuccess?.();
    },
  });
};

export const useReturnInvestment = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ investorId, data }: { investorId: string; data: TransactionInput }) =>
      investorService.returnInvestment(investorId, data),
    onSuccess: (_, variables) => {
      invalidateInvestorFinancials(queryClient, variables.investorId);
      options?.onSuccess?.();
    },
  });
};

export const useUpdateInvestorPayment = (investorId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, data }: { transactionId: string; data: { amount: number; note?: string } }) =>
      investorService.updateTransactionPayment(investorId, transactionId, data),
    onSuccess: () => {
      invalidateInvestorFinancials(queryClient, investorId);
      options?.onSuccess?.();
    },
  });
};
