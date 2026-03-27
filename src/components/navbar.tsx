"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

function AuthButtons() {
  const { login, logout, authenticated, ready } = usePrivy();

  if (!ready) return null;

  return authenticated ? (
    <Button variant="ghost" onClick={logout}>
      Sign out
    </Button>
  ) : (
    <Button onClick={login}>Sign in</Button>
  );
}

export function Navbar() {
  const hasPrivy = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <a href="/feed" className="text-xl font-bold tracking-tight">
          Manifest
        </a>
        {hasPrivy && <AuthButtons />}
      </div>
    </nav>
  );
}
