"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function VerifyXPage() {
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const { setShowAuthFlow } = useDynamicContext();
  const { profile } = useUser();
  
  const isLoading = status === "loading";

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-6 text-center">
            <h2 className="text-xl font-bold text-white/90 mb-2">
              Sign in to verify
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Sign in with your X (Twitter) account to verify your identity.
            </p>
            <Button
              onClick={() => setShowAuthFlow(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0"
            >
              Sign in with X
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // User is authenticated via X (NextAuth Twitter provider) — already verified
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-6">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 mb-6">
            <CheckCircle className="size-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Already verified via X login
              </p>
              <p className="text-xs text-zinc-400">
                Your X account is automatically verified when you sign in.
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push("/feed")}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          >
            Continue to Feed
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
