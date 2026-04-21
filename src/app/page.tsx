'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useCompany } from '@/hooks/api/company.hooks';
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api-error';

export default function RootPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthBootstrap();
  const {
    data: companyData,
    error: companyError,
    isLoading: isCompanyLoading,
  } = useCompany({ enabled: !isLoading && isAuthenticated });

  const companyMissing = getApiErrorStatus(companyError) === 404;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isCompanyLoading) {
      return;
    }

    if (companyData?.data?.company) {
      router.replace('/dashboard');
      return;
    }

    if (companyMissing) {
      router.replace('/setup-company');
    }
  }, [companyData, companyMissing, isAuthenticated, isCompanyLoading, isLoading, router]);

  if (!isLoading && isAuthenticated && !isCompanyLoading && companyError && !companyMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md space-y-3 border border-border bg-card p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Startup Check Failed</p>
          <h1 className="text-2xl font-serif">We couldn&apos;t verify your company setup.</h1>
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(companyError, 'Please refresh and try again.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
