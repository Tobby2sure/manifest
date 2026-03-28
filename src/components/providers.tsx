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
          onAuthSuccess: ({ user }) => {
            // Redirect to onboarding after first login
            if (user.newUser) {
              window.location.href = '/onboarding';
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
