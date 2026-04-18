"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ViewContactDialog } from "@/components/view-contact-dialog";
import { useUser } from "@/lib/hooks/use-user";
import { getAcceptedConnections } from "@/app/actions/connections";
import { INTENT_TYPE_CONFIG } from "@/lib/types/database";
import type { ConnectionWithIntent } from "@/lib/types/database";
import { formatDistanceToNow } from "date-fns";
import { Eye, MessageCircle, Users } from "lucide-react";
import { NotificationListSkeleton } from "@/components/skeletons";

/**
 * My Connections — lists accepted connection requests (both sides) so
 * the user can re-open the contact-details dialog at any time.
 *
 * Before this page, the only way to see a contact after accept was to
 * click the toast / notification once — close that dialog and the info
 * was gone. The server action getAcceptedConnections() already existed;
 * this is the missing UI.
 */
export default function ConnectionsPage() {
  const { profile, isLoading } = useUser();
  const [connections, setConnections] = useState<ConnectionWithIntent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [openContactId, setOpenContactId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!profile?.id) return;
    startTransition(async () => {
      try {
        const rows = await getAcceptedConnections();
        setConnections(rows);
      } finally {
        setLoading(false);
      }
    });
  }, [profile?.id]);

  if (isLoading || loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <NotificationListSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white/90">My Connections</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {connections?.length ?? 0} accepted {connections?.length === 1 ? "connection" : "connections"}
          </p>
        </div>

        {!connections || connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Users className="size-6 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-white/70">No connections yet</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-sm">
              When someone accepts your connection request — or you accept
              theirs — it&apos;ll show up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {connections.map((conn) => {
              const isSender = conn.sender_id === profile?.id;
              const other = isSender ? conn.receiver_profile : conn.sender_profile;
              const intentTypeConfig =
                INTENT_TYPE_CONFIG[conn.intents.type as keyof typeof INTENT_TYPE_CONFIG];
              const connectedAgo = formatDistanceToNow(new Date(conn.updated_at), {
                addSuffix: true,
              });

              return (
                <li
                  key={conn.id}
                  className="rounded-xl border border-white/6 bg-card p-4 flex items-start gap-3"
                >
                  <Link href={`/profile/${other.id}`} className="shrink-0">
                    <Avatar className="size-10 ring-1 ring-white/10">
                      {other.avatar_url ? (
                        <AvatarImage src={other.avatar_url} alt={other.display_name ?? ""} />
                      ) : null}
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300">
                        {(other.display_name ?? "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/profile/${other.id}`}
                        className="text-sm font-medium text-white/90 hover:text-violet-400 transition-colors truncate"
                      >
                        {other.display_name ?? "Anonymous"}
                      </Link>
                      {intentTypeConfig && (
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${intentTypeConfig.color}`}
                        >
                          {intentTypeConfig.label}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">{connectedAgo}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {conn.intents.content}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => setOpenContactId(conn.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                      >
                        <Eye className="size-3.5 mr-1.5" />
                        View contact
                      </Button>
                      <Link
                        href={`/feed?intent=${conn.intents.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        <MessageCircle className="size-3.5" />
                        View intent
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ViewContactDialog
        open={!!openContactId}
        onOpenChange={(open) => {
          if (!open) setOpenContactId(null);
        }}
        connectionId={openContactId}
      />
    </main>
  );
}

export const dynamic = "force-dynamic";
