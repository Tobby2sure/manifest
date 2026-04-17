"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntentCard } from "@/components/intent-card";
import { OrgBadge } from "@/components/org-badge";
import { useUser } from "@/lib/hooks/use-user";
import type { Profile, IntentWithAuthor, Organization, EndorsementWithAuthor } from "@/lib/types/database";
import { INTENT_TYPE_CONFIG } from "@/lib/types/database";
import {
  CheckCircle,
  ExternalLink,
  Award,
  Edit,
  Bookmark,
  Zap,
  TrendingUp,
  Handshake,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { getSavedIntents } from "@/app/actions/saved";
import { getAcceptedConnections } from "@/app/actions/connections";
import { DealTracker } from "@/components/deal-tracker";
import type { ConnectionWithIntent } from "@/lib/types/database";
import { getEndorsementsForUser } from "@/app/actions/endorsements";
import { getProfileCounts } from "@/app/actions/profiles";

type ProfileTab = "active" | "connections" | "saved" | "nfts" | "endorsements";

const ease = [0.22, 1, 0.36, 1] as const;

interface ProfileClientProps {
  profile: Profile & { org_memberships?: Array<{ role: string; organizations: Organization }> };
  intents: IntentWithAuthor[];
}

export function ProfileClient({ profile, intents }: ProfileClientProps) {
  const { profile: currentProfile } = useUser();
  const isOwn = currentProfile?.id === profile.id;
  const [activeTab, setActiveTab] = useState<ProfileTab>("active");
  const [savedIntents, setSavedIntents] = useState<IntentWithAuthor[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [connections, setConnections] = useState<ConnectionWithIntent[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [endorsements, setEndorsements] = useState<EndorsementWithAuthor[]>([]);
  const [loadingEndorsements, setLoadingEndorsements] = useState(false);
  const [counts, setCounts] = useState<{
    endorsements: number;
    saved: number;
    connections: number;
    nfts: number;
  } | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

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

  // Update tab indicator position
  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      setTabIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  // Load saved intents when tab switches
  useEffect(() => {
    if (activeTab === "saved" && isOwn && savedIntents.length === 0) {
      setLoadingSaved(true);
      getSavedIntents().then((data) => {
        setSavedIntents(data);
        setLoadingSaved(false);
      });
    }
  }, [activeTab, isOwn, profile.id, savedIntents.length]);

  // Load accepted connections when tab switches
  useEffect(() => {
    if (activeTab === "connections" && isOwn && connections.length === 0) {
      setLoadingConnections(true);
      getAcceptedConnections().then((data) => {
        setConnections(data);
        setLoadingConnections(false);
      });
    }
  }, [activeTab, isOwn, profile.id, connections.length]);

  // Load endorsements when tab switches
  useEffect(() => {
    if (activeTab === "endorsements" && endorsements.length === 0) {
      setLoadingEndorsements(true);
      getEndorsementsForUser(profile.id).then((data) => {
        setEndorsements(data);
        setLoadingEndorsements(false);
      });
    }
  }, [activeTab, profile.id, endorsements.length]);

  // Load counts on mount to decide which tabs to show
  useEffect(() => {
    getProfileCounts(profile.id)
      .then(setCounts)
      .catch(() => setCounts({ endorsements: 0, saved: 0, connections: 0, nfts: 0 }));
  }, [profile.id]);

  // Activity indicator
  const getActivityLabel = () => {
    if (!profile.last_active_at) return null;
    const hours = (Date.now() - new Date(profile.last_active_at).getTime()) / (1000 * 60 * 60);
    if (hours < 24) return { text: "Active now", color: "text-emerald-400" };
    if (hours < 168) return { text: `Active ${Math.floor(hours / 24)}d ago`, color: "text-amber-400" };
    return null;
  };

  const activity = getActivityLabel();

  // Hide tabs with no content. Always show Active (owner's primary surface).
  // Counts load async; while null, show only Active + any tab the user navigated to.
  const c = counts;
  const tabs: { key: ProfileTab; label: string; icon: typeof Award; show: boolean }[] = [
    { key: "active", label: `Active (${activeIntents.length})`, icon: Zap, show: true },
    {
      key: "connections",
      label: c ? `Connections (${c.connections})` : "Connections",
      icon: Handshake,
      show: isOwn && (c?.connections ?? 0) > 0,
    },
    {
      key: "endorsements",
      label: c ? `Endorsements (${c.endorsements})` : "Endorsements",
      icon: MessageSquare,
      show: (c?.endorsements ?? 0) > 0,
    },
    {
      key: "saved",
      label: c ? `Saved (${c.saved})` : "Saved",
      icon: Bookmark,
      show: isOwn && (c?.saved ?? 0) > 0,
    },
    {
      key: "nfts",
      label: c ? `NFTs (${c.nfts})` : "NFTs",
      icon: Award,
      show: (c?.nfts ?? 0) > 0,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  // If the selected tab was hidden (counts loaded and this tab now has 0), revert to Active
  useEffect(() => {
    if (!visibleTabs.some((t) => t.key === activeTab)) {
      setActiveTab("active");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs.length]);

  return (
    <div>
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8"
      >
        <div className="relative group">
          <Avatar size="lg" className="size-20 shrink-0 ring-2 ring-white/8 group-hover:ring-violet-500/40 transition-all duration-300">
            {profile.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.display_name ?? ""}
              />
            ) : null}
            <AvatarFallback className="text-xl bg-surface-secondary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {activity && activity.text === "Active now" && (
            <span className="absolute bottom-0 right-0 size-3.5 rounded-full bg-emerald-400 border-2 border-surface-page animate-pulse-dot" />
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-bold text-text-heading">
              {profile.display_name ?? "Anonymous"}
            </h1>
            {profile.twitter_verified && (
              <CheckCircle className="size-5 text-emerald-400" />
            )}
            {profile.org_memberships?.map((m) => (
              <OrgBadge
                key={m.organizations.id}
                orgName={m.organizations.name}
                orgSlug={m.organizations.slug}
                size="md"
              />
            ))}
          </div>
          {profile.twitter_handle && (
            <p className="text-sm text-text-body mt-0.5">
              @{profile.twitter_handle}
            </p>
          )}
          {profile.bio && (
            <p className="text-[15px] text-text-heading/85 mt-3 max-w-lg leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-center sm:justify-start gap-5 mt-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Zap className="size-3.5 text-violet-400" />
              <span className="font-medium text-text-heading">{intents.length}</span>
              <span className="text-text-muted">intents</span>
            </div>
            {profile.response_rate != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <TrendingUp className="size-3.5 text-emerald-400" />
                <span className="font-medium text-text-heading">{profile.response_rate}%</span>
                <span className="text-text-muted">response rate</span>
              </div>
            )}
            {activity && (
              <span className={`text-xs ${activity.color}`}>
                {activity.text}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className="text-xs border-white/8">
              {profile.account_type === "organization"
                ? "Organization"
                : "Individual"}
            </Badge>
          </div>
          {profile.wallet_address && (
            <a
              href={`https://basescan.org/address/${profile.wallet_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-violet-400 mt-2 font-mono truncate max-w-xs transition-colors duration-200 cursor-pointer"
            >
              {profile.wallet_address.slice(0, 6)}…{profile.wallet_address.slice(-4)}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {isOwn && (
          <Link href="/settings" className="shrink-0">
            <Button variant="outline" size="sm" className="w-full sm:w-auto border-white/8 hover:border-white/12 cursor-pointer transition-all duration-200">
              <Edit className="size-3.5 mr-1.5" />
              Edit Profile
            </Button>
          </Link>
        )}
      </motion.div>

      {/* Tabs with animated underline */}
      <div className="relative mb-6 border-b border-white/6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              ref={(el) => { tabRefs.current[tab.key] = el; }}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "text-text-heading"
                  : "text-text-muted hover:text-text-body"
              }`}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        {/* Animated underline */}
        <motion.div
          className="absolute bottom-0 h-0.5 bg-violet-500 rounded-full"
          animate={{ left: tabIndicator.left, width: tabIndicator.width }}
          transition={{ duration: 0.25, ease }}
        />
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "active" && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            {activeIntents.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {activeIntents.map((intent, i) => (
                  <motion.div
                    key={intent.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.2), ease }}
                  >
                    <IntentCard
                      intent={intent}
                      currentUserId={currentProfile?.id ?? null}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-text-body">
                <Zap className="size-8 mx-auto mb-3 text-text-muted" />
                <p className="font-medium">No active intents</p>
                <p className="text-xs mt-1 text-text-muted">
                  {isOwn ? "Post your first intent to get started." : "This user has no active intents right now."}
                </p>
                {isOwn && (
                  <Link href="/feed" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
                    <Zap className="size-3.5" />
                    Post Intent
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "connections" && isOwn && (
          <motion.div
            key="connections"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            {loadingConnections ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 animate-pulse rounded-xl bg-surface-secondary border border-white/8"
                  />
                ))}
              </div>
            ) : connections.length > 0 ? (
              <div className="grid gap-4">
                {connections.map((conn, i) => {
                  const otherParty =
                    conn.sender_id === profile.id
                      ? conn.receiver_profile
                      : conn.sender_profile;
                  const intentConfig = INTENT_TYPE_CONFIG[conn.intents.type as keyof typeof INTENT_TYPE_CONFIG];
                  return (
                    <motion.div
                      key={conn.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.2), ease }}
                      className="rounded-xl border border-white/8 bg-surface-secondary overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {intentConfig && (
                              <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${intentConfig.color}`}>
                                {intentConfig.label}
                              </span>
                            )}
                            <span className="text-xs text-zinc-400">
                              with {otherParty?.display_name ?? "Unknown"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-white/70 line-clamp-2">
                          {conn.intents.content}
                        </p>
                      </div>
                      <div className="p-4">
                        <DealTracker
                          intentId={conn.intent_id}
                          connectionId={conn.id}
                          currentStatus={conn.lifecycle_status}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-text-body">
                <Handshake className="size-8 mx-auto mb-3 text-text-muted" />
                <p className="font-medium">No connections yet</p>
                <p className="text-xs mt-1 text-text-muted">
                  Accepted connection requests will appear here with deal tracking.
                </p>
                <Link href="/feed" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-sm font-medium border border-violet-500/20 transition-colors">
                  Browse intents
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "saved" && isOwn && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            {loadingSaved ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl bg-surface-secondary border border-white/8"
                  />
                ))}
              </div>
            ) : savedIntents.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {savedIntents.map((intent, i) => (
                  <motion.div
                    key={intent.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.2), ease }}
                  >
                    <IntentCard
                      intent={intent}
                      currentUserId={currentProfile?.id ?? null}
                      isSaved
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-text-body">
                <Bookmark className="size-8 mx-auto mb-3 text-text-muted" />
                <p className="font-medium">No saved intents yet</p>
                <p className="text-xs mt-1 text-text-muted">
                  Bookmark intents from the feed to save them here.
                </p>
                <Link href="/feed" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-sm font-medium border border-violet-500/20 transition-colors">
                  Explore the feed
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "endorsements" && (
          <motion.div
            key="endorsements"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            {loadingEndorsements ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-secondary border border-white/8" />
                ))}
              </div>
            ) : endorsements.length > 0 ? (
              <div className="space-y-3">
                {endorsements.map((endorsement, i) => (
                  <motion.div
                    key={endorsement.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.2), ease }}
                    className="rounded-xl border border-white/6 bg-surface-secondary p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/profile/${endorsement.endorser_id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Avatar size="default" className="size-7">
                          {endorsement.endorser.avatar_url ? (
                            <AvatarImage src={endorsement.endorser.avatar_url} alt={endorsement.endorser.display_name ?? ""} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {endorsement.endorser.display_name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-text-heading">
                          {endorsement.endorser.display_name ?? "Anonymous"}
                        </span>
                      </Link>
                      {endorsement.endorser.twitter_verified && (
                        <CheckCircle className="size-3.5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-sm text-text-heading/70 leading-relaxed">
                      &ldquo;{endorsement.content}&rdquo;
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-text-body">
                <MessageSquare className="size-8 mx-auto mb-3 text-text-muted" />
                <p className="font-medium">No endorsements yet</p>
                <p className="text-xs mt-1 text-text-muted">
                  Endorsements appear when partners leave feedback after a deal.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "nfts" && (
          <motion.div
            key="nfts"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="rounded-xl border border-white/8 bg-surface-secondary p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="size-5 text-amber-400" />
                <h2 className="text-base font-medium text-text-heading">
                  Proof of Intent NFTs
                </h2>
              </div>
              <p className="text-sm text-text-body mb-4">
                {intents.length} intent{intents.length !== 1 ? "s" : ""} posted
                {profile.wallet_address && (
                  <>
                    {" "}&middot;{" "}
                    <a
                      href={`https://basescan.org/address/${profile.wallet_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      View on BaseScan
                      <ExternalLink className="size-3" />
                    </a>
                  </>
                )}
              </p>

              {intents.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {intents.map((intent, i) => {
                    const config = INTENT_TYPE_CONFIG[intent.type];
                    return (
                      <motion.div
                        key={intent.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.2), ease }}
                        className="rounded-lg border border-white/6 bg-white/3 p-3 hover:border-white/12 transition-all duration-200"
                      >
                        <span
                          className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <p className="text-xs text-text-body mt-1.5 line-clamp-2">
                          {intent.content}
                        </p>
                        {intent.nft_tx_hash && profile.wallet_address && (
                          <a
                            href={`https://basescan.org/tx/${intent.nft_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:text-emerald-300 mt-1 inline-flex items-center gap-1 cursor-pointer"
                          >
                            View TX
                            <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="size-8 mx-auto mb-3 text-text-muted" />
                  <p className="font-medium text-text-body">No NFTs minted yet</p>
                  <p className="text-xs mt-1 text-text-muted">
                    Post an intent to earn your first Proof of Intent badge.
                  </p>
                  {isOwn && (
                    <Link href="/feed" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-sm font-medium border border-violet-500/20 transition-colors">
                      Post an intent
                    </Link>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
