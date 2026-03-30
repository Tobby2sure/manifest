"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ManifestEvent {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  start_date: string;
  end_date: string;
  website: string | null;
  created_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
}

export async function getEvents(): Promise<
  (ManifestEvent & { attendee_count: number })[]
> {
  const supabase = createAdminClient();

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .gte("end_date", new Date().toISOString().slice(0, 10))
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);

  // Get attendee counts
  const eventIds = (events ?? []).map((e: ManifestEvent) => e.id);
  const { data: counts } = await supabase
    .from("event_attendees")
    .select("event_id")
    .in("event_id", eventIds.length ? eventIds : ["__none__"]);

  const countMap: Record<string, number> = {};
  (counts ?? []).forEach((c: { event_id: string }) => {
    countMap[c.event_id] = (countMap[c.event_id] ?? 0) + 1;
  });

  return (events ?? []).map((e: ManifestEvent) => ({
    ...e,
    attendee_count: countMap[e.id] ?? 0,
  }));
}

export async function getEvent(
  slug: string
): Promise<(ManifestEvent & { attendee_count: number }) | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;

  const { count } = await supabase
    .from("event_attendees")
    .select("id", { count: "exact", head: true })
    .eq("event_id", data.id);

  return { ...data, attendee_count: count ?? 0 };
}

export async function getEventAttendees(eventId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("event_attendees")
    .select("user_id, profiles:profiles!user_id(*)")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function toggleAttendance(
  eventId: string,
  userId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  // Check if already attending
  const { data: existing } = await supabase
    .from("event_attendees")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    await supabase.from("event_attendees").delete().eq("id", existing.id);
    return false; // no longer attending
  } else {
    const { error } = await supabase
      .from("event_attendees")
      .insert({ event_id: eventId, user_id: userId });
    if (error) throw new Error(error.message);
    return true; // now attending
  }
}

export async function isAttending(
  eventId: string,
  userId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("event_attendees")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function getAttendeeMatches(eventId: string, userId: string) {
  const supabase = createAdminClient();

  // Get current user's intent types
  const { data: myIntents } = await supabase
    .from("intents")
    .select("type, ecosystem")
    .eq("author_id", userId)
    .eq("lifecycle_status", "active")
    .gte("expires_at", new Date().toISOString());

  if (!myIntents || myIntents.length === 0) return [];

  const myTypes = myIntents.map((i: { type: string }) => i.type);
  const myEcosystems = myIntents
    .map((i: { ecosystem: string | null }) => i.ecosystem)
    .filter(Boolean) as string[];

  // Get other attendees
  const { data: attendees } = await supabase
    .from("event_attendees")
    .select("user_id")
    .eq("event_id", eventId)
    .neq("user_id", userId);

  if (!attendees || attendees.length === 0) return [];

  const attendeeIds = attendees.map((a: { user_id: string }) => a.user_id);

  // Get their intents that match our types
  let query = supabase
    .from("intents")
    .select("*, author:profiles!author_id(*)")
    .in("author_id", attendeeIds)
    .in("type", myTypes)
    .eq("lifecycle_status", "active")
    .gte("expires_at", new Date().toISOString());

  if (myEcosystems.length > 0) {
    query = query.in("ecosystem", myEcosystems);
  }

  const { data: matchingIntents } = await query;

  return matchingIntents ?? [];
}

export async function getUserUpcomingEvents(
  userId: string
): Promise<ManifestEvent[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("event_attendees")
    .select("event_id, events:events!event_id(*)")
    .eq("user_id", userId);

  if (!data) return [];

  const now = new Date().toISOString().slice(0, 10);
  return (data as unknown as { events: ManifestEvent }[])
    .map((d) => d.events)
    .filter((e) => e && e.end_date >= now);
}

export async function seedEvents() {
  const supabase = createAdminClient();

  const events = [
    {
      name: "ETHDenver 2027",
      slug: "ethdenver-2027",
      location: "denver",
      start_date: "2027-02-27",
      end_date: "2027-03-09",
      website: "https://ethdenver.com",
    },
    {
      name: "EthCC 2026",
      slug: "ethcc-2026",
      location: "brussels",
      start_date: "2026-07-07",
      end_date: "2026-07-10",
      website: "https://ethcc.io",
    },
    {
      name: "Token2049 Singapore 2026",
      slug: "token2049-singapore-2026",
      location: "singapore",
      start_date: "2026-09-18",
      end_date: "2026-09-19",
      website: "https://token2049.com",
    },
    {
      name: "Devcon 8",
      slug: "devcon-8",
      location: "unknown",
      start_date: "2026-11-01",
      end_date: "2026-11-05",
      website: "https://devcon.org",
    },
  ];

  for (const event of events) {
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("slug", event.slug)
      .single();

    if (!existing) {
      await supabase.from("events").insert(event);
    }
  }
}
