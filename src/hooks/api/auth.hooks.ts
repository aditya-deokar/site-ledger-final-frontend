import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { LoginInput, SignUpInput, ForgotPasswordInput, ResetPasswordInput } from '@/schemas/auth.schema';
import { forgotPassword, resetPassword } from '@/services/auth.api';
import { useRouter } from 'next/navigation';

export const useSignIn = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: (response) => {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/');
    },
  });
};

export const useSignUp = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: SignUpInput) => authService.signUp(data),
    onSuccess: (response) => {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      router.push('/setup-company');
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

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (data: ResetPasswordInput) => resetPassword(data),
  });
};
