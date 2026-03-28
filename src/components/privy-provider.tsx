'use client';

// Privy has been removed — auth is handled by NextAuth via SessionProvider in providers.tsx.
// This file is kept for backward compatibility with any residual imports.
export default function PrivyProviderClient({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
