'use client';

import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// Load Privy only client-side — never during SSR/prerender
const PrivyProviderClient = dynamic(
  () => import('@/components/privy-provider'),
  {
    ssr: false,
    loading: () => null,
  }
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: { staleTime: 1000 * 60 * 5, retry: 1 },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProviderClient>
        {children}
      </PrivyProviderClient>
    </QueryClientProvider>
  );
}
