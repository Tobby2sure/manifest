"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/lib/hooks/use-user";
import { getOrg, generateInviteCode } from "./actions";
import { Button } from "@/components/ui/button";
import { IntentCard } from "@/components/intent-card";
import {
  CheckCircle,
  Globe,
  Users,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import type { IntentWithAuthor } from "@/lib/types/database";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  twitter_handle: string | null;
  twitter_verified: boolean;
  created_by: string;
  members: Array<{
    id: string;
    profile_id: string;
    role: string;
    profiles: {
      id: string;
      display_name: string | null;
      twitter_handle: string | null;
      twitter_verified: boolean;
      avatar_url: string | null;
    };
  }>;
  intents: IntentWithAuthor[];
}

export default function OrgPage() {
  const params = useParams();
  const router = useRouter();
  const { authenticated } = usePrivy();
  const { profile } = useUser();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const slug = params.slug as string;

  useEffect(() => {
    getOrg(slug)
      .then((data) => setOrg(data as OrgData | null))
      .finally(() => setLoading(false));
  }, [slug]);

  const isMember = org?.members.some((m) => m.profile_id === profile?.id);
  const isAdmin = org?.members.some(
    (m) => m.profile_id === profile?.id && m.role === "admin"
  );

  async function handleGenerateInvite() {
    if (!org || !profile) return;
    setGenerating(true);
    try {
      const invite = await generateInviteCode(org.id, profile.id);
      setInviteCode(invite.code);
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(
      `${window.location.origin}/invite/${inviteCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!org) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white/90">
            Organization not found
          </h1>
          <Button
            variant="outline"
            onClick={() => router.push("/feed")}
            className="mt-4 border-white/10"
          >
            Back to Feed
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#080810] p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Org Header */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-6">
          <div className="flex items-start gap-4">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="size-16 rounded-xl object-cover"
              />
            ) : (
              <div className="size-16 rounded-xl bg-white/10 flex items-center justify-center text-2xl font-bold text-white/60">
                {org.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white/90">
                  {org.name}
                </h1>
                {org.twitter_verified && (
                  <CheckCircle className="size-5 text-emerald-400" />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                {org.website && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white/80 transition-colors"
                  >
                    <Globe className="size-3.5" />
                    {org.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {org.twitter_handle && (
                  <a
                    href={`https://x.com/${org.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-sky-400 transition-colors"
                  >
                    <CheckCircle className="size-3.5 text-sky-400" />@
                    {org.twitter_handle}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {org.members.length} member
                  {org.members.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Admin: Generate invite */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              {inviteCode ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-300 truncate">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/invite/${inviteCode}`
                      : `/invite/${inviteCode}`}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="border-white/10 shrink-0"
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-400" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateInvite}
                  disabled={generating}
                  className="border-white/10"
                >
                  <Link2 className="size-4 mr-1.5" />
                  {generating ? "Generating..." : "Generate Invite Link"}
                </Button>
              )}
            </div>
          )}

          {/* Non-member: Join */}
          {authenticated && !isMember && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-sm text-zinc-400 mb-2">
                Have an invite code? Use it to join this organization.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/feed")}
                className="border-white/10"
              >
                Enter invite code
              </Button>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-6">
          <h2 className="text-lg font-semibold text-white/90 mb-4">Members</h2>
          <div className="space-y-3">
            {org.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3"
              >
                {member.profiles.avatar_url ? (
                  <img
                    src={member.profiles.avatar_url}
                    alt=""
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
                    {(member.profiles.display_name ?? "?")[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white/90 truncate">
                      {member.profiles.display_name ?? "Anonymous"}
                    </span>
                    {member.profiles.twitter_verified && (
                      <CheckCircle className="size-3 text-sky-400" />
                    )}
                    <span className="text-xs text-zinc-500 capitalize">
                      {member.role}
                    </span>
                  </div>
                  {member.profiles.twitter_handle && (
                    <p className="text-xs text-zinc-500">
                      @{member.profiles.twitter_handle}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Intents */}
        <div>
          <h2 className="text-lg font-semibold text-white/90 mb-4">
            Active Intents
          </h2>
          {org.intents.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-6 text-center">
              <p className="text-zinc-400">No active intents yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {org.intents.map((intent) => (
                <IntentCard
                  key={intent.id}
                  intent={intent}
                  currentUserId={profile?.id ?? null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
