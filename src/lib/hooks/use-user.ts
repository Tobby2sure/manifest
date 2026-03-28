'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useUser() {
  const { user, sdkHasLoaded } = useDynamicContext();
  const supabase = createClient();

  const twitterAccount = user?.verifiedCredentials?.find(
    (c) => c.oauthProvider === 'twitter'
  );

  const query = useQuery({
    queryKey: ['user-profile', user?.userId],
    queryFn: async () => {
      if (!user?.userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.userId)
        .single();
      return data;
    },
    enabled: !!user?.userId,
  });

  return {
    user: user ?? null,
    profile: query.data ?? null,
    isLoading: !sdkHasLoaded,
    isAuthenticated: !!user,
    twitterHandle: twitterAccount?.oauthUsername ?? null,
    twitterVerified: !!twitterAccount,
    refetch: query.refetch,
  };
}
