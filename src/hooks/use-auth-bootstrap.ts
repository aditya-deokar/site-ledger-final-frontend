'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';
import { refreshSession } from '@/lib/auth-session';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuthBootstrap() {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await authService.getMe();
        if (!cancelled) {
          setStatus('authenticated');
        }
        return;
      } catch (error: any) {
        if (error?.status !== 401) {
          if (!cancelled) {
            setStatus('unauthenticated');
          }
          return;
        }
      }

      const refreshed = await refreshSession();

      if (cancelled) return;

      if (!refreshed) {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
        return;
      }

      try {
        await authService.getMe();
        setStatus('authenticated');
      } catch {
        setStatus('unauthenticated');
      }
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
