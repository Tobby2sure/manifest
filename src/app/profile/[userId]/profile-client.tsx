"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntentCard } from "@/components/intent-card";
import { useUser } from "@/lib/hooks/use-user";
import type { Profile, IntentWithAuthor } from "@/lib/types/database";
import { INTENT_TYPE_CONFIG } from "@/lib/types/database";
import {
  CheckCircle,
  ExternalLink,
  Award,
  Edit,
  Bookmark,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { getSavedIntents } from "@/app/actions/saved";

type ProfileTab = "active" | "saved" | "nfts";

interface ProfileClientProps {
  profile: Profile;
  intents: IntentWithAuthor[];
}

export function ProfileClient({ profile, intents }: ProfileClientProps) {
  const { profile: currentProfile } = useUser();
  const isOwn = currentProfile?.id === profile.id;
  const [activeTab, setActiveTab] = useState<ProfileTab>("active");
  const [savedIntents, setSavedIntents] = useState<IntentWithAuthor[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

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

  // Load saved intents when tab switches
  useEffect(() => {
    if (activeTab === "saved" && isOwn && savedIntents.length === 0) {
      setLoadingSaved(true);
      getSavedIntents(profile.id).then((data) => {
        setSavedIntents(data);
        setLoadingSaved(false);
      });
    }
  }, [activeTab, isOwn, profile.id, savedIntents.length]);

  // Activity indicator
  const getActivityLabel = () => {
    if (!profile.last_active_at) return null;
    const hours = (Date.now() - new Date(profile.last_active_at).getTime()) / (1000 * 60 * 60);
    if (hours < 24) return { text: "Active now", color: "text-emerald-400" };
    if (hours < 168) return { text: `Active ${Math.floor(hours / 24)}d ago`, color: "text-amber-400" };
    return null;
  };

  const activity = getActivityLabel();

  const tabs: { key: ProfileTab; label: string; show: boolean }[] = [
    { key: "active", label: `Active Intents (${activeIntents.length})`, show: true },
    { key: "saved", label: "Saved Intents", show: isOwn },
    { key: "nfts", label: "Intent NFTs", show: true },
  ];

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
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {profile.account_type === "organization"
                ? "Organization"
                : "Individual"}
            </Badge>
            {activity && (
              <span className={`text-xs ${activity.color}`}>
                {activity.text}
              </span>
            )}
            {profile.response_rate != null && (
              <span className="text-xs text-zinc-400">
                Responds to {profile.response_rate}% of requests
              </span>
            )}
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

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-white/[0.06]">
        {tabs
          .filter((t) => t.show)
          .map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "text-white border-emerald-400"
                  : "text-zinc-400 border-transparent hover:text-white"
              }`}
            >
              {tab.key === "nfts" && <Award className="size-4 inline mr-1.5 -mt-0.5" />}
              {tab.key === "saved" && <Bookmark className="size-4 inline mr-1.5 -mt-0.5" />}
              {tab.label}
            </button>
          ))}
      </div>

      {/* Tab content */}
      {activeTab === "active" && (
        <div>
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
      )}

      {activeTab === "saved" && isOwn && (
        <div>
          {loadingSaved ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-xl bg-[#0e0e14] border border-white/[0.08]"
                />
              ))}
            </div>
          ) : savedIntents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {savedIntents.map((intent) => (
                <IntentCard
                  key={intent.id}
                  intent={intent}
                  currentUserId={currentProfile?.id ?? null}
                  isSaved
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400">
              <Bookmark className="size-6 mx-auto mb-2 text-zinc-500" />
              <p>No saved intents yet.</p>
              <p className="text-xs mt-1">
                Bookmark intents from the feed to save them here.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "nfts" && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="size-5 text-amber-400" />
            <h2 className="text-base font-medium text-white/90">
              Proof of Intent NFTs
            </h2>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            {intents.length} intent{intents.length !== 1 ? "s" : ""} posted
            {profile.wallet_address && (
              <>
                {" "}&middot;{" "}
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

          {intents.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {intents.map((intent) => {
                const config = INTENT_TYPE_CONFIG[intent.type];
                return (
                  <div
                    key={intent.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <span
                      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${config.color}`}
                    >
                      {config.label}
                    </span>
                    <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">
                      {intent.content}
                    </p>
                    {intent.nft_tx_hash && profile.wallet_address && (
                      <a
                        href={`https://basescan.org/tx/${intent.nft_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 mt-1 inline-flex items-center gap-1"
                      >
                        View TX
                        <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              No NFTs minted yet. Post an intent to earn your first badge.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
