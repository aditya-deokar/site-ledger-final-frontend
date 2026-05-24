import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vendorService } from '@/services/vendor.service';
import {
  CreateVendorDocumentInput,
  CreateVendorInput,
  UpdateVendorInput,
  VendorListQuery,
  VendorSiteAssignmentUpsertInput,
  VendorStatus,
} from '@/schemas/vendor.schema';

export const vendorKeys = {
  all: ['vendors'] as const,
  list: (query?: VendorListQuery) => ['vendors', query ?? {}] as const,
  detailRoot: ['vendor'] as const,
  detail: (id?: string) => ['vendor', id ?? ''] as const,
  transactionsRoot: ['vendorTransactions'] as const,
  transactions: (id?: string, page?: number, size?: number) => ['vendorTransactions', id ?? '', page ?? 1, size ?? 50] as const,
  bills: (id?: string, page?: number, size?: number) => ['vendorBills', id ?? '', page ?? 1, size ?? 50] as const,
  payments: (id?: string, page?: number, size?: number) => ['vendorPayments', id ?? '', page ?? 1, size ?? 50] as const,
  receipts: (id?: string, page?: number, size?: number) => ['vendorReceipts', id ?? '', page ?? 1, size ?? 50] as const,
  statement: (id?: string, page?: number, size?: number) => ['vendorStatement', id ?? '', page ?? 1, size ?? 50] as const,
  assignments: (id?: string) => ['vendorAssignments', id ?? ''] as const,
  documents: (id?: string) => ['vendorDocuments', id ?? ''] as const,
} as const;

function invalidateVendorQueries(queryClient: ReturnType<typeof useQueryClient>, vendorId?: string) {
  queryClient.invalidateQueries({ queryKey: vendorKeys.all });
  queryClient.invalidateQueries({ queryKey: vendorKeys.detailRoot });
  queryClient.invalidateQueries({ queryKey: vendorKeys.transactionsRoot });
  queryClient.invalidateQueries({ queryKey: ['vendorBills'] });
  queryClient.invalidateQueries({ queryKey: ['vendorPayments'] });
  queryClient.invalidateQueries({ queryKey: ['vendorReceipts'] });
  queryClient.invalidateQueries({ queryKey: ['vendorStatement'] });
  queryClient.invalidateQueries({ queryKey: ['vendorAssignments'] });
  queryClient.invalidateQueries({ queryKey: ['vendorDocuments'] });

  if (vendorId) {
    queryClient.invalidateQueries({ queryKey: vendorKeys.detail(vendorId) });
  }
}

export const useVendor = (id: string) => {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => vendorService.getVendor(id),
    retry: false,
    enabled: !!id,
  });
};

export const useVendorTransactions = (id: string, options?: { page?: number; size?: number; enabled?: boolean }) => {
  return useQuery({
    queryKey: vendorKeys.transactions(id, options?.page, options?.size),
    queryFn: () => vendorService.getVendorTransactions(id, options?.page, options?.size),
    retry: false,
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useVendorBills = (id: string, options?: { page?: number; size?: number; enabled?: boolean }) => {
  return useQuery({
    queryKey: vendorKeys.bills(id, options?.page, options?.size),
    queryFn: () => vendorService.getVendorBills(id, options?.page, options?.size),
    retry: false,
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useVendorPayments = (id: string, options?: { page?: number; size?: number; enabled?: boolean }) => {
  return useQuery({
    queryKey: vendorKeys.payments(id, options?.page, options?.size),
    queryFn: () => vendorService.getVendorPayments(id, options?.page, options?.size),
    retry: false,
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useVendorReceipts = (id: string, options?: { page?: number; size?: number; enabled?: boolean }) => {
  return useQuery({
    queryKey: vendorKeys.receipts(id, options?.page, options?.size),
    queryFn: () => vendorService.getVendorReceipts(id, options?.page, options?.size),
    retry: false,
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useVendorStatement = (id: string, options?: { page?: number; size?: number; enabled?: boolean }) => {
  return useQuery({
    queryKey: vendorKeys.statement(id, options?.page, options?.size),
    queryFn: () => vendorService.getVendorStatement(id, options?.page, options?.size),
    retry: false,
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useVendorAssignments = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: vendorKeys.assignments(id),
    queryFn: () => vendorService.getVendorAssignments(id),
    retry: false,
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useVendorDocuments = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: vendorKeys.documents(id),
    queryFn: () => vendorService.getVendorDocuments(id),
    retry: false,
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useVendors = (query?: VendorListQuery, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: vendorKeys.list(query),
    queryFn: () => vendorService.getVendors(query),
    retry: false,
    enabled: options?.enabled ?? true,
  });
};

export const useCreateVendor = (options?: { onSuccess?: (data: any) => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendorInput) => vendorService.createVendor(data),
    onSuccess: (data) => {
      invalidateVendorQueries(queryClient, data?.data?.vendor?.id);
      options?.onSuccess?.(data);
    },
  });
};

export const useUpdateVendor = (options?: { onSuccess?: (data: any) => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorInput }) =>
      vendorService.updateVendor(id, data),
    onSuccess: (data, variables) => {
      invalidateVendorQueries(queryClient, variables.id);
      options?.onSuccess?.(data);
    },
  });
};

export const usePatchVendorStatus = (options?: { onSuccess?: (data: any) => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VendorStatus }) =>
      vendorService.patchVendorStatus(id, status),
    onSuccess: (data, variables) => {
      invalidateVendorQueries(queryClient, variables.id);
      options?.onSuccess?.(data);
    },
  });
};

export const useDeleteVendor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vendorService.deleteVendor(id),
    onSuccess: (_, vendorId) => {
      invalidateVendorQueries(queryClient, vendorId);
      queryClient.removeQueries({ queryKey: vendorKeys.detail(vendorId) });
      options?.onSuccess?.();
    },
  });
};

export const useUpsertVendorAssignment = (options?: { onSuccess?: (data: any) => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, siteId, data }: { vendorId: string; siteId: string; data: VendorSiteAssignmentUpsertInput }) =>
      vendorService.upsertVendorAssignment(vendorId, siteId, data),
    onSuccess: (data, variables) => {
      invalidateVendorQueries(queryClient, variables.vendorId);
      options?.onSuccess?.(data);
    },
  });
};

export const useCreateVendorDocument = (options?: { onSuccess?: (data: any) => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, data }: { vendorId: string; data: CreateVendorDocumentInput }) =>
      vendorService.createVendorDocument(vendorId, data),
    onSuccess: (data, variables) => {
      invalidateVendorQueries(queryClient, variables.vendorId);
      options?.onSuccess?.(data);
    },
  });
};

export const useDeleteVendorDocument = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, documentId }: { vendorId: string; documentId: string }) =>
      vendorService.deleteVendorDocument(vendorId, documentId),
    onSuccess: (_, variables) => {
      invalidateVendorQueries(queryClient, variables.vendorId);
      options?.onSuccess?.();
    },
  });
};
