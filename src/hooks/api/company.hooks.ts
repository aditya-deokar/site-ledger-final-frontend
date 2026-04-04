import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { companyService } from '@/services/company.service';
import { CreateCompanyInput, UpdateCompanyInput, PartnerInput } from '@/schemas/company.schema';
import { useRouter } from 'next/navigation';

export const useCreateCompany = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyInput) => companyService.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      router.push('/dashboard');
    },
  });
};

export const useCompany = () => {
  return useQuery({
    queryKey: ['company'],
    queryFn: () => companyService.getCompany(),
    retry: false,
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCompanyInput) => companyService.updateCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
};

export const useAddPartner = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PartnerInput) => companyService.addPartner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdatePartner = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PartnerInput }) =>
      companyService.updatePartner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useBatchUpdatePartners = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (partners: Array<{ id: string; data: PartnerInput }>) =>
      Promise.all(partners.map(({ id, data }) => companyService.updatePartner(id, data))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useDeletePartner = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyService.deletePartner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useActivity = () => {
  return useInfiniteQuery({
    queryKey: ['activity'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => companyService.getActivity(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => lastPage?.data?.nextCursor ?? undefined,
  });
};

export const useCompanyExpenses = (page: number = 1) => {
  return useQuery({
    queryKey: ['company-expenses', page],
    queryFn: () => companyService.getExpenses(page),
  });
};

export const useWithdrawFund = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; note?: string }) => companyService.withdrawFund(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company'] });
      await queryClient.invalidateQueries({ queryKey: ['company-withdrawals'] });
      await queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useWithdrawals = () => {
  return useQuery({
    queryKey: ['company-withdrawals'],
    queryFn: () => companyService.getWithdrawals(),
    retry: false,
  });
};

export const useWithdrawal = (id: string) => {
  return useQuery({
    queryKey: ['company-withdrawal', id],
    queryFn: () => companyService.getWithdrawal(id),
    retry: false,
    enabled: !!id,
  });
};

export const useRecordWithdrawalPayment = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount: number; note?: string } }) =>
      companyService.recordWithdrawalPayment(id, data),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['company'] });
      await queryClient.invalidateQueries({ queryKey: ['company-withdrawals'] });
      await queryClient.invalidateQueries({ queryKey: ['company-withdrawal', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['company-withdrawal-payments', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useWithdrawalPayments = (id: string) => {
  return useQuery({
    queryKey: ['company-withdrawal-payments', id],
    queryFn: () => companyService.getWithdrawalPayments(id),
    retry: false,
    enabled: !!id,
  });
};

export const useDeleteCompany = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => companyService.deleteCompany(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      router.push('/setup-company');
    },
  });
};
