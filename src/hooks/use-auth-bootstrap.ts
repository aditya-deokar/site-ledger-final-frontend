'use client';

import { useEffect, useState } from 'react';

import {
  ensureFreshAccessToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  isTokenExpiringSoon,
} from '@/lib/auth-session';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuthBootstrap() {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const storedAccessToken = getStoredAccessToken();
      const storedRefreshToken = getStoredRefreshToken();

      if (storedAccessToken && !isTokenExpiringSoon(storedAccessToken, 5_000)) {
        if (!cancelled) {
          setStatus('authenticated');
        }
        return;
      }

      if (!storedAccessToken && !storedRefreshToken) {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
        return;
      }

      const accessToken = await ensureFreshAccessToken();

      if (cancelled) return;

      setStatus(accessToken ? 'authenticated' : 'unauthenticated');
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    status,
  };
}
