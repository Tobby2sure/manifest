"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntentCard } from "@/components/intent-card";
import { useUser } from "@/lib/hooks/use-user";
import type { Profile, IntentWithAuthor } from "@/lib/types/database";
import {
  CheckCircle,
  ExternalLink,
  Award,
  Edit,
} from "lucide-react";
import Link from "next/link";

interface ProfileClientProps {
  profile: Profile;
  intents: IntentWithAuthor[];
}

export function ProfileClient({ profile, intents }: ProfileClientProps) {
  const { profile: currentProfile } = useUser();
  const isOwn = currentProfile?.id === profile.id;

  const initials = profile.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const activeIntents = intents.filter(
    (i) => i.lifecycle_status === "active"
  );

  return (
    <div>
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-8">
        <Avatar size="lg" className="size-20">
          {profile.avatar_url ? (
            <AvatarImage
              src={profile.avatar_url}
              alt={profile.display_name ?? ""}
            />
          ) : null}
          <AvatarFallback className="text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white/90">
              {profile.display_name ?? "Anonymous"}
            </h1>
            {profile.twitter_verified && (
              <CheckCircle className="size-5 text-emerald-400" />
            )}
          </div>
          {profile.twitter_handle && (
            <p className="text-sm text-zinc-400 mt-0.5">
              @{profile.twitter_handle}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-white/70 mt-2 max-w-lg leading-relaxed">
              {profile.bio}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              {profile.account_type === "organization"
                ? "Organization"
                : "Individual"}
            </Badge>
          </div>
        </div>

        {isOwn && (
          <Link href="/onboarding">
            <Button variant="outline" size="sm">
              <Edit className="size-3.5 mr-1.5" />
              Edit Profile
            </Button>
          </Link>
        )}
      </div>

      {/* Intent NFTs */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Award className="size-5 text-amber-400" />
          <h2 className="text-base font-medium text-white/90">
            My Intent NFTs
          </h2>
        </div>
        <p className="text-sm text-zinc-400">
          {intents.length} intent{intents.length !== 1 ? "s" : ""} posted
          {profile.wallet_address && (
            <>
              {" "}
              &middot;{" "}
              <a
                href={`https://basescan.org/address/${profile.wallet_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              >
                View on BaseScan
                <ExternalLink className="size-3" />
              </a>
            </>
          )}
        </p>
      </div>

      {/* Active intents */}
      <div>
        <h2 className="text-lg font-medium text-white/90 mb-4">
          {isOwn ? "My Intents" : "Active Intents"}{" "}
          <span className="text-zinc-400 text-sm font-normal">
            ({activeIntents.length})
          </span>
        </h2>
        {activeIntents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeIntents.map((intent) => (
              <IntentCard
                key={intent.id}
                intent={intent}
                currentUserId={currentProfile?.id ?? null}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-400">
            <p>No active intents.</p>
          </div>
        )}
      </div>
    </div>
  );
}
