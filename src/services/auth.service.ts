import api from '@/lib/axios';
import { clearStoredTokens } from '@/lib/auth-session';
import { LoginInput, SignUpInput, AuthResponse, UserResponse, VerifySignUpInput } from '@/schemas/auth.schema';

export const authService = {
  login: async (data: LoginInput): Promise<AuthResponse> => {
    return api.post('/auth/signin', data);
  },

  signUp: async (data: SignUpInput): Promise<any> => {
    return api.post('/auth/signup', data);
  },

  verifySignUp: async (data: VerifySignUpInput): Promise<AuthResponse> => {
    return api.post('/auth/signup/verify', data);
  },

  getMe: async (): Promise<UserResponse> => {
    return api.get('/auth/me');
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearStoredTokens();
      window.location.replace('/login');
    }
  },
};


