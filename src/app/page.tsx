'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {

      router.push('/login');
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  return null;
}
