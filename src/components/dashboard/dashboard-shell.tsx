'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Loader2 } from 'lucide-react';

import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap';

import { Sidebar, SidebarProvider } from './sidebar';
import { Header } from './header';

function DashboardShellLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-6 dark:bg-black">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center border border-border bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
            Restoring Session
          </p>
          <p className="text-sm text-muted-foreground">
            Securing your dashboard before loading live data.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthBootstrap();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  if (!mounted || isLoading || !isAuthenticated) {
    return <DashboardShellLoading />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh overflow-hidden bg-gray-50 font-sans dark:bg-black print:block print:min-h-0 print:overflow-visible print:bg-white">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col print:block print:min-w-0">
          <div className="print:hidden">
            <Header />
          </div>
          <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-7 print:block print:overflow-visible print:px-0 print:pb-0 print:pt-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
