"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { IntentCard } from "@/components/intent-card";
import { PostIntentDialog } from "@/components/post-intent-dialog";
import { RequestConnectionDialog } from "@/components/request-connection-dialog";
import { ViewContactDialog } from "@/components/view-contact-dialog";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import {
  INTENT_TYPE_CONFIG,
  ECOSYSTEM_CONFIG,
  SECTOR_CONFIG,
} from "@/lib/types/database";
import type {
  IntentWithAuthor,
  IntentType,
  Ecosystem,
  Sector,
  IntentPriority,
} from "@/lib/types/database";
import { Plus, SlidersHorizontal } from "lucide-react";

const INTENT_TYPES: IntentType[] = [
  "partnership",
  "investment",
  "integration",
  "hiring",
  "co-marketing",
  "grant",
  "ecosystem-support",
  "beta-testers",
];

interface FeedClientProps {
  intents: IntentWithAuthor[];
  initialFilters: {
    type?: IntentType;
    ecosystem?: Ecosystem;
    sector?: Sector;
    priority?: IntentPriority;
  };
}

export function FeedClient({ intents, initialFilters }: FeedClientProps) {
  const router = useRouter();
  const { profile, isAuthenticated } = useUser();
  const { login } = usePrivy();

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [connectIntent, setConnectIntent] = useState<IntentWithAuthor | null>(
    null
  );
  const [viewContactIntent, setViewContactIntent] =
    useState<IntentWithAuthor | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const activeType = initialFilters.type ?? null;
  const activeEcosystem = initialFilters.ecosystem ?? null;
  const activeSector = initialFilters.sector ?? null;

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/feed?${params.toString()}`);
    },
    [router]
  );

  const canPost = isAuthenticated && profile?.twitter_verified;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white/90">Intent Feed</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Discover what Web3 builders are looking for
          </p>
        </div>
        {canPost && (
          <Button
            onClick={() => setPostDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          >
            <Plus className="size-4 mr-1.5" />
            Post Intent
          </Button>
        )}
        {isAuthenticated && !profile?.twitter_verified && (
          <Button variant="outline" disabled className="text-zinc-400">
            Verify X to Post
          </Button>
        )}
        {!isAuthenticated && (
          <Button
            onClick={login}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          >
            Sign In to Post
          </Button>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => updateFilter("type", null)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !activeType
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          All
        </button>
        {INTENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() =>
              updateFilter("type", activeType === type ? null : type)
            }
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeType === type
                ? INTENT_TYPE_CONFIG[type].color
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {INTENT_TYPE_CONFIG[type].label}
          </button>
        ))}
      </div>

      {/* Filter dropdowns */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-zinc-400"
        >
          <SlidersHorizontal className="size-3.5 mr-1.5" />
          Filters
        </Button>

        {showFilters && (
          <div className="flex items-center gap-2">
            <select
              value={activeEcosystem ?? ""}
              onChange={(e) => updateFilter("ecosystem", e.target.value || null)}
              className="h-7 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white/90 outline-none"
            >
              <option value="">Ecosystem</option>
              {Object.entries(ECOSYSTEM_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <select
              value={activeSector ?? ""}
              onChange={(e) => updateFilter("sector", e.target.value || null)}
              className="h-7 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white/90 outline-none"
            >
              <option value="">Sector</option>
              {Object.entries(SECTOR_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Intent grid */}
      {intents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {intents.map((intent) => (
            <IntentCard
              key={intent.id}
              intent={intent}
              currentUserId={profile?.id ?? null}
              onRequestConnection={
                isAuthenticated
                  ? (i) => setConnectIntent(i)
                  : () => login()
              }
              onViewContact={(i) => setViewContactIntent(i)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <SlidersHorizontal className="size-6 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white/70">No intents found</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-sm">
            {activeType || activeEcosystem || activeSector
              ? "Try adjusting your filters to see more intents."
              : "Be the first to post an intent and get discovered."}
          </p>
          {canPost && (
            <Button
              onClick={() => setPostDialogOpen(true)}
              className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
            >
              <Plus className="size-4 mr-1.5" />
              Post Intent
            </Button>
          )}
        </div>
      )}

      {/* Dialogs */}
      {profile && (
        <>
          <PostIntentDialog
            open={postDialogOpen}
            onOpenChange={setPostDialogOpen}
            userId={profile.id}
            twitterVerified={profile.twitter_verified}
          />
          <RequestConnectionDialog
            open={!!connectIntent}
            onOpenChange={(open) => {
              if (!open) setConnectIntent(null);
            }}
            intent={connectIntent}
            senderId={profile.id}
          />
          <ViewContactDialog
            open={!!viewContactIntent}
            onOpenChange={(open) => {
              if (!open) setViewContactIntent(null);
            }}
            connectionId={null}
            userId={profile.id}
          />
        </>
      )}
    </>
  );
}
