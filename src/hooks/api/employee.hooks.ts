import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeService, EmployeeListFilters } from '@/services/employee.service';
import { CreateEmployeeInput, UpdateEmployeeInput } from '@/schemas/employee.schema';

export const useEmployees = (filters?: EmployeeListFilters) => {
  return useQuery({
    queryKey: ['employees', filters?.search ?? '', filters?.department ?? '', filters?.status ?? ''],
    queryFn: () => employeeService.getEmployees(filters),
    retry: false,
  });
};

export const useCreateEmployee = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeInput) => employeeService.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateEmployee = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeInput }) =>
      employeeService.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      options?.onSuccess?.();
    },
  });
};

export const useDeleteEmployee = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeService.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      options?.onSuccess?.();
    },
  });
};
