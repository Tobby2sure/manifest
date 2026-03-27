'use client';

import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// Load Privy provider only on client — never during SSR/prerender
const PrivyProviderClient = dynamic(
  () => import('@/components/privy-provider'),
  { ssr: false }
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProviderClient>
        {children}
      </PrivyProviderClient>
    </QueryClientProvider>
  );
}
