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
  const { isLoading, isAuthenticated, profile, isProfileLoading, profileError } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isProfileLoading) return;
    if (!isAuthenticated) return;
    if (profile) return;
    if (profileError) return; // Don't redirect on network errors
    if (pathname.startsWith("/onboarding")) return;
    router.replace("/onboarding");
  }, [isLoading, isProfileLoading, isAuthenticated, profile, profileError, pathname, router]);

  return null;
}
