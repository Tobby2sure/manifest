'use client';

import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from '@/lib/privy/config';
import { Navbar } from '@/components/navbar';

interface State { hasError: boolean; }

class PrivyErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.warn('[Privy] Provider error caught:', error.message); }
  render() {
    if (this.state.hasError) {
      return (
        <>
          <Navbar />
          {this.props.children}
        </>
      );
    }
    return this.props.children;
  }
}

export default function PrivyProviderClient({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';

  if (!appId) {
    return <><Navbar />{children}</>;
  }

  return (
    <PrivyErrorBoundary>
      <PrivyProvider appId={appId} config={privyConfig}>
        <Navbar />
        {children}
      </PrivyProvider>
    </PrivyErrorBoundary>
  );
}
