'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useUser() {
  const { user, ready, authenticated } = usePrivy();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    user,
    profile: query.data,
    isLoading: !ready,
    isAuthenticated: authenticated,
    refetch: query.refetch,
  };
}
