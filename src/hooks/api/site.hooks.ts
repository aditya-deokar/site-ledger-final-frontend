import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { siteService } from '@/services/site.service';
import { CreateSiteInput, BookFlatInput, CreateExpenseInput, CreateFloorInput, CreateFlatInput } from '@/schemas/site.schema';

export const useSites = (options?: { showArchived?: 'true' | 'only'; enabled?: boolean } | 'true' | 'only') => {
  const showArchived = typeof options === 'string' ? options : options?.showArchived;
  const enabled = typeof options === 'object' ? options?.enabled : true;

  return useQuery({
    queryKey: ['sites', showArchived ?? 'active'],
    queryFn: () => siteService.getSites(showArchived),
    retry: false,
    enabled: enabled,
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

export const useSiteReport = (id: string) => {
  return useQuery({
    queryKey: ['site-report', id],
    queryFn: () => siteService.getSiteReport(id),
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
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
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
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
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
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['siteCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
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
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateFloor = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ floorId, data }: { floorId: string; data: CreateFloorInput }) =>
      siteService.updateFloor(siteId, floorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      options?.onSuccess?.();
    },
  });
};

export const useDeleteFloor = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (floorId: string) => siteService.deleteFloor(siteId, floorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
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
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateFlatDetails = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flatId, data }: { flatId: string; data: CreateFlatInput }) =>
      siteService.updateFlatDetails(siteId, flatId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      options?.onSuccess?.();
    },
  });
};

export const useDeleteFlat = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flatId: string) => siteService.deleteFlat(siteId, flatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors', siteId] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
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
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['siteCustomers', siteId] });
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
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
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      queryClient.invalidateQueries({ queryKey: ['vendorTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['vendorPayments'] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatement'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
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
      queryClient.invalidateQueries({ queryKey: ['fund-history', siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
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
      queryClient.invalidateQueries({ queryKey: ['fund-history', siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateExpensePayment = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, data }: { expenseId: string; data: { amount: number; note?: string } }) => {
      const res = await siteService.updateExpensePayment(siteId, expenseId, data);
      return res;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['expenses', siteId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', siteId] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      queryClient.invalidateQueries({ queryKey: ['vendorTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['vendorPayments'] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatement'] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};
