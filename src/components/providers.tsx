"use client";

import { DynamicContextProvider, DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const DYNAMIC_ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
  }));

  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
        // Login via email only — Twitter is a separate verification step
        initialAuthenticationMode: "connect-and-sign",
        events: {
          onAuthSuccess: async ({ user }) => {
            // Only redirect to onboarding if truly new AND no profile exists
            if (!user.newUser) return;
            // Check if profile already exists before redirecting
            try {
              const res = await fetch(`/api/check-profile?userId=${user.userId}`);
              const data = await res.json();
              if (!data.exists) {
                window.location.href = '/onboarding';
              }
            } catch {
              // Fallback: don't redirect if check fails
            }
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        {/* DynamicWidget must be mounted for setShowAuthFlow modal to render — hidden */}
        <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          <DynamicWidget />
        </div>
        {children}
      </QueryClientProvider>
    </DynamicContextProvider>
  );
}
// cache bust Sat Mar 28 21:17:25 WAT 2026
