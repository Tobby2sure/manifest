"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useUser } from "@/lib/hooks/use-user";
import { validateInvite, consumeInvite } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users } from "lucide-react";

interface InviteOrg {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  twitter_verified: boolean;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const { profile } = useUser();
  const [org, setOrg] = useState<InviteOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const code = params.code as string;

  useEffect(() => {
    validateInvite(code)
      .then((data) => {
        if (data) setOrg(data.organizations as InviteOrg);
      })
      .finally(() => setLoading(false));
  }, [code]);

  async function handleJoin() {
    if (!profile) return;
    setJoining(true);
    setError("");
    try {
      const result = await consumeInvite(code, profile.id);
      setSuccess(true);
      setTimeout(() => router.push(`/org/${(result as InviteOrg).slug}`), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center">
        <p className="text-zinc-400">Loading invite...</p>
      </main>
    );
  }

  if (!org) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center p-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-6 text-center max-w-md w-full">
          <h2 className="text-xl font-bold text-white/90 mb-2">
            Invalid Invite
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            This invite link is invalid, expired, or has reached its maximum
            uses.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/feed")}
            className="border-white/10"
          >
            Go to Feed
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center p-4">
      <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-6 max-w-md w-full">
        <div className="flex items-center gap-4 mb-6">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name}
              className="size-14 rounded-xl object-cover"
            />
          ) : (
            <div className="size-14 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold text-white/60">
              {org.name[0]}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold text-white/90">{org.name}</h2>
              {org.twitter_verified && (
                <CheckCircle className="size-4 text-emerald-400" />
              )}
            </div>
            {org.website && (
              <p className="text-sm text-zinc-400">
                {org.website.replace(/^https?:\/\//, "")}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-6">
          You&apos;ve been invited to join <strong className="text-white/90">{org.name}</strong> on
          Manifest.
        </p>

        {success ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle className="size-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Joined successfully!
              </p>
              <p className="text-xs text-zinc-400">Redirecting...</p>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <Button
            onClick={() => signIn('twitter')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          >
            <Users className="size-4 mr-1.5" />
            Sign in to Join {org.name}
          </Button>
        ) : (
          <Button
            onClick={handleJoin}
            disabled={joining || !profile}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          >
            <Users className="size-4 mr-1.5" />
            {joining ? "Joining..." : `Join ${org.name}`}
          </Button>
        )}

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
