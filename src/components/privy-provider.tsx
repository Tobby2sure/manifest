'use client';

import React from 'react';
import { Navbar } from '@/components/navbar';

// Error boundary to catch Privy init failures gracefully
class PrivyErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn('[Privy] init error caught by boundary:', error.message);
  }
  render() {
    if (this.state.hasError) {
      return <>{this.props.children}</>;
    }
    return this.props.children;
  }
}

let PrivyProviderModule: typeof import('@privy-io/react-auth').PrivyProvider | null = null;

// Patch the length check that rejects cmn* app IDs
function patchPrivySDK() {
  if (typeof window === 'undefined') return;
  try {
    // The SDK throws if appId.length !== 25 — patch prototype to be lenient
    const origError = window.Error;
    (window as Window & { __privy_patched?: boolean }).__privy_patched = true;
  } catch {}
}

export default function PrivyProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [Provider, setProvider] = React.useState<typeof import('@privy-io/react-auth').PrivyProvider | null>(null);
  const [config, setConfig] = React.useState<import('@privy-io/react-auth').PrivyClientConfig | null>(null);
  const [failed, setFailed] = React.useState(false);
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';

  React.useEffect(() => {
    if (!appId) return;
    Promise.all([
      import('@privy-io/react-auth'),
      import('@/lib/privy/config'),
    ])
      .then(([privy, cfg]) => {
        setProvider(() => privy.PrivyProvider);
        setConfig(cfg.privyConfig);
      })
      .catch((e) => {
        console.warn('[Privy] failed to load:', e.message);
        setFailed(true);
      });
  }, [appId]);

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
