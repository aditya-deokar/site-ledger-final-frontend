import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/services/customer.service';
import {
  CancelDealInput,
  CustomerAgreementLineInput,
  RecordPaymentInput,
  UpdateCustomerInput,
} from '@/schemas/customer.schema';

function invalidateCustomerRelatedQueries(queryClient: ReturnType<typeof useQueryClient>, customerId?: string, siteId?: string) {
  queryClient.invalidateQueries({ queryKey: ['siteCustomers'] });
  queryClient.invalidateQueries({ queryKey: ['allCustomers'] });
  queryClient.invalidateQueries({ queryKey: ['floors'] });
  queryClient.invalidateQueries({ queryKey: ['site'] });
  queryClient.invalidateQueries({ queryKey: ['sites'] });
  queryClient.invalidateQueries({ queryKey: ['activity'] });

  if (customerId) {
    queryClient.invalidateQueries({ queryKey: ['customerPayments', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customerAgreement', customerId] });
  }

  if (siteId) {
    queryClient.invalidateQueries({ queryKey: ['site-report', siteId] });
  }
}

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
    onSuccess: (_, variables) => {
      invalidateCustomerRelatedQueries(queryClient, variables.customerId, variables.siteId);
      options?.onSuccess?.();
    },
  });
};

export const useRecordCustomerPayment = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, siteId, data }: { customerId: string; siteId?: string; data: RecordPaymentInput }) =>
      customerService.recordPayment(customerId, data),
    onSuccess: (_, variables) => {
      invalidateCustomerRelatedQueries(queryClient, variables.customerId, variables.siteId);
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

export const useCustomerAgreement = (customerId: string) => {
  return useQuery({
    queryKey: ['customerAgreement', customerId],
    queryFn: () => customerService.getAgreement(customerId),
    enabled: !!customerId,
  });
};

export const useAddCustomerAgreementLine = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, siteId, data }: { customerId: string; siteId?: string; data: CustomerAgreementLineInput }) =>
      customerService.addAgreementLine(customerId, data),
    onSuccess: (_, variables) => {
      invalidateCustomerRelatedQueries(queryClient, variables.customerId, variables.siteId);
      options?.onSuccess?.();
    },
  });
};

export const useUpdateCustomerAgreementLine = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      lineId,
      siteId,
      data,
    }: {
      customerId: string;
      lineId: string;
      siteId?: string;
      data: CustomerAgreementLineInput;
    }) => customerService.updateAgreementLine(customerId, lineId, data),
    onSuccess: (_, variables) => {
      invalidateCustomerRelatedQueries(queryClient, variables.customerId, variables.siteId);
      options?.onSuccess?.();
    },
  });
};

export const useDeleteCustomerAgreementLine = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, lineId, siteId }: { customerId: string; lineId: string; siteId?: string }) =>
      customerService.deleteAgreementLine(customerId, lineId),
    onSuccess: (_, variables) => {
      invalidateCustomerRelatedQueries(queryClient, variables.customerId, variables.siteId);
      options?.onSuccess?.();
    },
  });
};

export const useCancelDeal = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, flatId, customerId, data }: { siteId: string; flatId: string; customerId: string; data: CancelDealInput }) =>
      customerService.cancelDeal(siteId, flatId, customerId, data),
    onSuccess: (_, variables) => {
      invalidateCustomerRelatedQueries(queryClient, variables.customerId, variables.siteId);
      options?.onSuccess?.();
    },
  });
};
