'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import CommandCenter from '@/components/dashboard/command-center';
import { useCompany } from '@/hooks/api/company.hooks';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api-error';

export default function DashboardPage() {
  const router = useRouter();
  const { data: companyData, isLoading, error } = useCompany();
  const companyMissing = getApiErrorStatus(error) === 404;

  useEffect(() => {
    if (companyMissing) {
      router.replace('/setup-company');
    }
  }, [companyMissing, router]);

  if (isLoading || companyMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {companyMissing ? 'Redirecting to company setup...' : 'Loading your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md space-y-3 border border-border bg-card p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Dashboard Unavailable</p>
          <h1 className="text-2xl font-serif">We couldn&apos;t load your company context.</h1>
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(error, 'Please refresh and try again.')}
          </p>
        </div>
      </div>
    );
  }

  if (!companyData?.data?.company) {
    return null;
  }

  return <CommandCenter />;
}
