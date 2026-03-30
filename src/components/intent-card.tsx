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
import { DealTracker } from "@/components/deal-tracker";
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
  authorEvents?: string[];
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
  authorEvents = [],
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
      className={`group relative rounded-xl border-l-[3px] ${leftBorderColor} border border-white/[0.06] bg-gradient-to-br from-[#0f0f1a] to-[#0c0c16] p-5 transition-all duration-300 ease-out hover:border-white/[0.10] hover:scale-[1.01] hover:shadow-xl hover:shadow-black/30 card-glow-border ${isExpired ? "opacity-50 grayscale-[30%]" : ""}`}
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
          {authorEvents.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              {authorEvents.slice(0, 2).map((eventName) => (
                <span key={eventName} className="inline-flex items-center text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full border border-violet-500/20">
                  📍 {eventName}
                </span>
              ))}
            </div>
          )}
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
      <p className="text-sm text-[#F1F5F9]/75 leading-[1.7] mb-3.5">
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
          <span className="inline-flex items-center rounded-md bg-white/[0.03] border border-white/[0.06] px-2.5 py-0.5 text-[11px] text-[#94A3B8] font-medium tracking-wide">
            {ECOSYSTEM_CONFIG[intent.ecosystem].label}
          </span>
        )}
        {intent.sector && (
          <span className="inline-flex items-center rounded-md bg-white/[0.03] border border-white/[0.06] px-2.5 py-0.5 text-[11px] text-[#94A3B8] font-medium tracking-wide">
            {SECTOR_CONFIG[intent.sector].label}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.05]">
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
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs transition-all duration-200 cursor-pointer hover:bg-white/[0.04] ${
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
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs transition-all duration-200 cursor-pointer hover:bg-white/[0.04] ${
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
            className="flex items-center rounded-lg px-2 py-1.5 min-w-[44px] min-h-[44px] justify-center text-xs text-[#475569] hover:text-[#94A3B8] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
          >
            <Share2 className="size-3.5" />
          </button>

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

      {/* Deal Tracker — visible to intent owner only */}
      {isOwn && currentUserId && (
        <div className="px-5 pb-4">
          <DealTracker
            intentId={intent.id}
            currentStatus={intent.lifecycle_status}
            userId={currentUserId}
          />
        </div>
      )}
    </div>
  );
}
