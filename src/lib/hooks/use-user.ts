"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export function useUser() {
  const { user, ready, authenticated } = usePrivy();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    if (!authenticated || !user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      setProfile(data as Profile | null);
      setIsLoading(false);
    }

    fetchProfile();
  }, [user, ready, authenticated]);

  return {
    user,
    profile,
    isLoading: !ready || isLoading,
    isAuthenticated: authenticated,
  };
}
