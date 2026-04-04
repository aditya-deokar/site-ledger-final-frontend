import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vendorService } from '@/services/vendor.service';
import { CreateVendorInput, UpdateVendorInput } from '@/schemas/vendor.schema';

export const useVendor = (id: string) => {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorService.getVendor(id),
    retry: false,
    enabled: !!id,
  });
};

export const useVendorTransactions = (id: string) => {
  return useQuery({
    queryKey: ['vendorTransactions', id],
    queryFn: () => vendorService.getVendorTransactions(id),
    retry: false,
    enabled: !!id,
  });
};

export const useVendorPayments = (id: string) => {
  return useQuery({
    queryKey: ['vendorPayments', id],
    queryFn: () => vendorService.getVendorPayments(id),
    retry: false,
    enabled: !!id,
  });
};

export const useVendorStatement = (id: string) => {
  return useQuery({
    queryKey: ['vendorStatement', id],
    queryFn: () => vendorService.getVendorStatement(id),
    retry: false,
    enabled: !!id,
  });
};

export const useVendors = (type?: string) => {
  return useQuery({
    queryKey: ['vendors', type],
    queryFn: () => vendorService.getVendors(type),
    retry: false,
  });
};

export const useCreateVendor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendorInput) => vendorService.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateVendor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorInput }) =>
      vendorService.updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      options?.onSuccess?.();
    },
  });
};

export const useDeleteVendor = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vendorService.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      options?.onSuccess?.();
    },
  });
};
