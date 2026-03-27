"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { privyConfig } from "@/lib/privy/config";
import { Navbar } from "@/components/navbar";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

  if (!appId) {
    return (
      <QueryClientProvider client={queryClient}>
        <Navbar />
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <Navbar />
        {children}
      </QueryClientProvider>
    </PrivyProvider>
  );
}
