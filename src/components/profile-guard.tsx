"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";

/**
 * Global guard: redirects authenticated users with no profile to onboarding.
 * Prevents the broken state where Dynamic creates a session but the user
 * never completed profile creation (e.g., failed embedded wallet setup).
 */
export function ProfileGuard() {
  const { isLoading, isAuthenticated, profile } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (profile) return;

    // Don't redirect if already on onboarding
    if (pathname.startsWith("/onboarding")) return;

    router.replace("/onboarding");
  }, [isLoading, isAuthenticated, profile, pathname, router]);

  return null;
}
