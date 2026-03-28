"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
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
} from "lucide-react";
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

const LIFECYCLE_STYLES: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  in_discussion: { label: "In Discussion", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  partnership_formed: { label: "Partnered", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  closed: { label: "Closed", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
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

// Extract base color name from config color string for left border
function getBorderColor(colorStr: string): string {
  const match = colorStr.match(/text-(\w+)-400/);
  if (!match) return "border-violet-500/50";
  return `border-${match[1]}-500/50`;
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
  const lifecycle = LIFECYCLE_STYLES[intent.lifecycle_status];
  const leftBorderColor = getBorderColor(typeConfig.color);

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
        await toggleSave(intent.id, currentUserId);
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
        await toggleInterest(intent.id, currentUserId);
      } catch {
        setInterested(wasInterested);
        setInterestCount((c) => (wasInterested ? c + 1 : c - 1));
      }
    });
  };

  return (
    <div
      className={`group relative rounded-xl border-l-[3px] ${leftBorderColor} border border-white/[0.07] bg-[#0f0f1a] p-4 transition-all duration-200 hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${isExpired ? "opacity-60" : ""}`}
    >
      {/* Type badge top-right */}
      <div className="absolute top-3 right-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.color}`}>
          <span className={`size-1.5 rounded-full ${typeConfig.color.split(' ')[0].replace('/20', '')}`} />
          {typeConfig.label}
        </span>
      </div>

      {/* Author row */}
      <div className="flex items-center gap-3 mb-3 pr-24">
        <Link href={`/profile/${author.id}`} className="shrink-0">
          <Avatar size="default" className="transition-transform duration-200 hover:scale-110">
            {author.avatar_url ? (
              <AvatarImage src={author.avatar_url} alt={author.display_name ?? ""} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/profile/${author.id}`} className="text-sm font-medium text-[#F1F5F9] truncate hover:text-violet-400 transition-colors duration-200 cursor-pointer">
              {author.display_name ?? "Anonymous"}
            </Link>
            {author.twitter_verified && (
              <CheckCircle className="size-3.5 text-emerald-400 shrink-0" />
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
              <span className="text-xs text-[#475569]">
                @{author.twitter_handle}
              </span>
            )}
            {intent.org_id && (
              <span className="text-xs text-[#475569]">
                · <Link href={`/org/${intent.org_id}`} className="hover:text-[#94A3B8] transition-colors duration-200 cursor-pointer">Org</Link>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Priority + Lifecycle badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[intent.priority]}`}>
          {intent.priority === "Urgent" && (
            <span className="relative mr-1">
              <span className="absolute inset-0 size-2 rounded-full bg-red-400 animate-ping" />
              <span className="relative size-2 rounded-full bg-red-400 inline-block" />
            </span>
          )}
          {intent.priority}
        </span>
        {intent.lifecycle_status !== "active" && lifecycle && (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${lifecycle.color}`}>
            {lifecycle.label}
          </span>
        )}
        {isExpired && (
          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-zinc-500/20 text-[#475569]">
            Expired
          </span>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-[#F1F5F9]/80 leading-[1.6] mb-3">
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
          <span className="inline-flex items-center rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-xs text-[#94A3B8]">
            {ECOSYSTEM_CONFIG[intent.ecosystem].label}
          </span>
        )}
        {intent.sector && (
          <span className="inline-flex items-center rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-xs text-[#94A3B8]">
            {SECTOR_CONFIG[intent.sector].label}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 text-xs text-[#475569]">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {timeRemaining} left
          </span>
          <span>{postedAgo}</span>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Interest */}
          <button
            onClick={handleInterest}
            disabled={!currentUserId || isPending}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs transition-colors duration-200 cursor-pointer ${
              interested
                ? "text-red-400 hover:text-red-300"
                : "text-[#475569] hover:text-[#94A3B8]"
            }`}
          >
            <Heart className={`size-3.5 ${interested ? "fill-current" : ""}`} />
            {interestCount > 0 && <span>{interestCount}</span>}
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!currentUserId || isPending}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs transition-colors duration-200 cursor-pointer ${
              saved
                ? "text-amber-400 hover:text-amber-300"
                : "text-[#475569] hover:text-[#94A3B8]"
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
            className="flex items-center rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs text-[#475569] hover:text-[#94A3B8] transition-colors duration-200 cursor-pointer"
          >
            <Share2 className="size-3.5" />
          </button>

          {/* Connect / Pending / View Contact */}
          {!isOwn && !requestStatus && intent.lifecycle_status === "active" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 ml-1 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.97] cursor-pointer"
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 ml-1 cursor-pointer"
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
