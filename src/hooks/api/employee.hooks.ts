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

export const employeeKeys = {
  all: ['employees'] as const,
  list: (filters?: EmployeeListFilters) => [
    'employees',
    filters?.search ?? '',
    filters?.department ?? '',
    filters?.status ?? '',
  ] as const,
  detailRoot: ['employee'] as const,
  detail: (id?: string) => ['employee', id ?? ''] as const,
  transactionsRoot: ['employeeTransactions'] as const,
  transactionsByEmployee: (employeeId?: string) => ['employeeTransactions', employeeId ?? ''] as const,
  transactions: (employeeId?: string, filters?: EmployeeTransactionFilters) => [
    'employeeTransactions',
    employeeId ?? '',
    filters?.type ?? '',
    filters?.startDate ?? '',
    filters?.endDate ?? '',
  ] as const,
} as const;

export const useEmployees = (filters?: EmployeeListFilters, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeeService.getEmployees(filters),
    retry: false,
    enabled: options?.enabled,
  });
};

export const useEmployee = (id?: string) => {
  return useQuery({
    queryKey: employeeKeys.detail(id),
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
    queryKey: employeeKeys.transactions(employeeId, filters),
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
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      options?.onSuccess?.();
    },
  });
};

export const useUpdateEmployee = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeInput }) =>
      employeeService.updateEmployee(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
      options?.onSuccess?.();
    },
  });
};

export const useDeleteEmployee = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeService.deleteEmployee(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.removeQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.removeQueries({ queryKey: employeeKeys.transactionsByEmployee(id) });
      options?.onSuccess?.();
    },
  });
};

export const useCreateEmployeeTransaction = (options?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeTransactionInput) => employeeService.createTransaction(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: employeeKeys.transactionsByEmployee(variables.employeeId),
      });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.employeeId) });
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
      queryClient.invalidateQueries({
        queryKey: employeeKeys.transactionsByEmployee(variables.employeeId),
      });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.employeeId) });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['salaryReminders'] });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.transactionsByEmployee(variables.id),
      });
      options?.onSuccess?.(data);
    },
  });
};
