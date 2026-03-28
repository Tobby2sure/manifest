"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";

const DYNAMIC_ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
  }));

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
        socialProvidersFilter: (providers) =>
          providers.filter((p) => p === "twitter"),
        events: {
          onAuthSuccess: ({ user }) => {
            console.log("[Dynamic] Auth success:", user.userId);
          },
        },
        initialAuthenticationMode: "connect-and-sign",
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </DynamicContextProvider>
  );
}
