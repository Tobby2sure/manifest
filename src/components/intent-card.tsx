"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatShort } from "@/lib/format-time";
import { truncateGraphemes } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  MessageSquare,
  Circle,
  Eye,
  Share2,
  Bookmark,
  BookmarkCheck,
  Heart,
  Shield,
  MoreHorizontal,
  Ban,
  Flag,
  Loader2,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type {
  IntentWithAuthor,
  ConnectionRequestStatus,
  MintStatus,
} from "@/lib/types/database";
import { INTENT_TYPE_CONFIG, ECOSYSTEM_CONFIG, SECTOR_CONFIG } from "@/lib/types/database";
import { toggleSave } from "@/app/actions/saved";
import { retryIntentMint } from "@/app/actions/intents";
import { blockUser } from "@/app/actions/moderation";
import { OrgBadge } from "@/components/org-badge";
import { ReportDialog } from "@/components/report-dialog";
import { toggleInterest } from "@/app/actions/interests";
import { toast } from "sonner";

const LIFECYCLE_STYLES: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  in_discussion: { label: "In Discussion", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  partnership_formed: { label: "Partnered", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  closed: { label: "Closed", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
  pending_org_approval: { label: "Pending Org Approval", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

function getActivityIndicator(lastActiveAt: string | null) {
  if (!lastActiveAt) return null;
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 24) return { label: "Active", color: "text-emerald-400", dot: "bg-emerald-400", pulse: true };
  if (hours < 168) {
    const days = Math.floor(hours / 24);
    return { label: `${days}d ago`, color: "text-amber-400", dot: "bg-amber-400", pulse: false };
  }
  return null;
}

const BORDER_COLORS: Record<string, string> = {
  partnership: "border-blue-500/50",
  investment: "border-green-500/50",
  integration: "border-purple-500/50",
  hiring: "border-yellow-500/50",
  "co-marketing": "border-pink-500/50",
  grant: "border-emerald-500/50",
  "ecosystem-support": "border-cyan-500/50",
  "beta-testers": "border-orange-500/50",
};

interface IntentCardProps {
  intent: IntentWithAuthor;
  currentUserId?: string | null;
  requestStatus?: ConnectionRequestStatus | null;
  onRequestConnection?: (intent: IntentWithAuthor) => void;
  onViewContact?: (intent: IntentWithAuthor) => void;
  isSaved?: boolean;
  isInterested?: boolean;
  saveCount?: number;
  interestCount?: number;
  viewCount?: number;
  partnerId?: string | null;
}

export function IntentCard({
  intent,
  currentUserId,
  requestStatus,
  onRequestConnection,
  onViewContact,
  isSaved: initialSaved = false,
  isInterested: initialInterested = false,
  saveCount: initialSaveCount = 0,
  interestCount: initialInterestCount = 0,
  viewCount = 0,
  partnerId = null,
}: IntentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [interested, setInterested] = useState(initialInterested);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [interestCount, setInterestCount] = useState(initialInterestCount);
  const [isPending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const typeConfig = INTENT_TYPE_CONFIG[intent.type];
  const isOwn = currentUserId === intent.author_id;
  const contentTruncated = intent.content.length > 200 && !expanded;
  const displayContent = contentTruncated
    ? truncateGraphemes(intent.content, 200)
    : intent.content;

  const expiresAt = new Date(intent.expires_at);
  const now = new Date();
  const isExpired = expiresAt <= now;
  const timeRemaining = isExpired ? "Expired" : formatShort(expiresAt);

  const postedAgo = formatShort(new Date(intent.created_at), { withSuffix: true });

  const author = intent.author;
  const initials = author.display_name
    ? author.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const activity = getActivityIndicator(author.last_active_at ?? null);
  const lifecycle = LIFECYCLE_STYLES[intent.lifecycle_status];
  const leftBorderColor = BORDER_COLORS[intent.type] ?? "border-violet-500/50";

  const handleShare = () => {
    const truncated =
      intent.content.length > 100
        ? intent.content.slice(0, 100) + "..."
        : intent.content;
    const authorName = author.display_name ?? "Someone";
    const url = `${window.location.origin}/feed?intent=${intent.id}`;
    const text = `"${truncated}" — ${authorName} on Manifest\n\n${url}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSave = () => {
    if (!currentUserId) return;
    const wasSaved = saved;
    setSaved(!wasSaved);
    setSaveCount((c) => (wasSaved ? c - 1 : c + 1));
    startTransition(async () => {
      try {
        await toggleSave(intent.id);
      } catch {
        setSaved(wasSaved);
        setSaveCount((c) => (wasSaved ? c + 1 : c - 1));
      }
    });
  };

  const handleInterest = () => {
    if (!currentUserId) return;
    const wasInterested = interested;
    setInterested(!wasInterested);
    setInterestCount((c) => (wasInterested ? c - 1 : c + 1));
    startTransition(async () => {
      try {
        await toggleInterest(intent.id);
      } catch {
        setInterested(wasInterested);
        setInterestCount((c) => (wasInterested ? c + 1 : c - 1));
      }
    });
  };

  return (
    <div
      className={`group relative rounded-xl border-l-[3px] ${leftBorderColor} border border-white/6 bg-gradient-to-br from-surface-secondary to-[#0c0c16] p-5 transition-all duration-300 ease-out hover:border-white/12 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/30 card-glow-border ${isExpired ? "opacity-50 grayscale-[30%]" : ""}`}
    >
      {/* Type badge top-right */}
      <div className="absolute top-4 right-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${typeConfig.color} backdrop-blur-sm border border-current/10`}>
          <span className="size-1.5 rounded-full bg-current" />
          {typeConfig.label}
        </span>
      </div>

      {/* Author row */}
      <div className="flex items-center gap-3 mb-3 pr-24">
        <Link href={`/profile/${author.id}`} className="shrink-0">
          <Avatar size="default" className="transition-all duration-300 hover:scale-110 ring-2 ring-transparent hover:ring-violet-500/20">
            {author.avatar_url ? (
              <AvatarImage src={author.avatar_url} alt={author.display_name ?? ""} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/profile/${author.id}`} className="text-sm font-medium text-text-heading truncate hover:text-violet-400 transition-colors duration-200 cursor-pointer">
              {author.display_name ?? "Anonymous"}
            </Link>
            {author.twitter_verified && (
              <CheckCircle className="size-3.5 text-emerald-400 shrink-0" />
            )}
            {intent.author.org_memberships?.[0] && (
              <OrgBadge
                orgName={intent.author.org_memberships[0].organizations.name}
                orgSlug={intent.author.org_memberships[0].organizations.slug}
                size="sm"
                isAffiliate={intent.author.org_memberships[0].role === "affiliate"}
              />
            )}
            {activity && (
              <span className={`flex items-center gap-1 text-xs ${activity.color}`}>
                <span className={`size-1.5 rounded-full ${activity.dot} ${activity.pulse ? 'animate-pulse-dot' : ''}`} />
                {activity.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {author.twitter_handle && (
              <span className="text-xs text-text-muted">
                @{author.twitter_handle}
              </span>
            )}
            {intent.org_id && (
              <span className="text-xs text-text-muted">
                · <Link href={`/org/${intent.org_id}`} className="hover:text-text-body transition-colors duration-200 cursor-pointer">Org</Link>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lifecycle + Founding badges */}
      {(intent.lifecycle_status !== "active" || intent.is_founding || isExpired) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {intent.lifecycle_status !== "active" && lifecycle && (
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${lifecycle.color}`}>
              {lifecycle.label}
            </span>
          )}
          {intent.is_founding && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              <Shield className="size-3" />
              Founding Intent
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-zinc-500/20 text-text-muted">
              Expired
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <p className="text-sm text-text-heading/75 leading-[1.7] mb-3.5">
        {displayContent}
        {intent.content.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-violet-400 hover:text-violet-300 text-xs font-medium cursor-pointer transition-colors duration-200"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </p>

      {/* Ecosystem/Sector tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {intent.ecosystem && (
          <span className="inline-flex items-center rounded-md bg-white/3 border border-white/6 px-2.5 py-0.5 text-[11px] text-text-body font-medium tracking-wide">
            {ECOSYSTEM_CONFIG[intent.ecosystem]?.label ?? intent.ecosystem}
          </span>
        )}
        {intent.sector && (
          <span className="inline-flex items-center rounded-md bg-white/3 border border-white/6 px-2.5 py-0.5 text-[11px] text-text-body font-medium tracking-wide">
            {SECTOR_CONFIG[intent.sector]?.label ?? intent.sector}
          </span>
        )}
      </div>

      {/* Pending org approval banner */}
      {intent.lifecycle_status === "pending_org_approval" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 mb-3">
          <span className="text-sm">⏳</span>
          <span className="text-xs font-medium text-amber-400">Pending Org Approval</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3.5 border-t border-white/6">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {timeRemaining} left
          </span>
          <span>{postedAgo}</span>
          {isOwn && viewCount > 0 && (
            <span className="flex items-center gap-1 text-violet-400/70">
              <Eye className="size-3" />
              {viewCount} {viewCount === 1 ? "view" : "views"}
            </span>
          )}
          {isOwn && intent.mint_status === "pending" && (() => {
            // Bound the "Minting..." state — after 60s the intent is
            // almost certainly waiting for the retry cron, not for
            // the initial mint to confirm. Show the queued state so
            // the author isn't staring at a forever-spinner.
            const minted = new Date(intent.created_at).getTime();
            const stale = Date.now() - minted > 60_000;
            return stale ? (
              <span className="flex items-center gap-1 text-amber-400/70">
                <Clock className="size-3" />
                Mint queued
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400/70">
                <Loader2 className="size-3 animate-spin" />
                Minting...
              </span>
            );
          })()}
          {intent.mint_status === "success" && intent.nft_tx_hash && (
            <a
              href={`${process.env.NEXT_PUBLIC_USE_TESTNET === "true" ? "https://sepolia.basescan.org" : "https://basescan.org"}/tx/${intent.nft_tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-400/70 hover:text-emerald-400 transition-colors"
              title="Proof of Intent NFT"
            >
              <CheckCircle className="size-3" />
              Minted
              <ExternalLinkIcon className="size-2.5" />
            </a>
          )}
          {isOwn && intent.mint_status === "failed" && currentUserId && (
            <button
              onClick={() => {
                startTransition(async () => {
                  try {
                    await retryIntentMint(intent.id);
                    toast.success("Mint retry queued");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Retry failed");
                  }
                });
              }}
              className="flex items-center gap-1 text-red-400/70 hover:text-red-400 transition-colors cursor-pointer text-xs"
            >
              Mint failed — Retry
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* Interest */}
          <button
            onClick={handleInterest}
            disabled={!currentUserId || isPending}
            aria-pressed={interested}
            aria-label={`Interest${interestCount > 0 ? ` (${interestCount})` : ""}`}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs transition-all duration-200 cursor-pointer hover:bg-white/4 ${
              interested
                ? "text-red-400 hover:text-red-300"
                : "text-text-muted hover:text-text-body"
            }`}
          >
            <Heart className={`size-3.5 ${interested ? "fill-current" : ""}`} />
            {interestCount > 0 && <span>{interestCount}</span>}
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!currentUserId || isPending}
            aria-pressed={saved}
            aria-label={`Save${saveCount > 0 ? ` (${saveCount})` : ""}`}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs transition-all duration-200 cursor-pointer hover:bg-white/4 ${
              saved
                ? "text-amber-400 hover:text-amber-300"
                : "text-text-muted hover:text-text-body"
            }`}
          >
            {saved ? (
              <BookmarkCheck className="size-3.5" />
            ) : (
              <Bookmark className="size-3.5" />
            )}
            {saveCount > 0 && <span>{saveCount}</span>}
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            aria-label="Share"
            className="flex items-center rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs text-text-muted hover:text-text-body hover:bg-white/4 transition-all duration-200 cursor-pointer"
          >
            <Share2 className="size-3.5" />
          </button>

          {/* Block / Report menu */}
          {!isOwn && currentUserId && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label="More options"
                className="flex items-center rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs text-text-muted hover:text-text-body hover:bg-white/4 transition-all duration-200 cursor-pointer"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 bottom-full mb-1 z-50 w-40 rounded-lg border border-white/8 bg-surface-secondary shadow-xl py-1">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        startTransition(async () => {
                          try {
                            await blockUser(intent.author_id);
                            toast.success("User blocked");
                          } catch {
                            toast.error("Failed to block user");
                          }
                        });
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-body hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <Ban className="size-3.5" />
                      Block
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setReportOpen(true);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <Flag className="size-3.5" />
                      Report
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Connect / Pending / View Contact */}
          {!isOwn && !requestStatus && intent.lifecycle_status === "active" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 ml-1.5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.97] cursor-pointer"
              onClick={() => onRequestConnection?.(intent)}
            >
              <MessageSquare className="size-3.5 mr-1" />
              Connect
            </Button>
          )}
          {!isOwn && requestStatus === "pending" && (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="ml-1"
              title={isExpired ? "This intent expired before the author responded" : undefined}
            >
              <Circle className="size-3.5 mr-1" />
              {isExpired ? "Expired" : "Pending"}
            </Button>
          )}
          {!isOwn && requestStatus === "accepted" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 ml-1 cursor-pointer"
              onClick={() => onViewContact?.(intent)}
            >
              <Eye className="size-3.5 mr-1" />
              View Contact
            </Button>
          )}
        </div>
      </div>

      {/* Report dialog */}
      {currentUserId && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          reportedUserId={intent.author_id}
          reportedIntentId={intent.id}
        />
      )}
    </div>
  );
}
