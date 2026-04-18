"use client";

import {
  DynamicContextProvider,
  DynamicWidget,
  useDynamicContext,
  getAuthToken,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProviderWrapper } from "@/components/posthog-provider";
import { ProfileGuard } from "@/components/profile-guard";
import { useUser } from "@/lib/hooks/use-user";
import { backfillWalletAddress } from "@/app/actions/profiles";
import { useState, useEffect } from "react";

/**
 * Ensures the manifest_session httpOnly cookie exists whenever the user
 * is authenticated. Needed because onAuthSuccess only fires on login,
 * not when returning with an existing Dynamic session.
 *
 * Passes the Dynamic JWT to the server — the server verifies it against
 * Dynamic's JWKS before minting the session cookie, so no identity
 * information is trusted from the client.
 */
function SessionSync() {
  const { user, sdkHasLoaded, primaryWallet } = useDynamicContext();
  const { profile, refetch } = useUser();

  useEffect(() => {
    if (!sdkHasLoaded || !user?.userId) return;

    const token = getAuthToken();
    if (!token) return; // token not yet materialized; SDK will re-render

    fetch("/api/auth/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [sdkHasLoaded, user?.userId]);

  // If Dynamic has a wallet for this user (embedded or external) but the
  // profile row doesn't, backfill it. Covers Google/social-login users
  // whose embedded wallet arrives after the initial onboarding write.
  useEffect(() => {
    if (!sdkHasLoaded || !user?.userId || !profile) return;
    if (profile.wallet_address) return;

    const blockchainCred = user.verifiedCredentials?.find(
      (c) => c.format === "blockchain"
    ) as { address?: string } | undefined;
    const address = primaryWallet?.address ?? blockchainCred?.address;
    if (!address) return;

    backfillWalletAddress(address)
      .then(() => refetch())
      .catch(() => {});
  }, [sdkHasLoaded, user, profile, primaryWallet, refetch]);

  return null;
}

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
        initialAuthenticationMode: "connect-and-sign",
        events: {
          onAuthSuccess: async () => {
            try {
              const token = getAuthToken();
              if (!token) return;

              // Server verifies the JWT and extracts the userId itself.
              const sessionRes = await fetch("/api/auth/session", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!sessionRes.ok) return;

              // Profile existence is now keyed off the session cookie, not
              // a client-supplied userId (prevents enumeration).
              const res = await fetch("/api/check-profile");
              if (!res.ok) return;
              const data = await res.json();
              if (data.exists === false) {
                window.location.href = '/onboarding';
              } else if (data.exists === true) {
                const current = window.location.pathname;
                if (current === '/' || current.startsWith('/onboarding')) {
                  window.location.href = '/feed';
                }
              }
            } catch (e) {
              console.error("Failed to establish session:", e);
            }
          },
          onLogout: async () => {
            await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PostHogProviderWrapper>
          <SessionSync />
          <ProfileGuard />
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
