import api from '@/lib/axios';
import {
  CreateEmployeeInput,
  EmployeeResponse,
  EmployeesResponse,
  UpdateEmployeeInput,
} from '@/schemas/employee.schema';

export type EmployeeListFilters = {
  search?: string;
  department?: string;
  status?: 'active' | 'inactive' | 'terminated';
};

function toApiDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

function normalizeCreatePayload(data: CreateEmployeeInput) {
  return {
    ...data,
    email: data.email || undefined,
    dateOfJoining: toApiDate(data.dateOfJoining),
  };
}

function normalizeUpdatePayload(data: UpdateEmployeeInput) {
  return {
    ...data,
    email: data.email || undefined,
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
};
