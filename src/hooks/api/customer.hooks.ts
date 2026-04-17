import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/services/customer.service';
import { CancelDealInput, UpdateCustomerInput } from '@/schemas/customer.schema';

export const useAllCustomers = (status?: string) => {
  return useQuery({
    queryKey: ['allCustomers', status],
    queryFn: () => customerService.getAllCustomers(status),
    retry: false,
  });
};

export const useSiteCustomers = (siteId: string) => {
  return useQuery({
    queryKey: ['siteCustomers', siteId],
    queryFn: () => customerService.getSiteCustomers(siteId),
    retry: false,
    enabled: !!siteId,
  });
};

export const useUpdateCustomer = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, flatId, customerId, data }: { siteId: string; flatId: string; customerId: string; data: UpdateCustomerInput }) =>
      customerService.updateCustomer(siteId, flatId, customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useRecordCustomerPayment = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, siteId, data }: { customerId: string; siteId?: string; data: { amount: number; note?: string } }) =>
      customerService.recordPayment(customerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['siteCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['customerPayments', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      if (variables.siteId) {
        queryClient.invalidateQueries({ queryKey: ['site-report', variables.siteId] });
      }
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};

export const useCustomerPayments = (customerId: string) => {
  return useQuery({
    queryKey: ['customerPayments', customerId],
    queryFn: () => customerService.getPayments(customerId),
    enabled: !!customerId,
  });
};

export const useCancelDeal = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, flatId, customerId, data }: { siteId: string; flatId: string; customerId: string; data: CancelDealInput }) =>
      customerService.cancelDeal(siteId, flatId, customerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['siteCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['customerPayments', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['site'] });
      queryClient.invalidateQueries({ queryKey: ['site-report', variables.siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      options?.onSuccess?.();
    },
  });
};
