import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { siteService } from '@/services/site.service';
import { CreateSiteInput, BookFlatInput, CreateExpenseInput, CreateFloorInput, CreateFlatInput } from '@/schemas/site.schema';

export const useSites = (showArchived?: 'true' | 'only') => {
  return useQuery({
    queryKey: ['sites', showArchived ?? 'active'],
    queryFn: () => siteService.getSites(showArchived),
    retry: false,
  });
};

export const useSite = (id: string) => {
  return useQuery({
    queryKey: ['site', id],
    queryFn: () => siteService.getSite(id),
    retry: false,
    enabled: !!id,
  });
};

export const useCreateSite = (options?: { onSuccess?: (data: any) => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSiteInput) => siteService.createSite(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      options?.onSuccess?.(data);
    },
  });
};

export const useToggleSite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => siteService.toggleSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
};

export const useDeleteSite = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, keepCustomers }: { id: string; keepCustomers?: boolean }) =>
      siteService.deleteSite(id, keepCustomers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      options?.onSuccess?.();
    },
  });
};

export const useFloors = (siteId: string) => {
  return useQuery({
    queryKey: ['floors', siteId],
    queryFn: () => siteService.getFloors(siteId),
    retry: false,
    enabled: !!siteId,
  });
};

export const useCreateFloor = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFloorInput) => siteService.createFloor(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      options?.onSuccess?.();
    },
  });
};

export const useCreateFlat = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ floorId, data }: { floorId: string; data: CreateFlatInput }) =>
      siteService.createFlat(siteId, floorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      options?.onSuccess?.();
    },
  });
};

export const useBookFlat = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flatId, data }: { flatId: string; data: BookFlatInput }) =>
      siteService.bookFlat(siteId, flatId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      options?.onSuccess?.();
    },
  });
};

export const useExpenses = (siteId: string) => {
  return useQuery({
    queryKey: ['expenses', siteId],
    queryFn: () => siteService.getExpenses(siteId),
    retry: false,
    enabled: !!siteId,
  });
};

export const useFundHistory = (siteId: string) => {
  return useQuery({
    queryKey: ['fund-history', siteId],
    queryFn: () => siteService.getFundHistory(siteId),
    retry: false,
    enabled: !!siteId,
  });
};

export const useAddExpense = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) => siteService.addExpense(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      options?.onSuccess?.();
    },
  });
};

export const useAddFund = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; note?: string }) => siteService.addFund(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      options?.onSuccess?.();
    },
  });
};

export const useWithdrawFund = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; note?: string }) => siteService.withdrawFund(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateExpensePayment = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, data }: { expenseId: string; data: { amount: number; paymentDate?: string; note?: string } }) => {
      const res = await siteService.updateExpensePayment(siteId, expenseId, data);
      return res;
    },
    onSuccess: () => {
      // Use setQueriesData or invalidate. For critical UI we use removeQueries but invalidate is fine if we return correctly
      queryClient.removeQueries({ queryKey: ['expenses', siteId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', siteId] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] }); // Since vendor transactions might update
      options?.onSuccess?.();
    },
  });
};
