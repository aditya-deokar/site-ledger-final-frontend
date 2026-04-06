'use client';

import { useEffect, useState } from 'react';

import {
  ensureFreshAccessToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  isTokenExpiringSoon,
} from '@/lib/auth-session';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

function getInitialStatus(): AuthStatus {
  if (typeof window === 'undefined') return 'loading';

  const accessToken = getStoredAccessToken();
  if (accessToken && !isTokenExpiringSoon(accessToken, 5_000)) {
    return 'authenticated';
  }

  if (accessToken || getStoredRefreshToken()) {
    return 'loading';
  }

  return 'unauthenticated';
}

export function useAuthBootstrap() {
  const [status, setStatus] = useState<AuthStatus>(() => getInitialStatus());

  useEffect(() => {
    if (status !== 'loading') {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      const accessToken = await ensureFreshAccessToken();

      if (cancelled) return;

      setStatus(accessToken ? 'authenticated' : 'unauthenticated');
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return {
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    status,
  };
}
