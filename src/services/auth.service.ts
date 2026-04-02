import api from '@/lib/axios';
import { LoginInput, SignUpInput, AuthResponse, UserResponse } from '@/schemas/auth.schema';

export const authService = {
  login: async (data: LoginInput): Promise<AuthResponse> => {
    return api.post('/auth/signin', data);
  },

  signUp: async (data: SignUpInput): Promise<AuthResponse> => {
    return api.post('/auth/signup', data);
  },

  getMe: async (): Promise<UserResponse> => {
    return api.get('/auth/me');
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
};
