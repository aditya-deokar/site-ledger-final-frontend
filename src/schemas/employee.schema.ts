import { z } from 'zod';

export const employeeStatusSchema = z.enum(['active', 'inactive', 'terminated']);
export const employeeTransactionTypeSchema = z.enum(['salary', 'bonus', 'deduction', 'advance', 'reimbursement']);
export const employeePaymentMethodSchema = z.enum(['cash', 'bank_transfer', 'cheque']);
export const employeeTransactionStatusSchema = z.enum(['pending', 'paid', 'failed']);

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().trim().min(1, 'Phone is required'),
  address: z.string().trim().min(1, 'Address is required'),
  designation: z.string().trim().min(1, 'Designation is required'),
  department: z.string().trim().min(1, 'Department is required'),
  dateOfJoining: z.string().trim().min(1, 'Date of joining is required'),
  salary: z.number().min(0, 'Salary cannot be negative'),
  salaryDate: z.number().int().min(1).max(31).optional().nullable(),
  status: employeeStatusSchema,
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.partial();
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const paySalarySchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque']).optional(),
  note: z.string().trim().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
});
export type PaySalaryInput = z.infer<typeof paySalarySchema>;

export const createEmployeeTransactionSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  type: employeeTransactionTypeSchema,
  amount: z.number().positive('Amount must be positive'),
  description: z.string().trim().min(1, 'Description is required'),
  date: z.string().trim().min(1, 'Date is required'),
  paymentMethod: employeePaymentMethodSchema.optional(),
});
export type CreateEmployeeTransactionInput = z.infer<typeof createEmployeeTransactionSchema>;

export const updateEmployeeTransactionStatusSchema = z.object({
  status: employeeTransactionStatusSchema,
  paidAt: z.string().trim().optional(),
});
export type UpdateEmployeeTransactionStatusInput = z.infer<typeof updateEmployeeTransactionStatusSchema>;

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
  salaryDate: number | null;
  status: z.infer<typeof employeeStatusSchema>;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeesSummary {
  active: number;
  inactive: number;
  terminated: number;
}

export interface EmployeeStats {
  documentsCount: number;
  attendanceCount: number;
  transactionCount: number;
}

export interface EmployeeTransaction {
  id: string;
  employeeId: string;
  type: z.infer<typeof employeeTransactionTypeSchema>;
  amount: number;
  description: string;
  date: string;
  paymentMethod: z.infer<typeof employeePaymentMethodSchema> | null;
  status: z.infer<typeof employeeTransactionStatusSchema>;
  createdAt: string;
  paidAt: string | null;
}

export interface EmployeeTransactionsSummary {
  totalPaid: number;
  totalDeducted: number;
  netAmount: number;
  pendingAmount: number;
}

export interface EmployeeTransactionsPeriod {
  startDate: string | null;
  endDate: string | null;
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
    stats: EmployeeStats;
  };
}

export interface EmployeeTransactionsResponse {
  ok: boolean;
  data: {
    transactions: EmployeeTransaction[];
    summary: EmployeeTransactionsSummary;
    period: EmployeeTransactionsPeriod;
  };
}

export interface EmployeeTransactionResponse {
  ok: boolean;
  data: {
    transaction: EmployeeTransaction;
  };
}

export interface EmployeeTransactionStatusResponse {
  ok: boolean;
  data: {
    transaction: EmployeeTransaction;
    statusTransition: {
      previous: z.infer<typeof employeeTransactionStatusSchema>;
      current: z.infer<typeof employeeTransactionStatusSchema>;
    };
  };
}
