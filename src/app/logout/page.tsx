'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Loader2 } from 'lucide-react';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    authService.logout();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
