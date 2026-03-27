'use client';

import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const PrivyProviderClient = dynamic(
  () => import('@/components/privy-provider'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-600 text-sm">Loading Manifest...</p>
        </div>
      </div>
    ),
  }
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProviderClient>
        {children}
      </PrivyProviderClient>
    </QueryClientProvider>
  );
}
