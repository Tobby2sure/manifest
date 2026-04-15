"use client";

import { useEffect, useState, useTransition, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, MapPin, Users, ExternalLink, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/lib/hooks/use-user";
import {
  getEvent,
  getEventAttendees,
  getAttendeeMatches,
  toggleAttendance,
  isAttending,
  type ManifestEvent,
} from "@/app/actions/events";
import type { Profile, IntentWithAuthor } from "@/lib/types/database";
import { INTENT_TYPE_CONFIG } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type EventWithCount = ManifestEvent & { attendee_count: number };

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useUser();
  const userId = user?.userId ?? null;

  const [event, setEvent] = useState<EventWithCount | null>(null);
  const [attendees, setAttendees] = useState<{ user_id: string; profiles: Profile }[]>([]);
  const [matches, setMatches] = useState<IntentWithAuthor[]>([]);
  const [attending, setAttending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const ev = await getEvent(slug);
      if (!ev) {
        setLoading(false);
        return;
      }
      setEvent(ev);

      const [atts, att] = await Promise.all([
        getEventAttendees(ev.id),
        userId ? isAttending(ev.id, userId) : false,
      ]);

      setAttendees(atts as unknown as { user_id: string; profiles: Profile }[]);
      setAttending(att);

      if (userId) {
        const m = await getAttendeeMatches(ev.id, userId);
        setMatches(m as IntentWithAuthor[]);
      }

      setLoading(false);
    }
    load();
  }, [slug, userId]);

  function handleToggleAttendance() {
    if (!event || !userId) return;
    const wasAttending = attending;
    setAttending(!wasAttending);
    startTransition(async () => {
      try {
        await toggleAttendance(event.id, userId);
        // Refresh attendees
        const atts = await getEventAttendees(event.id);
        setAttendees(atts as unknown as { user_id: string; profiles: Profile }[]);
      } catch {
        setAttending(wasAttending);
      }
    });
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface-page">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="h-10 w-64 rounded bg-white/6 animate-pulse mb-4" />
          <div className="h-6 w-96 rounded bg-white/4 animate-pulse mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-secondary animate-pulse border border-white/6" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface-page flex items-center justify-center">
        <p className="text-zinc-400">Event not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface-page">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/events" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4 inline-block">
            ← Back to Events
          </Link>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white/90 mb-2">{event.name}</h1>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {event.location ?? "TBA"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {new Date(event.start_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  –{" "}
                  {new Date(event.end_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {attendees.length} going
                </span>
                {event.website && (
                  <a
                    href={event.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                    Website
                  </a>
                )}
              </div>
            </div>
            {userId && (
              <Button
                onClick={handleToggleAttendance}
                disabled={isPending}
                className={
                  attending
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    : "bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
                }
              >
                {attending ? (
                  <>
                    <Check className="size-4 mr-1.5" />
                    I&apos;m Going
                  </>
                ) : (
                  <>
                    <Plus className="size-4 mr-1.5" />
                    I&apos;m Going
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Matches */}
        {userId && matches.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-white/90 mb-4">
              Matches for you
            </h2>
            <div className="space-y-3">
              {matches.map((intent, i) => {
                const typeConfig = INTENT_TYPE_CONFIG[intent.type];
                return (
                  <motion.div
                    key={intent.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                    className="rounded-xl border border-white/6 bg-surface-secondary p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Link href={`/profile/${intent.author.id}`}>
                        <Avatar className="h-9 w-9 ring-1 ring-white/10">
                          {intent.author.avatar_url ? (
                            <AvatarImage src={intent.author.avatar_url} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {intent.author.display_name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/profile/${intent.author.id}`}
                            className="text-sm font-medium text-white/90 hover:text-violet-400 transition-colors"
                          >
                            {intent.author.display_name ?? "Anonymous"}
                          </Link>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${typeConfig.color}`}
                          >
                            {typeConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                          {intent.content}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Attendees */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white/90 mb-4">
            Attendees ({attendees.length})
          </h2>
          {attendees.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No one has marked attendance yet. Be the first!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attendees.map((att, i) => {
                const profile = att.profiles;
                if (!profile) return null;
                return (
                  <motion.div
                    key={att.user_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + i * 0.04 }}
                  >
                    <Link
                      href={`/profile/${profile.id}`}
                      className="flex items-center gap-3 rounded-xl border border-white/6 bg-surface-secondary p-3 hover:border-white/12 transition-all"
                    >
                      <Avatar className="h-9 w-9 ring-1 ring-white/10">
                        {profile.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {profile.display_name?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">
                          {profile.display_name ?? "Anonymous"}
                        </p>
                        {profile.twitter_handle && (
                          <p className="text-xs text-zinc-500">
                            @{profile.twitter_handle}
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </main>
  );
}
