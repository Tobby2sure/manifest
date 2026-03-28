'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface UserData {
  id: string;
  name?: string | null;
  image?: string | null;
  username?: string;
  twitter_id?: string;
  profile?: Record<string, unknown> | null;
}

export function useUser() {
  const { data: session, status } = useSession();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['user-profile', session?.user],
    queryFn: async () => {
      if (!session?.user) return null;
      const userId = (session.user as { id?: string }).id;
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data;
    },
    enabled: !!session?.user,
  });

  return {
    user: session?.user as UserData | undefined,
    profile: query.data,
    isLoading: status === 'loading',
    isAuthenticated: !!session?.user,
  };
}
