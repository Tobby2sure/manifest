"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  CheckCircle,
  Clock,
  MessageSquare,
  Zap,
  Circle,
  Eye,
  Share2,
  Bookmark,
  BookmarkCheck,
  Heart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type {
  IntentWithAuthor,
  ConnectionRequestStatus,
} from "@/lib/types/database";
import { INTENT_TYPE_CONFIG, ECOSYSTEM_CONFIG, SECTOR_CONFIG } from "@/lib/types/database";
import { toggleSave } from "@/app/actions/saved";
import { toggleInterest } from "@/app/actions/interests";

const PRIORITY_STYLES: Record<string, string> = {
  Urgent: "bg-red-500/20 text-red-400",
  Open: "bg-emerald-500/20 text-emerald-400",
  Active: "bg-amber-500/20 text-amber-400",
};

const LIFECYCLE_LABELS: Record<string, string> = {
  active: "Active",
  in_discussion: "In Discussion",
  partnership_formed: "Partnership Formed",
  closed: "Closed",
};

function getActivityIndicator(lastActiveAt: string | null) {
  if (!lastActiveAt) return null;
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 24) return { label: "Active", color: "text-emerald-400", dot: "bg-emerald-400" };
  if (hours < 168) {
    const days = Math.floor(hours / 24);
    return { label: `Active ${days}d ago`, color: "text-amber-400", dot: "bg-amber-400" };
  }
  return null;
}

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
}: IntentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [interested, setInterested] = useState(initialInterested);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [interestCount, setInterestCount] = useState(initialInterestCount);
  const [isPending, startTransition] = useTransition();

  const typeConfig = INTENT_TYPE_CONFIG[intent.type];
  const isOwn = currentUserId === intent.author_id;
  const contentTruncated = intent.content.length > 200 && !expanded;
  const displayContent = contentTruncated
    ? intent.content.slice(0, 200) + "..."
    : intent.content;

  const expiresAt = new Date(intent.expires_at);
  const now = new Date();
  const isExpired = expiresAt <= now;
  const timeRemaining = isExpired
    ? "Expired"
    : formatDistanceToNow(expiresAt, { addSuffix: false });

  const postedAgo = formatDistanceToNow(new Date(intent.created_at), {
    addSuffix: true,
  });

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
    // Optimistic update
    const wasSaved = saved;
    setSaved(!wasSaved);
    setSaveCount((c) => (wasSaved ? c - 1 : c + 1));
    startTransition(async () => {
      try {
        await toggleSave(intent.id, currentUserId);
      } catch {
        // Revert on error
        setSaved(wasSaved);
        setSaveCount((c) => (wasSaved ? c + 1 : c - 1));
      }
    });
  };

  const handleInterest = () => {
    if (!currentUserId) return;
    // Optimistic update
    const wasInterested = interested;
    setInterested(!wasInterested);
    setInterestCount((c) => (wasInterested ? c - 1 : c + 1));
    startTransition(async () => {
      try {
        await toggleInterest(intent.id, currentUserId);
      } catch {
        // Revert on error
        setInterested(wasInterested);
        setInterestCount((c) => (wasInterested ? c + 1 : c - 1));
      }
    });
  };

  return (
    <div className={`rounded-xl border border-white/[0.08] bg-[#0e0e14] p-4 transition-colors hover:border-white/[0.12] ${isExpired ? "opacity-60" : ""}`}>
      {/* Author row */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/profile/${author.id}`}>
          <Avatar size="default">
            {author.avatar_url ? (
              <AvatarImage src={author.avatar_url} alt={author.display_name ?? ""} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/profile/${author.id}`} className="text-sm font-medium text-white/90 truncate hover:text-emerald-400 transition-colors">
              {author.display_name ?? "Anonymous"}
            </Link>
            {author.twitter_verified && (
              <CheckCircle className="size-3.5 text-emerald-400 shrink-0" />
            )}
            {activity && (
              <span className={`flex items-center gap-1 text-xs ${activity.color}`}>
                <span className={`size-1.5 rounded-full ${activity.dot}`} />
                {activity.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {author.twitter_handle && (
              <span className="text-xs text-zinc-400">
                @{author.twitter_handle}
              </span>
            )}
            {intent.org_id && (
              <span className="text-xs text-zinc-500">
                · <Link href={`/org/${intent.org_id}`} className="hover:text-zinc-300 transition-colors">Org</Link>
              </span>
            )}
          </div>
        </div>
        {/* Lifecycle badge */}
        {intent.lifecycle_status !== "active" && (
          <Badge variant="outline" className="text-xs shrink-0">
            {LIFECYCLE_LABELS[intent.lifecycle_status]}
          </Badge>
        )}
      </div>

      {/* Intent type badge */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}
        >
          {typeConfig.label}
        </span>
        <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[intent.priority]}`}>
          {intent.priority === "Urgent" && <span className="relative mr-1"><span className="absolute inset-0 size-2 rounded-full bg-red-400 animate-ping" /><span className="relative size-2 rounded-full bg-red-400 inline-block" /></span>}
          {intent.priority}
        </span>
        {isExpired && (
          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-zinc-500/20 text-zinc-400">
            Expired
          </span>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-white/80 leading-relaxed mb-3">
        {displayContent}
        {intent.content.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-emerald-400 hover:text-emerald-300 text-xs font-medium"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {intent.ecosystem && (
          <span
            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs ${ECOSYSTEM_CONFIG[intent.ecosystem].color}`}
          >
            {ECOSYSTEM_CONFIG[intent.ecosystem].label}
          </span>
        )}
        {intent.sector && (
          <span
            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs ${SECTOR_CONFIG[intent.sector].color}`}
          >
            {SECTOR_CONFIG[intent.sector].label}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {timeRemaining} left
          </span>
          <span>{postedAgo}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Interest */}
          <button
            onClick={handleInterest}
            disabled={!currentUserId || isPending}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs transition-colors ${
              interested
                ? "text-red-400 hover:text-red-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Heart className={`size-3.5 ${interested ? "fill-current" : ""}`} />
            {interestCount > 0 && <span>{interestCount}</span>}
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!currentUserId || isPending}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs transition-colors ${
              saved
                ? "text-amber-400 hover:text-amber-300"
                : "text-zinc-500 hover:text-zinc-300"
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
            className="flex items-center rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Share2 className="size-3.5" />
          </button>

          {/* Connect / Pending / View Contact */}
          {!isOwn && !requestStatus && intent.lifecycle_status === "active" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 ml-1"
              onClick={() => onRequestConnection?.(intent)}
            >
              <MessageSquare className="size-3.5 mr-1" />
              Connect
            </Button>
          )}
          {!isOwn && requestStatus === "pending" && (
            <Button size="sm" variant="outline" disabled className="ml-1">
              <Circle className="size-3.5 mr-1" />
              Pending
            </Button>
          )}
          {!isOwn && requestStatus === "accepted" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 ml-1"
              onClick={() => onViewContact?.(intent)}
            >
              <Eye className="size-3.5 mr-1" />
              View Contact
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
