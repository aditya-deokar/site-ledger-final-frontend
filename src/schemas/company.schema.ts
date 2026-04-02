import { z } from 'zod';

export const partnerInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  investmentAmount: z.number().min(0, 'Must be positive'),
  stakePercentage: z.number().min(0).max(100, 'Must be 0–100'),
});
export type PartnerInput = z.infer<typeof partnerInputSchema>;

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  address: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export interface Partner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  investmentAmount: number;
  stakePercentage: number;
}

export interface CompanyResponse {
  ok: boolean;
  data: {
    company: {
      id: string;
      name: string;
      address: string | null;
      createdAt: string;
    };
    partner_fund: number;
    investor_fund: number;
    total_fund: number;
    available_fund: number;
    partners: Partner[];
  };
}

export interface CreateCompanyResponse {
  ok: boolean;
  data: {
    company: {
      id: string;
      name: string;
      address: string | null;
      createdAt: string;
    };
  };
}
