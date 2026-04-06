import axios from 'axios';

import {
  clearStoredTokens,
  ensureFreshAccessToken,
  redirectToLogin,
  refreshAccessToken,
} from '@/lib/auth-session';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const PUBLIC_AUTH_PATHS = [
  '/auth/signin',
  '/auth/signup',
  '/auth/signup/verify',
  '/auth/forgot-password',
  '/auth/forgot-password/verify',
  '/auth/reset-password',
  '/auth/refresh',
];

const isPublicAuthRequest = (url?: string) =>
  PUBLIC_AUTH_PATHS.some((path) => url?.includes(path));

const normalizeApiError = (error: any) => {
  const status = error?.response?.status;
  const responseData = error?.response?.data;

  if (responseData && typeof responseData === 'object') {
    return { status, ...responseData };
  }

  return {
    status,
    error: error?.message || 'Request failed',
  };
};

api.interceptors.request.use(
  async (config) => {
    if (isPublicAuthRequest(config.url)) {
      return config;
    }

    const accessToken = await ensureFreshAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    }

    clearStoredTokens();
    redirectToLogin();

    return Promise.reject({
      status: 401,
      error: 'Authentication required',
    });
  },
  (error) => Promise.reject(normalizeApiError(error))
);

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = (error.config ?? {}) as typeof error.config & { _retry?: boolean };
    const isUnauthorized = error?.response?.status === 401;

    if (isUnauthorized && !originalRequest._retry && !isPublicAuthRequest(originalRequest.url)) {
      originalRequest._retry = true;

      const accessToken = await refreshAccessToken();
      if (accessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      }

      clearStoredTokens();
      redirectToLogin();
    }

    return Promise.reject(normalizeApiError(error));
  }
);

export default api;
