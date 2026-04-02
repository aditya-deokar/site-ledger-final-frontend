import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { investorService } from '@/services/investor.service';
import { CreateInvestorInput, UpdateInvestorInput, TransactionInput } from '@/schemas/investor.schema';

export const useInvestors = (type?: string) => {
  return useQuery({
    queryKey: ['investors', type],
    queryFn: () => investorService.getInvestors(type),
    retry: false,
  });
};

export const useInvestor = (id: string) => {
  return useQuery({
    queryKey: ['investor', id],
    queryFn: () => investorService.getInvestor(id),
    retry: false,
    enabled: !!id,
  });
};

export const useSiteInvestors = (siteId: string) => {
  return useQuery({
    queryKey: ['siteInvestors', siteId],
    queryFn: () => investorService.getSiteInvestors(siteId),
    retry: false,
    enabled: !!siteId,
  });
};

export const useCreateInvestor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvestorInput) => investorService.createInvestor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['siteInvestors'] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateInvestor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvestorInput }) =>
      investorService.updateInvestor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['siteInvestors'] });
      queryClient.invalidateQueries({ queryKey: ['investor'] });
      options?.onSuccess?.();
    },
  });
};

export const useDeleteInvestor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => investorService.deleteInvestor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['siteInvestors'] });
      options?.onSuccess?.();
    },
  });
};

export const useTransactions = (investorId: string) => {
  return useQuery({
    queryKey: ['transactions', investorId],
    queryFn: () => investorService.getTransactions(investorId),
    retry: false,
    enabled: !!investorId,
  });
};

export const useAddTransaction = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ investorId, data }: { investorId: string; data: TransactionInput }) =>
      investorService.addTransaction(investorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor'] });
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['siteInvestors'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      options?.onSuccess?.();
    },
  });
};

export const usePayInterest = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ investorId, data }: { investorId: string; data: TransactionInput }) =>
      investorService.payInterest(investorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor'] });
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      options?.onSuccess?.();
    },
  });
};

export const useReturnInvestment = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ investorId, data }: { investorId: string; data: TransactionInput }) =>
      investorService.returnInvestment(investorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor'] });
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['siteInvestors'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateInvestorPayment = (investorId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, data }: { transactionId: string; data: { amount: number; paymentDate?: string; note?: string } }) =>
      investorService.updateTransactionPayment(investorId, transactionId, data),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['transactions', investorId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', investorId] });
      queryClient.invalidateQueries({ queryKey: ['investor'] });
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      queryClient.invalidateQueries({ queryKey: ['siteInvestors'] });
      options?.onSuccess?.();
    },
  });
};
