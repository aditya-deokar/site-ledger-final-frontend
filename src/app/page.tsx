'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap';

export default function RootPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthBootstrap();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    router.replace(isAuthenticated ? '/transactions' : '/login');
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
