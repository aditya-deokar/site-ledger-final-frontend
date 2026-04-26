'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

import { Toaster } from '@/components/ui/sonner';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const shouldRetryQuery = (failureCount: number, error: any) => {
  if (error?.status === 401) {
    return false;
  }

  return failureCount < 1;
};

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

  const content = (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" closeButton />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );

  // const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // if (!recaptchaKey) {
  //   return content;
  // }

  // return (
  //   <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey}>
  //     {content}
  //   </GoogleReCaptchaProvider>
  // );

  return content;
}
