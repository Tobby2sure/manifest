"use client";

import { useDynamicContext, useSocialAccounts } from "@dynamic-labs/sdk-react-core";
import { ProviderEnum } from "@dynamic-labs/sdk-api-core";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";

export default function VerifyXPage() {
  const router = useRouter();
  const { isAuthenticated, twitterVerified, twitterHandle } = useUser();
  const { setShowAuthFlow } = useDynamicContext();
  const { linkSocialAccount, isProcessing } = useSocialAccounts();

  const handleConnectX = async () => {
    try {
      await linkSocialAccount(ProviderEnum.Twitter, { forcePopup: true });
    } catch (e) {
      console.error("Twitter link error:", e);
    }
  };

  // Not logged in at all
  if (!isAuthenticated) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#0a0a12] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <p className="text-zinc-400 mb-4">Sign in first to verify your X account.</p>
          <Button onClick={() => setShowAuthFlow(true)} className="bg-violet-600 hover:bg-violet-500 text-white">
            Sign In
          </Button>
        </div>
      </main>
    );
  }

  // Already verified
  if (twitterVerified) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#0a0a12] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f1a] p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="size-7 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">X Account Verified</h2>
            <p className="text-zinc-400 text-sm mb-2">
              Connected as <span className="text-white font-medium">@{twitterHandle}</span>
            </p>
            <p className="text-zinc-500 text-xs mb-6">You can now post intents and connect with others.</p>
            <Button onClick={() => router.push("/feed")} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
              Go to Feed <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Logged in but X not yet linked
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#0a0a12] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f1a] p-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1a1a2e] border border-white/[0.08] flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white/70">
            𝕏
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">Verify your X account</h2>
          <p className="text-zinc-400 text-sm text-center mb-8">
            Linking X gives you a verified badge, lets you post intents, and connect with others on Manifest.
          </p>

          <div className="space-y-3 mb-8">
            {[
              'Verified badge on your profile',
              'Post intents to the feed',
              'Send and receive connection requests',
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="text-emerald-400 font-bold">✓</span>
                {text}
              </div>
            ))}
          </div>

          <Button
            onClick={handleConnectX}
            disabled={isProcessing}
            className="w-full bg-black hover:bg-zinc-900 text-white border border-white/10 py-3 font-semibold cursor-pointer"
          >
            {isProcessing ? (
              <><Loader2 className="size-4 mr-2 animate-spin" />Connecting...</>
            ) : (
              <><span className="mr-2 font-bold">𝕏</span>Connect X Account</>
            )}
          </Button>
          <button
            onClick={() => router.push("/feed")}
            className="w-full mt-3 text-sm text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
