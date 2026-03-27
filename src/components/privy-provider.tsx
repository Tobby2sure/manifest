'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/navbar';

// Lazy load Privy to catch init errors
export default function PrivyProviderClient({ children }: { children: React.ReactNode }) {
  const [PrivyComponent, setPrivyComponent] = useState<React.ComponentType<{ appId: string; config: object; children: React.ReactNode }> | null>(null);
  const [privyConfig, setPrivyConfig] = useState<object | null>(null);
  const [privyError, setPrivyError] = useState(false);

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';

  useEffect(() => {
    if (!appId) return;
    import('@privy-io/react-auth').then(({ PrivyProvider }) => {
      import('@/lib/privy/config').then(({ privyConfig: cfg }) => {
        setPrivyComponent(() => PrivyProvider);
        setPrivyConfig(cfg);
      });
    }).catch(() => setPrivyError(true));
  }, [appId]);

  if (!appId || privyError) {
    return (
      <>
        <Navbar />
        {children}
      </>
    );
  }

  if (!PrivyComponent || !privyConfig) {
    return (
      <>
        <Navbar />
        {children}
      </>
    );
  }

  const SafePrivy = PrivyComponent as React.ComponentType<{ appId: string; config: object; children: React.ReactNode }>;

  try {
    return (
      <SafePrivy appId={appId} config={privyConfig}>
        <Navbar />
        {children}
      </SafePrivy>
    );
  } catch {
    setPrivyError(true);
    return (
      <>
        <Navbar />
        {children}
      </>
    );
  }
}
