'use client';

import React, { useEffect, useState } from 'react';

// Global unhandled rejection handler — catches Privy's async getServerConfig() throw
// before it can kill the page. Must be installed before PrivyProvider mounts.
function useGlobalPrivyErrorSuppressor() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message ?? String(event.reason ?? '');
      if (
        msg.includes('invalid Privy app ID') ||
        msg.includes('Privy app ID') ||
        msg.includes('getServerConfig') ||
        msg.includes('privy')
      ) {
        event.preventDefault();
        console.warn('[Privy] Suppressed init error:', msg);
      }
    };
    const errorHandler = (event: ErrorEvent) => {
      const msg = event.message ?? '';
      if (msg.includes('invalid Privy app ID') || msg.includes('Privy')) {
        event.preventDefault();
        console.warn('[Privy] Suppressed error:', msg);
      }
    };
    window.addEventListener('unhandledrejection', handler);
    window.addEventListener('error', errorHandler);
    return () => {
      window.removeEventListener('unhandledrejection', handler);
      window.removeEventListener('error', errorHandler);
    };
  }, []);
}

class PrivyErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.warn('[Privy] Boundary caught:', error.message);
  }
  render() {
    if (this.state.hasError) return <>{this.props.children}</>;
    return this.props.children;
  }
}

function PrivyLoader({ children }: { children: React.ReactNode }) {
  useGlobalPrivyErrorSuppressor();

  const [Provider, setProvider] = useState<React.ComponentType<{
    appId: string;
    config: Record<string, unknown>;
    children: React.ReactNode;
  }> | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [failed, setFailed] = useState(false);

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';

  useEffect(() => {
    if (!appId) return;
    Promise.all([
      import('@privy-io/react-auth'),
      import('@/lib/privy/config'),
    ])
      .then(([privy, cfg]) => {
        setProvider(() => privy.PrivyProvider as typeof Provider);
        setConfig(cfg.privyConfig as Record<string, unknown>);
      })
      .catch((e) => {
        console.warn('[Privy] Failed to load SDK:', e?.message);
        setFailed(true);
      });
  }, [appId]);

  // Always render children — auth is progressive enhancement
  if (!appId || failed || !Provider || !config) {
    return <>{children}</>;
  }

  const P = Provider;
  return (
    <PrivyErrorBoundary>
      <P appId={appId} config={config}>
        {children}
      </P>
    </PrivyErrorBoundary>
  );
}

export default function PrivyProviderClient({ children }: { children: React.ReactNode }) {
  return <PrivyLoader>{children}</PrivyLoader>;
}
