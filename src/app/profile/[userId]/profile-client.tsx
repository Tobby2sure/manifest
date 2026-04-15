"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntentCard } from "@/components/intent-card";
import { OrgBadge } from "@/components/org-badge";
import { useUser } from "@/lib/hooks/use-user";
import type { Profile, IntentWithAuthor, Organization } from "@/lib/types/database";
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
} from "lucide-react";
import Link from "next/link";
import { getSavedIntents } from "@/app/actions/saved";
import { getAcceptedConnections } from "@/app/actions/connections";
import { DealTracker } from "@/components/deal-tracker";
import type { ConnectionWithIntent } from "@/lib/types/database";

type ProfileTab = "active" | "connections" | "saved" | "nfts";

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
      getSavedIntents(profile.id).then((data) => {
        setSavedIntents(data);
        setLoadingSaved(false);
      });
    }
  }, [activeTab, isOwn, profile.id, savedIntents.length]);

  // Load accepted connections when tab switches
  useEffect(() => {
    if (activeTab === "connections" && isOwn && connections.length === 0) {
      setLoadingConnections(true);
      getAcceptedConnections(profile.id).then((data) => {
        setConnections(data);
        setLoadingConnections(false);
      });
    }
  }, [activeTab, isOwn, profile.id, connections.length]);

  // Activity indicator
  const getActivityLabel = () => {
    if (!profile.last_active_at) return null;
    const hours = (Date.now() - new Date(profile.last_active_at).getTime()) / (1000 * 60 * 60);
    if (hours < 24) return { text: "Active now", color: "text-emerald-400" };
    if (hours < 168) return { text: `Active ${Math.floor(hours / 24)}d ago`, color: "text-amber-400" };
    return null;
  };

  const activity = getActivityLabel();

  const tabs: { key: ProfileTab; label: string; icon: typeof Award; show: boolean }[] = [
    { key: "active", label: `Active (${activeIntents.length})`, icon: Zap, show: true },
    { key: "connections", label: "Connections", icon: Handshake, show: isOwn },
    { key: "saved", label: "Saved", icon: Bookmark, show: isOwn },
    { key: "nfts", label: "NFTs", icon: Award, show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

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
          <Avatar size="lg" className="size-20 shrink-0 ring-2 ring-white/[0.07] group-hover:ring-violet-500/40 transition-all duration-300">
            {profile.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.display_name ?? ""}
              />
            ) : null}
            <AvatarFallback className="text-xl bg-[#0f0f1a]">
              {initials}
            </AvatarFallback>
          </Avatar>
          {activity && activity.text === "Active now" && (
            <span className="absolute bottom-0 right-0 size-3.5 rounded-full bg-emerald-400 border-2 border-[#0a0a12] animate-pulse-dot" />
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-bold text-[#F1F5F9]">
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
            <p className="text-sm text-[#94A3B8] mt-0.5">
              @{profile.twitter_handle}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-[#F1F5F9]/70 mt-2 max-w-lg leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-center sm:justify-start gap-5 mt-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Zap className="size-3.5 text-violet-400" />
              <span className="font-medium text-[#F1F5F9]">{intents.length}</span>
              <span className="text-[#475569]">intents</span>
            </div>
            {profile.response_rate != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <TrendingUp className="size-3.5 text-emerald-400" />
                <span className="font-medium text-[#F1F5F9]">{profile.response_rate}%</span>
                <span className="text-[#475569]">response rate</span>
              </div>
            )}
            {activity && (
              <span className={`text-xs ${activity.color}`}>
                {activity.text}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className="text-xs border-white/[0.07]">
              {profile.account_type === "organization"
                ? "Organization"
                : "Individual"}
            </Badge>
          </div>
          {profile.wallet_address && (
            <p className="text-xs text-[#475569] mt-2 font-mono truncate max-w-xs">
              {profile.wallet_address}
            </p>
          )}
        </div>

        {isOwn && (
          <Link href="/settings" className="shrink-0">
            <Button variant="outline" size="sm" className="w-full sm:w-auto border-white/[0.07] hover:border-white/[0.12] cursor-pointer transition-all duration-200">
              <Edit className="size-3.5 mr-1.5" />
              Edit Profile
            </Button>
          </Link>
        )}
      </motion.div>

      {/* Tabs with animated underline */}
      <div className="relative mb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              ref={(el) => { tabRefs.current[tab.key] = el; }}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "text-[#F1F5F9]"
                  : "text-[#475569] hover:text-[#94A3B8]"
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
              <div className="text-center py-12 text-[#94A3B8]">
                <p>No active intents.</p>
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
                    className="h-40 animate-pulse rounded-xl bg-[#0f0f1a] border border-white/[0.07]"
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
                      className="rounded-xl border border-white/[0.07] bg-[#0f0f1a] overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/[0.06]">
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
                          userId={profile.id}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-[#94A3B8]">
                <Handshake className="size-6 mx-auto mb-2 text-[#475569]" />
                <p>No connections yet.</p>
                <p className="text-xs mt-1 text-[#475569]">
                  Accepted connection requests will appear here with deal tracking.
                </p>
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
                    className="h-48 animate-pulse rounded-xl bg-[#0f0f1a] border border-white/[0.07]"
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
              <div className="text-center py-12 text-[#94A3B8]">
                <Bookmark className="size-6 mx-auto mb-2 text-[#475569]" />
                <p>No saved intents yet.</p>
                <p className="text-xs mt-1 text-[#475569]">
                  Bookmark intents from the feed to save them here.
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
            <div className="rounded-xl border border-white/[0.07] bg-[#0f0f1a] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="size-5 text-amber-400" />
                <h2 className="text-base font-medium text-[#F1F5F9]">
                  Proof of Intent NFTs
                </h2>
              </div>
              <p className="text-sm text-[#94A3B8] mb-4">
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
                        className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:border-white/[0.1] transition-all duration-200"
                      >
                        <span
                          className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <p className="text-xs text-[#94A3B8] mt-1.5 line-clamp-2">
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
                <p className="text-sm text-[#475569]">
                  No NFTs minted yet. Post an intent to earn your first badge.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
