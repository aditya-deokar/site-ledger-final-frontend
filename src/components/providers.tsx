'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

import { Toaster } from '@/components/ui/sonner';

const shouldRetryQuery = (failureCount: number, error: any) => {
  if (error?.status === 401) {
    return false;
  }

  return failureCount < 1;
};

import { ThemeProvider } from 'next-themes';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: shouldRetryQuery,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster richColors position="top-right" closeButton />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
