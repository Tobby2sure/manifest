"use client";

import { DynamicContextProvider, DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProviderWrapper } from "@/components/posthog-provider";
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
        // Embedded wallets: enable in Dynamic Labs dashboard → Embedded Wallets → Enable
        events: {
          onAuthSuccess: async ({ user }) => {
            // Always check for profile — Dynamic may not reliably set newUser
            // (e.g., after failed embedded wallet setup or retry)
            try {
              const res = await fetch(`/api/check-profile?userId=${user.userId}`);
              const data = await res.json();
              if (!data.exists) {
                window.location.href = '/onboarding';
              } else {
                const current = window.location.pathname;
                if (current === '/' || current.startsWith('/onboarding')) {
                  window.location.href = '/feed';
                }
              }
            } catch (e) {
              console.error("Failed to check profile:", e);
            }
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PostHogProviderWrapper>
          {/* DynamicWidget must be mounted for setShowAuthFlow modal to render — hidden */}
          <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
            <DynamicWidget />
          </div>
          {children}
        </PostHogProviderWrapper>
      </QueryClientProvider>
    </DynamicContextProvider>
  );
}
