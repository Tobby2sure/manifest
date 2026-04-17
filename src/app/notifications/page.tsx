"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  CheckCheck,
  Eye,
  Sparkles,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import {
  getNotifications,
  markRead,
  markAllRead,
} from "@/app/actions/notifications";
import { acceptAffiliateRequest, declineAffiliateRequest } from "@/app/actions/affiliates";
import type { Notification, NotificationType } from "@/lib/types/database";
import { formatDistanceToNow } from "date-fns";
import { NotificationListSkeleton } from "@/components/skeletons";
import { toast } from "sonner";

const NOTIF_ICONS: Record<NotificationType, typeof MessageSquare> = {
  connection_request: MessageSquare,
  request_accepted: CheckCircle,
  request_declined: XCircle,
  intent_expiring: Clock,
  org_approval_request: Bell,
  org_intent_approved: CheckCircle,
  org_intent_rejected: XCircle,
  intent_engagement_summary: Eye,
  intent_suggestions: Sparkles,
  affiliate_request: Award,
  affiliate_accepted: CheckCircle,
  affiliate_declined: XCircle,
};

const NOTIF_COLORS: Record<NotificationType, string> = {
  connection_request: "text-blue-400",
  request_accepted: "text-emerald-400",
  request_declined: "text-red-400",
  intent_expiring: "text-amber-400",
  org_approval_request: "text-violet-400",
  org_intent_approved: "text-emerald-400",
  org_intent_rejected: "text-red-400",
  intent_engagement_summary: "text-violet-400",
  intent_suggestions: "text-cyan-400",
  affiliate_request: "text-violet-400",
  affiliate_accepted: "text-emerald-400",
  affiliate_declined: "text-red-400",
};

const NOTIF_BG: Record<NotificationType, string> = {
  connection_request: "bg-blue-500/10",
  request_accepted: "bg-emerald-500/10",
  request_declined: "bg-red-500/10",
  intent_expiring: "bg-amber-500/10",
  org_approval_request: "bg-violet-500/10",
  org_intent_approved: "bg-emerald-500/10",
  org_intent_rejected: "bg-red-500/10",
  intent_engagement_summary: "bg-violet-500/10",
  intent_suggestions: "bg-cyan-500/10",
  affiliate_request: "bg-violet-500/10",
  affiliate_accepted: "bg-emerald-500/10",
  affiliate_declined: "bg-red-500/10",
};

function getNotificationMessage(notif: Notification): string {
  const p = notif.payload;
  switch (notif.type) {
    case "connection_request":
      return `${p.senderName ?? "Someone"} sent you a connection request`;
    case "request_accepted":
      return `${p.receiverName ?? "Someone"} accepted your connection request`;
    case "request_declined":
      return `Your connection request was declined`;
    case "intent_expiring":
      return `Your intent is expiring soon`;
    case "intent_engagement_summary": {
      const parts: string[] = [];
      if (p.views) parts.push(`${p.views} views`);
      if (p.interests) parts.push(`${p.interests} interests`);
      if (p.saves) parts.push(`${p.saves} saves`);
      return `Your intent got ${parts.join(", ")} in the last 24h`;
    }
    case "intent_suggestions":
      return p.message as string ?? "Check out intents that match yours";
    case "affiliate_request":
      return `${p.orgName ?? "An organization"} wants to mark you as an affiliate`;
    case "affiliate_accepted":
      return `${p.targetName ?? "Someone"} accepted your affiliate request`;
    case "affiliate_declined":
      return `Your affiliate request was declined`;
    default:
      return "You have a new notification";
  }
}

export default function NotificationsPage() {
  const { profile, isLoading } = useUser();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!profile?.id) return;
    getNotifications(profile.id).then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, [profile?.id]);

  const handleMarkRead = (notif: Notification) => {
    if (notif.read) return;
    startTransition(async () => {
      await markRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    });
  };

  const handleMarkAllRead = () => {
    if (!profile?.id) return;
    startTransition(async () => {
      await markAllRead(profile.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  };

  const handleAcceptAffiliate = (notif: Notification) => {
    const requestId = notif.payload.requestId as string | undefined;
    if (!requestId) return;
    startTransition(async () => {
      try {
        await acceptAffiliateRequest(requestId);
        toast.success("Affiliate request accepted");
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to accept");
      }
    });
  };

  const handleDeclineAffiliate = (notif: Notification) => {
    const requestId = notif.payload.requestId as string | undefined;
    if (!requestId) return;
    startTransition(async () => {
      try {
        await declineAffiliateRequest(requestId);
        toast.success("Request declined");
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to decline");
      }
    });
  };

  if (isLoading || loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <NotificationListSkeleton />
        </div>
      </main>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white/90">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-zinc-400 mt-1">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="text-zinc-400 hover:text-white"
            >
              <CheckCheck className="size-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Bell className="size-6 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-white/70">
              No notifications yet
            </h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-sm">
              You&apos;ll be notified when someone connects with your intents.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const Icon = NOTIF_ICONS[notif.type] ?? Bell;
              const iconColor = NOTIF_COLORS[notif.type] ?? "text-zinc-400";
              const bgColor = NOTIF_BG[notif.type] ?? "bg-white/5";

              const isAffiliateRequest = notif.type === "affiliate_request";

              return (
                <div
                  key={notif.id}
                  className={`w-full rounded-xl border transition-colors ${
                    notif.read
                      ? "border-white/6 bg-card/50"
                      : "border-white/8 bg-card"
                  }`}
                >
                  <button
                    onClick={() => handleMarkRead(notif)}
                    className="w-full flex items-start gap-3 p-4 text-left"
                  >
                    <div
                      className={`shrink-0 size-9 rounded-full flex items-center justify-center ${bgColor}`}
                    >
                      <Icon className={`size-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-relaxed ${
                          notif.read ? "text-zinc-400" : "text-white/90"
                        }`}
                      >
                        {getNotificationMessage(notif)}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="shrink-0 mt-1.5">
                        <div className="size-2 rounded-full bg-emerald-400" />
                      </div>
                    )}
                  </button>

                  {isAffiliateRequest && (
                    <div className="flex gap-2 px-4 pb-4 pt-0">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptAffiliate(notif)}
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineAffiliate(notif)}
                        disabled={isPending}
                        className="border-white/10 text-zinc-300 hover:bg-white/5"
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
