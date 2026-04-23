import api from '@/lib/axios';
import {
  CreateEmployeeInput,
  EmployeeResponse,
  EmployeeTransactionResponse,
  EmployeeTransactionsResponse,
  CreateEmployeeTransactionInput,
  EmployeeTransactionStatusResponse,
  EmployeesResponse,
  PaySalaryInput,
  UpdateEmployeeTransactionStatusInput,
  UpdateEmployeeInput,
} from '@/schemas/employee.schema';

export type EmployeeListFilters = {
  search?: string;
  department?: string;
  status?: 'active' | 'inactive' | 'terminated';
};

export type EmployeeTransactionFilters = {
  type?: 'salary' | 'bonus' | 'deduction' | 'advance' | 'reimbursement';
  startDate?: string;
  endDate?: string;
};

function toApiDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

function normalizeCreatePayload(data: CreateEmployeeInput) {
  return {
    ...data,
    email: data.email || undefined,
    salaryDate: data.salaryDate ?? undefined,
    dateOfJoining: toApiDate(data.dateOfJoining),
  };
}

function normalizeUpdatePayload(data: UpdateEmployeeInput) {
  return {
    ...data,
    email: data.email || undefined,
    salaryDate: data.salaryDate === undefined ? undefined : data.salaryDate,
    dateOfJoining: data.dateOfJoining ? toApiDate(data.dateOfJoining) : undefined,
  };
}

export const employeeService = {
  getEmployees: (filters?: EmployeeListFilters): Promise<EmployeesResponse> => {
    const params = {
      ...(filters?.search ? { search: filters.search } : {}),
      ...(filters?.department ? { department: filters.department } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    };

    return api.get('/employees', { params });
  },

  getEmployee: (id: string): Promise<EmployeeResponse> =>
    api.get(`/employees/${id}`),

  createEmployee: (data: CreateEmployeeInput): Promise<EmployeeResponse> =>
    api.post('/employees', normalizeCreatePayload(data)),

  updateEmployee: (id: string, data: UpdateEmployeeInput): Promise<EmployeeResponse> =>
    api.put(`/employees/${id}`, normalizeUpdatePayload(data)),

  deleteEmployee: (id: string) =>
    api.delete(`/employees/${id}`),

  paySalary: (id: string, data: PaySalaryInput) =>
    api.post(`/employees/${id}/pay-salary`, data),

  getTransactions: (
    employeeId: string,
    filters?: EmployeeTransactionFilters,
  ): Promise<EmployeeTransactionsResponse> =>
    api.get(`/transactions/${employeeId}`, {
      params: {
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.startDate ? { startDate: toApiDate(filters.startDate) } : {}),
        ...(filters?.endDate ? { endDate: toApiDate(filters.endDate) } : {}),
      },
    }),

  createTransaction: (data: CreateEmployeeTransactionInput): Promise<EmployeeTransactionResponse> =>
    api.post('/transactions', {
      ...data,
      date: toApiDate(data.date),
    }),

  updateTransactionStatus: (
    id: string,
    data: UpdateEmployeeTransactionStatusInput,
  ): Promise<EmployeeTransactionStatusResponse> =>
    api.put(`/transactions/${id}/status`, {
      ...data,
      paidAt: data.paidAt ? toApiDate(data.paidAt) : undefined,
    }),
};
