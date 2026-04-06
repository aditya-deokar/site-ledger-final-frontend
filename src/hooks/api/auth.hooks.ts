import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeTokens } from '@/lib/auth-session';
import { authService } from '@/services/auth.service';
import { LoginInput, SignUpInput, ForgotPasswordInput, ResetPasswordInput, VerifySignUpInput } from '@/schemas/auth.schema';
import { forgotPassword, resetPassword, verifyResetCode } from '@/services/auth.api';
import { useRouter } from 'next/navigation';

export const useSignIn = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: (response) => {
      storeTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/');
    },
  });
};

export const useSignUp = () => {
  return useMutation({
    mutationFn: (data: SignUpInput) => authService.signUp(data),
  });
};

export const useVerifySignUp = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VerifySignUpInput) => authService.verifySignUp(data),
    onSuccess: (response) => {
      storeTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/');
    },
  });
};


export const useMe = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authService.getMe(),
    retry: false,
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (data: ForgotPasswordInput) => forgotPassword(data),
  });
};

export const useVerifyResetCode = () => {
  return useMutation({
    mutationFn: (data: { email: string; code: string }) => verifyResetCode(data),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (data: ResetPasswordInput) => resetPassword(data),
  });
};
