"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users } from "lucide-react";
import { getEvents, seedEvents, type ManifestEvent } from "@/app/actions/events";

export const dynamic = "force-dynamic";

type EventWithCount = ManifestEvent & { attendee_count: number };

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await seedEvents();
      const data = await getEvents();
      setEvents(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface-page">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white/90 mb-2">Events</h1>
          <p className="text-zinc-400 mb-8">
            Upcoming conferences and meetups. Mark your attendance and find
            matching intents.
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-surface-secondary animate-pulse border border-white/6"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-zinc-500 py-20">
            No upcoming events found.
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link href={`/events/${event.slug}`}>
                  <div className="group rounded-xl border border-white/6 bg-gradient-to-br from-surface-secondary to-[#0c0c16] p-5 transition-all duration-300 hover:border-white/12 hover:shadow-xl hover:shadow-violet-500/5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-white/90 group-hover:text-violet-400 transition-colors">
                          {event.name}
                        </h2>
                        <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5" />
                            {event.location ?? "TBA"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="size-3.5" />
                            {new Date(event.start_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}{" "}
                            –{" "}
                            {new Date(event.end_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="size-3.5" />
                            {event.attendee_count} going
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        View →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
