'use client';

import { useEffect, useState } from 'react';

import {
  ensureFreshAccessToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  isTokenExpiringSoon,
} from '@/lib/auth-session';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

function getInitialAuthStatus(): AuthStatus {
  const accessToken = getStoredAccessToken();

  if (accessToken && !isTokenExpiringSoon(accessToken, 5_000)) {
    return 'authenticated';
  }

  if (!accessToken && !getStoredRefreshToken()) {
    return 'unauthenticated';
  }

  return 'loading';
}

export function useAuthBootstrap() {
  const [status, setStatus] = useState<AuthStatus>(getInitialAuthStatus);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const accessToken = getStoredAccessToken();

      if (accessToken && !isTokenExpiringSoon(accessToken, 5_000)) {
        if (!cancelled) {
          setStatus('authenticated');
        }
        return;
      }

      if (!accessToken && !getStoredRefreshToken()) {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
        return;
      }

      const refreshedAccessToken = await ensureFreshAccessToken();

      if (cancelled) return;

      setStatus(refreshedAccessToken ? 'authenticated' : 'unauthenticated');
    };

    void bootstrap();

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
