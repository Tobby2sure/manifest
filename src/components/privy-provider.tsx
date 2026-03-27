'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from '@/lib/privy/config';
import { Navbar } from '@/components/navbar';

export default function PrivyProviderClient({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';
  if (!appId) return <>{children}</>;
  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <Navbar />
      {children}
    </PrivyProvider>
  );
}
