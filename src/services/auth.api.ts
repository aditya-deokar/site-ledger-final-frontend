import api from '@/lib/axios';
import { ForgotPasswordInput, ResetPasswordInput, VerifyResetCodeInput } from '@/schemas/auth.schema';

export const forgotPassword = async (data: ForgotPasswordInput) => {
  return api.post('/auth/forgot-password', data);
};

export const resetPassword = async (data: ResetPasswordInput) => {
  return api.post('/auth/reset-password', data);
};

export const verifyResetCode = async (data: VerifyResetCodeInput) => {
  return api.post('/auth/forgot-password/verify', data);
};
