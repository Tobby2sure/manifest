"use client";

import { useDynamicContext, DynamicConnectButton } from '@dynamic-labs/sdk-react-core';

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import type { IntentSort } from "@/app/actions/intents";
import { getIntents } from "@/app/actions/intents";
import { getUserSavedIds } from "@/app/actions/saved";
import { getUserInterestedIds } from "@/app/actions/interests";
import {
  Plus,
  SlidersHorizontal,
  Search,
  X,
  ChevronDown,
  Filter,
  Loader2,
} from "lucide-react";

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

const SORT_OPTIONS: { value: IntentSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "ending_soon", label: "Ending Soon" },
];

const PRIORITY_OPTIONS: IntentPriority[] = ["Urgent", "Active", "Open"];

const ease = [0.22, 1, 0.36, 1] as const;

interface FeedClientProps {
  intents: IntentWithAuthor[];
  total: number;
  initialFilters: {
    type?: IntentType;
    ecosystem?: Ecosystem;
    sector?: Sector;
    priority?: IntentPriority;
    search?: string;
    sort?: IntentSort;
    page?: number;
    pageSize?: number;
  };
}

export function FeedClient({ intents: initialIntents, total, initialFilters }: FeedClientProps) {
  const { setShowAuthFlow } = useDynamicContext();
  const router = useRouter();
  const { profile, isAuthenticated, twitterVerified } = useUser();
  const login = () => setShowAuthFlow(true);
  const [isPending, startTransition] = useTransition();

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [connectIntent, setConnectIntent] = useState<IntentWithAuthor | null>(null);
  const [viewContactIntent, setViewContactIntent] = useState<IntentWithAuthor | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Search state
  const [searchValue, setSearchValue] = useState(initialFilters.search ?? "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom filter inputs for "Other" ecosystem/sector
  const predefinedEcosystems = Object.keys(ECOSYSTEM_CONFIG);
  const predefinedSectors = Object.keys(SECTOR_CONFIG);
  const isCustomEcosystem = !!(initialFilters.ecosystem && !predefinedEcosystems.includes(initialFilters.ecosystem));
  const isCustomSector = !!(initialFilters.sector && !predefinedSectors.includes(initialFilters.sector));
  const [customEcosystem, setCustomEcosystem] = useState(isCustomEcosystem ? (initialFilters.ecosystem ?? "") : "");
  const [customSector, setCustomSector] = useState(isCustomSector ? (initialFilters.sector ?? "") : "");

  // Infinite scroll
  const [allIntents, setAllIntents] = useState(initialIntents);
  const [page, setPage] = useState(initialFilters.page ?? 0);
  const [hasMore, setHasMore] = useState(initialIntents.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Filter transition
  const [filterKey, setFilterKey] = useState(0);

  // User saved/interested state
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());

  // Reset intents when initialIntents change (URL navigation)
  useEffect(() => {
    setAllIntents(initialIntents);
    setPage(initialFilters.page ?? 0);
    setHasMore(initialIntents.length < total);
    setFilterKey((k) => k + 1);
  }, [initialIntents, total, initialFilters.page]);

  // Load user saved/interested states
  useEffect(() => {
    if (!profile?.id) return;
    Promise.all([
      getUserSavedIds(profile.id),
      getUserInterestedIds(profile.id),
    ]).then(([saved, interested]) => {
      setSavedIds(new Set(saved));
      setInterestedIds(new Set(interested));
    });
  }, [profile?.id]);

  const activeType = initialFilters.type ?? null;
  const activeEcosystem = initialFilters.ecosystem ?? null;
  const activeSector = initialFilters.sector ?? null;
  const activePriority = initialFilters.priority ?? null;
  const activeSort = initialFilters.sort ?? "newest";

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/feed?${params.toString()}`);
    },
    [router]
  );

  const clearAllFilters = useCallback(() => {
    setSearchValue("");
    setCustomEcosystem("");
    setCustomSector("");
    router.push("/feed");
  }, [router]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      updateFilter("search", value || null);
    }, 300);
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    startTransition(async () => {
      const { intents: moreIntents, total: newTotal } = await getIntents({
        ...initialFilters,
        page: nextPage,
        pageSize: initialFilters.pageSize ?? 20,
      });
      setAllIntents((prev) => [...prev, ...moreIntents]);
      setPage(nextPage);
      setHasMore(
        (nextPage + 1) * (initialFilters.pageSize ?? 20) < newTotal
      );
      setLoadingMore(false);
    });
  }, [loadingMore, hasMore, page, initialFilters, startTransition]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const canPost = isAuthenticated && (profile?.twitter_verified || twitterVerified);
  const hasActiveFilters = activeType || activeEcosystem || activeSector || activePriority || searchValue;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
              Intent Feed
            </h1>
            <p className="text-sm text-[#94A3B8]/80 mt-2 max-w-md">
              Discover what Web3 builders are looking for — and make your move.
            </p>
          </div>

          {isAuthenticated && !profile?.twitter_verified && !twitterVerified && (
            <Button
              variant="outline"
              onClick={() => router.push('/onboarding/verify-x')}
              className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:border-violet-500/50 w-full sm:w-auto cursor-pointer transition-all"
            >
              𝕏 Verify to Post
            </Button>
          )}
          {!isAuthenticated && (
            <Button
              onClick={() => setShowAuthFlow(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 w-full sm:w-auto cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Sign In to Post
            </Button>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Intents", value: total },
            { label: "Active Now", value: allIntents.filter(i => i.lifecycle_status === 'active').length },
            { label: "This Week", value: allIntents.filter(i => Date.now() - new Date(i.created_at).getTime() < 7 * 86400000).length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 shimmer-stat">
              <p className="text-[11px] text-[#475569] font-medium uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-semibold text-[#F1F5F9] mt-0.5 tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-5">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#475569] transition-colors duration-200 group-focus-within:text-violet-400" />
          <input
            type="text"
            placeholder="Search intents by keyword, project, or ecosystem..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-11 rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm pl-10 pr-9 text-sm text-[#F1F5F9] outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 focus:bg-white/[0.05] placeholder:text-[#475569]/70 transition-all duration-300"
          />
          {searchValue && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-white cursor-pointer transition-colors duration-200"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <select
          value={activeSort}
          onChange={(e) => updateFilter("sort", e.target.value === "newest" ? null : e.target.value)}
          className="h-11 rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm px-3.5 text-sm text-[#F1F5F9] outline-none cursor-pointer hover:border-white/[0.12] transition-all duration-200"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSidebar(!showSidebar)}
          className={`text-[#94A3B8] lg:hidden cursor-pointer h-11 rounded-xl ${showSidebar ? "bg-white/[0.06] text-violet-400" : "hover:bg-white/[0.04]"}`}
        >
          <Filter className="size-4" />
        </Button>
      </div>

      {/* Main content: sidebar + grid */}
      <div className="flex gap-6 mb-6">
        {/* Filter sidebar */}
        <div className={`shrink-0 w-60 ${showSidebar ? "block" : "hidden lg:block"}`}>
          <div className="sticky top-20 space-y-6">
            {/* Intent Type */}
            <div>
              <h3 className="text-[11px] font-semibold text-[#F1F5F9]/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
                Intent Type
                <span className="h-px flex-1 bg-gradient-to-l from-white/[0.06] to-transparent" />
              </h3>
              <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-hide">
                {INTENT_TYPES.map((type) => {
                  const config = INTENT_TYPE_CONFIG[type];
                  return (
                    <label
                      key={type}
                      className={`flex items-center gap-2.5 cursor-pointer group rounded-lg px-2.5 py-1.5 transition-all duration-200 ${
                        activeType === type ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={activeType === type}
                        onChange={() =>
                          updateFilter("type", activeType === type ? null : type)
                        }
                        className="premium-checkbox"
                      />
                      <span className={`text-sm transition-colors duration-200 ${
                        activeType === type ? 'text-[#F1F5F9]' : 'text-[#94A3B8] group-hover:text-[#CBD5E1]'
                      }`}>
                        {config.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Ecosystem */}
            <div>
              <h3 className="text-[11px] font-semibold text-[#F1F5F9]/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
                Ecosystem
                <span className="h-px flex-1 bg-gradient-to-l from-white/[0.06] to-transparent" />
              </h3>
              <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-hide">
                {Object.entries(ECOSYSTEM_CONFIG).map(([key, config]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 cursor-pointer group rounded-lg px-2.5 py-1.5 transition-all duration-200 ${
                      activeEcosystem === key ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={activeEcosystem === key}
                      onChange={() => {
                        setCustomEcosystem("");
                        updateFilter("ecosystem", activeEcosystem === key ? null : key);
                      }}
                      className="premium-checkbox"
                    />
                    <span className={`text-sm transition-colors duration-200 ${
                      activeEcosystem === key ? 'text-[#F1F5F9]' : 'text-[#94A3B8] group-hover:text-[#CBD5E1]'
                    }`}>
                      {config.label}
                    </span>
                  </label>
                ))}
              </div>
              <input
                type="text"
                placeholder="Other ecosystem..."
                value={customEcosystem}
                onChange={(e) => setCustomEcosystem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customEcosystem.trim()) {
                    updateFilter("ecosystem", customEcosystem.trim().toLowerCase());
                  }
                }}
                onBlur={() => {
                  if (customEcosystem.trim()) {
                    updateFilter("ecosystem", customEcosystem.trim().toLowerCase());
                  }
                }}
                className={`mt-2 w-full h-8 rounded-lg border bg-white/[0.03] px-2.5 text-xs text-[#F1F5F9] outline-none placeholder:text-[#475569]/60 transition-all duration-200 focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10 ${
                  isCustomEcosystem ? 'border-violet-500/30 bg-white/[0.05]' : 'border-white/[0.07]'
                }`}
              />
            </div>

            {/* Sector */}
            <div>
              <h3 className="text-[11px] font-semibold text-[#F1F5F9]/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
                Sector
                <span className="h-px flex-1 bg-gradient-to-l from-white/[0.06] to-transparent" />
              </h3>
              <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-hide">
                {Object.entries(SECTOR_CONFIG).map(([key, config]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 cursor-pointer group rounded-lg px-2.5 py-1.5 transition-all duration-200 ${
                      activeSector === key ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={activeSector === key}
                      onChange={() => {
                        setCustomSector("");
                        updateFilter("sector", activeSector === key ? null : key);
                      }}
                      className="premium-checkbox"
                    />
                    <span className={`text-sm transition-colors duration-200 ${
                      activeSector === key ? 'text-[#F1F5F9]' : 'text-[#94A3B8] group-hover:text-[#CBD5E1]'
                    }`}>
                      {config.label}
                    </span>
                  </label>
                ))}
              </div>
              <input
                type="text"
                placeholder="Other sector..."
                value={customSector}
                onChange={(e) => setCustomSector(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customSector.trim()) {
                    updateFilter("sector", customSector.trim().toLowerCase());
                  }
                }}
                onBlur={() => {
                  if (customSector.trim()) {
                    updateFilter("sector", customSector.trim().toLowerCase());
                  }
                }}
                className={`mt-2 w-full h-8 rounded-lg border bg-white/[0.03] px-2.5 text-xs text-[#F1F5F9] outline-none placeholder:text-[#475569]/60 transition-all duration-200 focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10 ${
                  isCustomSector ? 'border-violet-500/30 bg-white/[0.05]' : 'border-white/[0.07]'
                }`}
              />
            </div>

            {/* Priority */}
            <div>
              <h3 className="text-[11px] font-semibold text-[#F1F5F9]/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
                Priority
                <span className="h-px flex-1 bg-gradient-to-l from-white/[0.06] to-transparent" />
              </h3>
              <div className="space-y-0.5">
                {PRIORITY_OPTIONS.map((p) => (
                  <label
                    key={p}
                    className={`flex items-center gap-2.5 cursor-pointer group rounded-lg px-2.5 py-1.5 transition-all duration-200 ${
                      activePriority === p ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={activePriority === p}
                      onChange={() =>
                        updateFilter("priority", activePriority === p ? null : p)
                      }
                      className="premium-checkbox"
                    />
                    <span className={`text-sm transition-colors duration-200 ${
                      activePriority === p ? 'text-[#F1F5F9]' : 'text-[#94A3B8] group-hover:text-[#CBD5E1]'
                    }`}>
                      {p}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="w-full text-xs text-violet-400 hover:text-violet-300 font-medium cursor-pointer transition-all duration-200 rounded-lg border border-violet-500/20 hover:border-violet-500/30 py-2 hover:bg-violet-500/5"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Intent grid */}
        <div className="flex-1 min-w-0">
          {/* Result count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[#475569]">
              <span className="text-[#F1F5F9]/60 font-medium tabular-nums">{allIntents.length}</span>
              {' '}of <span className="tabular-nums">{total}</span> intents
            </p>
            {isPending && <Loader2 className="size-3.5 text-violet-400 animate-spin" />}
          </div>

          <AnimatePresence mode="wait">
            {allIntents.length > 0 ? (
              <motion.div
                key={filterKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  {allIntents.map((intent, i) => (
                    <motion.div
                      key={intent.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: Math.min(i * 0.04, 0.2),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <IntentCard
                        intent={intent}
                        currentUserId={profile?.id ?? null}
                        onRequestConnection={
                          isAuthenticated
                            ? (i) => setConnectIntent(i)
                            : () => setShowAuthFlow(true)
                        }
                        onViewContact={(i) => setViewContactIntent(i)}
                        isSaved={savedIds.has(intent.id)}
                        isInterested={interestedIds.has(intent.id)}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Load more trigger */}
                {hasMore && (
                  <div ref={loadMoreRef} className="flex justify-center py-10">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="text-[#94A3B8] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03] transition-all duration-300 cursor-pointer rounded-xl px-6"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="size-4 mr-1.5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load more
                          <ChevronDown className="size-4 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center py-24 text-center relative"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-violet-500/[0.04] blur-3xl" />
                  <div className="absolute top-1/3 left-1/3 w-48 h-48 rounded-full bg-emerald-500/[0.03] blur-3xl" />
                </div>
                <div className="relative">
                  <div className="size-20 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center mb-5 mx-auto">
                    <SlidersHorizontal className="size-8 text-[#475569]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#F1F5F9]/80">
                    No intents found
                  </h3>
                  <p className="text-sm text-[#94A3B8]/70 mt-2 max-w-sm leading-relaxed">
                    {hasActiveFilters
                      ? "Try adjusting your filters or search query to discover more intents."
                      : "Be the first to post an intent and get discovered by the Web3 community."}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="mt-4 text-sm text-violet-400 hover:text-violet-300 font-medium cursor-pointer transition-colors duration-200"
                    >
                      Clear all filters
                    </button>
                  )}
                  {canPost && !hasActiveFilters && (
                    <Button
                      onClick={() => setPostDialogOpen(true)}
                      className="mt-5 bg-emerald-600 hover:bg-emerald-500 text-white border-0 cursor-pointer glow-emerald-sm"
                    >
                      <Plus className="size-4 mr-1.5" />
                      Post Intent
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
