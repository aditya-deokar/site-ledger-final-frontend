import { z } from 'zod';

export const employeeStatusSchema = z.enum(['active', 'inactive', 'terminated']);

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().trim().min(1, 'Phone is required'),
  address: z.string().trim().min(1, 'Address is required'),
  designation: z.string().trim().min(1, 'Designation is required'),
  department: z.string().trim().min(1, 'Department is required'),
  dateOfJoining: z.string().trim().min(1, 'Date of joining is required'),
  salary: z.number().min(0, 'Salary cannot be negative'),
  status: employeeStatusSchema,
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.partial();
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string;
  photo: string | null;
  employeeId: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  salary: number;
  status: z.infer<typeof employeeStatusSchema>;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeesSummary {
  active: number;
  inactive: number;
  terminated: number;
}

export interface EmployeesResponse {
  ok: boolean;
  data: {
    employees: Employee[];
    total: number;
    summary: EmployeesSummary;
  };
}

export interface EmployeeResponse {
  ok: boolean;
  data: {
    employee: Employee;
  };
}
