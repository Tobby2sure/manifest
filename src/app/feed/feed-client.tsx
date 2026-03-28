"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { profile, isAuthenticated } = useUser();
  const { login } = usePrivy();
  const [isPending, startTransition] = useTransition();

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [connectIntent, setConnectIntent] = useState<IntentWithAuthor | null>(null);
  const [viewContactIntent, setViewContactIntent] = useState<IntentWithAuthor | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Search state
  const [searchValue, setSearchValue] = useState(initialFilters.search ?? "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Infinite scroll
  const [allIntents, setAllIntents] = useState(initialIntents);
  const [page, setPage] = useState(initialFilters.page ?? 0);
  const [hasMore, setHasMore] = useState(initialIntents.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // User saved/interested state
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());

  // Reset intents when initialIntents change (URL navigation)
  useEffect(() => {
    setAllIntents(initialIntents);
    setPage(initialFilters.page ?? 0);
    setHasMore(initialIntents.length < total);
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
      // Reset page when changing filters
      params.delete("page");
      router.push(`/feed?${params.toString()}`);
    },
    [router]
  );

  const clearAllFilters = useCallback(() => {
    setSearchValue("");
    router.push("/feed");
  }, [router]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      updateFilter("search", value || null);
    }, 300);
  };

  // Load more
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

  // Intersection observer for infinite scroll
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

  const canPost = isAuthenticated && profile?.twitter_verified;
  const hasActiveFilters = activeType || activeEcosystem || activeSector || activePriority || searchValue;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white/90">Intent Feed</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Discover what Web3 builders are looking for
          </p>
        </div>
        {canPost && (
          <Button
            onClick={() => setPostDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 w-full sm:w-auto"
          >
            <Plus className="size-4 mr-1.5" />
            Post Intent
          </Button>
        )}
        {isAuthenticated && !profile?.twitter_verified && (
          <Button variant="outline" disabled className="text-zinc-400 w-full sm:w-auto">
            Verify X to Post
          </Button>
        )}
        {!isAuthenticated && (
          <Button
            onClick={login}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 w-full sm:w-auto"
          >
            Sign In to Post
          </Button>
        )}
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search intents..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-9 rounded-lg border border-white/10 bg-white/5 pl-9 pr-8 text-sm text-white/90 outline-none focus:border-emerald-500/50 placeholder:text-zinc-500"
          />
          {searchValue && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <select
          value={activeSort}
          onChange={(e) => updateFilter("sort", e.target.value === "newest" ? null : e.target.value)}
          className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/90 outline-none"
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
          className={`text-zinc-400 lg:hidden ${showSidebar ? "bg-white/5" : ""}`}
        >
          <Filter className="size-4" />
        </Button>
      </div>

      {/* Type filter pills — sticky on scroll */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide sticky top-14 z-30 bg-[#080810] pt-2 -mx-4 px-4">
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
        {INTENT_TYPES.map((type) => {
          const config = INTENT_TYPE_CONFIG[type];
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => updateFilter("type", isActive ? null : type)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? config.color
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Main content: sidebar + grid */}
      <div className="flex gap-6 mb-6">
        {/* Filter sidebar */}
        <div
          className={`shrink-0 w-56 space-y-5 ${
            showSidebar ? "block" : "hidden lg:block"
          }`}
        >
          {/* Ecosystem */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Ecosystem
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {Object.entries(ECOSYSTEM_CONFIG).map(([key, config]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={activeEcosystem === key}
                    onChange={() =>
                      updateFilter("ecosystem", activeEcosystem === key ? null : key)
                    }
                    className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 size-3.5"
                  />
                  <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
                    {config.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Sector */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Sector
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {Object.entries(SECTOR_CONFIG).map(([key, config]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={activeSector === key}
                    onChange={() =>
                      updateFilter("sector", activeSector === key ? null : key)
                    }
                    className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 size-3.5"
                  />
                  <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
                    {config.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Priority
            </h3>
            <div className="space-y-1.5">
              {PRIORITY_OPTIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={activePriority === p}
                    onChange={() =>
                      updateFilter("priority", activePriority === p ? null : p)
                    }
                    className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50 size-3.5"
                  />
                  <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
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
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Intent grid */}
        <div className="flex-1 min-w-0">
          {/* Result count */}
          <p className="text-xs text-zinc-500 mb-3">
            Showing {allIntents.length} of {total} intents
          </p>

          {allIntents.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {allIntents.map((intent) => (
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
                    isSaved={savedIds.has(intent.id)}
                    isInterested={interestedIds.has(intent.id)}
                  />
                ))}
              </div>

              {/* Load more trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-zinc-400"
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                    <ChevronDown className="size-4 ml-1.5" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <SlidersHorizontal className="size-6 text-zinc-500" />
              </div>
              <h3 className="text-lg font-medium text-white/70">
                No intents found
              </h3>
              <p className="text-sm text-zinc-400 mt-1 max-w-sm">
                {hasActiveFilters
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
