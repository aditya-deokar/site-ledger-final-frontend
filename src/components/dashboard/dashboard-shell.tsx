'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Loader2 } from 'lucide-react';

import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap';

import { Sidebar, SidebarProvider, useSidebar } from './sidebar';
import { Menu } from 'lucide-react';

function DashboardShellLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center border-2 border-primary/20 bg-muted/30">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
            Restoring Session
          </p>
        </div>
      </div>
    </div>
  );
}

// Track first mount globally to prevent flickering on client-side navigation
let hasMountedGlobally = false;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthBootstrap();
  const [isMounted, setIsMounted] = useState(hasMountedGlobally);

  useEffect(() => {
    hasMountedGlobally = true;
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, isMounted]);

  // To prevent hydration mismatch, we MUST render the same thing as the server on the first pass
  // On the server, isLoading is always true. On the client, it might be false immediately if token is found.
  if (!isMounted || isLoading || !isAuthenticated) {
    return <DashboardShellLoading />;
  }

  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { toggle } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Mobile Toggle - Floating because header is gone */}
        <button
          onClick={toggle}
          className="lg:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95"
          aria-label="Toggle Menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-10 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
