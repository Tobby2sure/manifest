"use client";

import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import { updateProfile } from "@/app/actions/profiles";
import { CheckCircle, Link2, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

export default function VerifyXPage() {
  const router = useRouter();
  const { user, linkTwitter } = usePrivy();
  const { profile } = useUser();
  const [syncing, setSyncing] = useState(false);

  const twitterAccount = user?.twitter;
  const hasTwitter = !!twitterAccount;

  useEffect(() => {
    if (hasTwitter && profile && !profile.twitter_verified) {
      setSyncing(true);
      updateProfile(profile.id, {
        twitter_handle: twitterAccount?.username ?? undefined,
        twitter_verified: true,
      })
        .then(() => router.push("/feed"))
        .catch(() => setSyncing(false));
    }
  }, [hasTwitter, profile, twitterAccount, router]);

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white/90">
            Sign in to continue
          </h1>
          <p className="text-zinc-400 mt-2">
            You need to be logged in to verify your X account.
          </p>
        </div>
      </main>
    );
  }

  if (profile?.twitter_verified) {
    router.push("/feed");
    return null;
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-6">
          <h2 className="text-xl font-bold text-white/90 mb-1">
            Connect your X account
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Link your X (Twitter) account to post intents. This verifies your
            identity in the Web3 community.
          </p>

          {hasTwitter ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <CheckCircle className="size-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-400">
                  X Connected
                </p>
                <p className="text-xs text-zinc-400">
                  @{twitterAccount?.username}
                </p>
              </div>
            </div>
          ) : (
            <Button
              onClick={linkTwitter}
              variant="outline"
              className="w-full border-white/10 hover:bg-white/5"
            >
              <Link2 className="size-4 mr-2" />
              Connect X Account
            </Button>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => router.push("/feed")}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              Skip for now
            </Button>
            {hasTwitter && (
              <Button
                onClick={() => router.push("/feed")}
                disabled={syncing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
              >
                {syncing ? "Syncing..." : "Continue"}
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            )}
          </div>

          {!hasTwitter && (
            <p className="text-xs text-zinc-500 text-center mt-4">
              You can still browse intents and send connection requests without
              X verification, but you won&apos;t be able to post intents.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
