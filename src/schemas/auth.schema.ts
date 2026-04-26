import { z } from 'zod';
import { strongPasswordSchema } from '../lib/password-policy';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required.'),
  recaptchaToken: z.string().optional(),
});

export const signUpSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    recaptchaToken: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export const verifySignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export type VerifySignUpInput = z.infer<typeof verifySignUpSchema>;

export interface AuthResponse {
  ok: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
}


export interface UserResponse {
  ok: boolean;
  data: {
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      createdAt: string;
    };
  };
}

export const forgotPasswordSchema = z.object({ email: z.string().email() });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required.'),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const verifyResetCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
