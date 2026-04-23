import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  employeeService,
  EmployeeListFilters,
  EmployeeTransactionFilters,
} from '@/services/employee.service';
import {
  CreateEmployeeInput,
  CreateEmployeeTransactionInput,
  PaySalaryInput,
  UpdateEmployeeInput,
  UpdateEmployeeTransactionStatusInput,
} from '@/schemas/employee.schema';

export const useEmployees = (filters?: EmployeeListFilters) => {
  return useQuery({
    queryKey: ['employees', filters?.search ?? '', filters?.department ?? '', filters?.status ?? ''],
    queryFn: () => employeeService.getEmployees(filters),
    retry: false,
  });
};

export const useEmployee = (id?: string) => {
  return useQuery({
    queryKey: ['employee', id ?? ''],
    queryFn: () => employeeService.getEmployee(id!),
    retry: false,
    enabled: Boolean(id),
  });
};

export const useEmployeeTransactions = (
  employeeId?: string,
  filters?: EmployeeTransactionFilters,
) => {
  return useQuery({
    queryKey: [
      'employeeTransactions',
      employeeId ?? '',
      filters?.type ?? '',
      filters?.startDate ?? '',
      filters?.endDate ?? '',
    ],
    queryFn: () => employeeService.getTransactions(employeeId!, filters),
    retry: false,
    enabled: Boolean(employeeId),
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

export const useCreateEmployeeTransaction = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeTransactionInput) => employeeService.createTransaction(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employeeTransactions', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.employeeId] });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateEmployeeTransactionStatus = (
  options?: { onSuccess?: () => void },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      employeeId,
      data,
    }: {
      id: string;
      employeeId: string;
      data: UpdateEmployeeTransactionStatusInput;
    }) => employeeService.updateTransactionStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employeeTransactions', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['salaryReminders'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      options?.onSuccess?.();
    },
  });
};

export const usePaySalary = (options?: { onSuccess?: (data: unknown) => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaySalaryInput }) =>
      employeeService.paySalary(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['salaryReminders'] });
      options?.onSuccess?.(data);
    },
  });
};
