'use client';

import { Providers } from '@/components/providers';

export function AppShell({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
