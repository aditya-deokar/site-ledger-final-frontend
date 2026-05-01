import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { siteService } from '@/services/site.service';
import { CreateSiteInput, BookFlatInput, CreateExpenseInput, CreateFloorInput, CreateFlatInput, UpdateFlatDetailsInput } from '@/schemas/site.schema';

export const siteKeys = {
  all: ['sites'] as const,
  list: (showArchived?: 'true' | 'only') => ['sites', showArchived ?? 'active'] as const,
  detailRoot: ['site'] as const,
  detail: (id?: string) => ['site', id ?? ''] as const,
  reportRoot: ['site-report'] as const,
  report: (id?: string) => ['site-report', id ?? ''] as const,
  floorsRoot: ['floors'] as const,
  floors: (siteId?: string) => ['floors', siteId ?? ''] as const,
  wingsRoot: ['wings'] as const,
  wings: (siteId?: string) => ['wings', siteId ?? ''] as const,
  expensesRoot: ['expenses'] as const,
  expenses: (siteId?: string) => ['expenses', siteId ?? ''] as const,
  fundHistoryRoot: ['fund-history'] as const,
  fundHistory: (siteId?: string) => ['fund-history', siteId ?? ''] as const,
} as const;

export const useSites = (options?: { showArchived?: 'true' | 'only'; enabled?: boolean } | 'true' | 'only') => {
  const showArchived = typeof options === 'string' ? options : options?.showArchived;
  const enabled = typeof options === 'object' ? options?.enabled : true;

  return useQuery({
    queryKey: siteKeys.list(showArchived),
    queryFn: () => siteService.getSites(showArchived),
    retry: false,
    enabled: enabled,
  });
};

export const useSite = (id?: string) => {
  return useQuery({
    queryKey: siteKeys.detail(id),
    queryFn: () => siteService.getSite(id!),
    retry: false,
    enabled: Boolean(id),
  });
};

export const useSiteReport = (id?: string) => {
  return useQuery({
    queryKey: siteKeys.report(id),
    queryFn: () => siteService.getSiteReport(id!),
    retry: false,
    enabled: Boolean(id),
  });
};

export const useCreateSite = (options?: { onSuccess?: (data: any) => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSiteInput) => siteService.createSite(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
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
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
};

export const useDeleteSite = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, keepCustomers }: { id: string; keepCustomers?: boolean }) =>
      siteService.deleteSite(id, keepCustomers),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      queryClient.removeQueries({ queryKey: siteKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['siteCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useFloors = (siteId?: string) => {
  return useQuery({
    queryKey: siteKeys.floors(siteId),
    queryFn: () => siteService.getFloors(siteId!),
    retry: false,
    enabled: Boolean(siteId),
  });
};

export const useWings = (siteId?: string) => {
  return useQuery({
    queryKey: siteKeys.wings(siteId),
    queryFn: () => siteService.getWings(siteId!),
    retry: false,
    enabled: Boolean(siteId),
  });
};

export const useCreateWing = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => siteService.createWing(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.wings(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateWing = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wingId, data }: { wingId: string; data: { name: string } }) =>
      siteService.updateWing(siteId, wingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.wings(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      options?.onSuccess?.();
    },
  });
};

export const useDeleteWing = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (wingId: string) => siteService.deleteWing(siteId, wingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.wings(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      options?.onSuccess?.();
    },
  });
};

export const useCreateFloor = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFloorInput) => siteService.createFloor(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
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
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      options?.onSuccess?.();
    },
  });
};

export const useDeleteFloor = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (floorId: string) => siteService.deleteFloor(siteId, floorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
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
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateFlatDetails = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flatId, data }: { flatId: string; data: UpdateFlatDetailsInput }) =>
      siteService.updateFlatDetails(siteId, flatId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      options?.onSuccess?.();
    },
  });
};

export const useDeleteFlat = (siteId: string, options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flatId: string) => siteService.deleteFlat(siteId, flatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
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
      queryClient.invalidateQueries({ queryKey: siteKeys.floors(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      queryClient.invalidateQueries({ queryKey: ['siteCustomers', siteId] });
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useExpenses = (siteId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: siteKeys.expenses(siteId),
    queryFn: () => siteService.getExpenses(siteId),
    retry: false,
    enabled: (options?.enabled ?? true) && !!siteId,
  });
};

export const useFundHistory = (siteId: string) => {
  return useQuery({
    queryKey: siteKeys.fundHistory(siteId),
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
      queryClient.invalidateQueries({ queryKey: siteKeys.expenses(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
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
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.fundHistory(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
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
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.fundHistory(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
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
      queryClient.removeQueries({ queryKey: siteKeys.expenses(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.expenses(siteId) });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      queryClient.invalidateQueries({ queryKey: ['vendorTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['vendorPayments'] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatement'] });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};
