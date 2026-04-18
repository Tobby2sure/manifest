"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { notifyAsync } from "@/app/actions/notifications";
import { checkConnectionRateLimit } from "@/lib/rate-limit";
import { isBlocked } from "@/app/actions/moderation";
import { trackServerEvent } from "@/lib/posthog";
import { getSessionUserId } from "@/lib/auth";
import type {
  ConnectionRequest,
  ConnectionWithIntent,
  IntentLifecycleStatus,
} from "@/lib/types/database";

export async function sendConnectionRequest(
  intentId: string,
  receiverId: string,
  pitchMessage: string
): Promise<ConnectionRequest> {
  const senderId = await getSessionUserId();

  // Rate limit: 10 connection requests per sender per day.
  // If the limiter errors (bad Upstash creds, etc.), log and allow —
  // don't block a legitimate action because of infra flakiness.
  try {
    await checkConnectionRateLimit(senderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.toLowerCase().includes("limit of")) {
      throw e; // user genuinely hit their daily cap
    }
    console.error("[sendConnectionRequest] rate limiter error (allowing through):", e);
  }

  // Block check — non-fatal if the query itself errors.
  try {
    if (await isBlocked(senderId, receiverId)) {
      throw new Error("Unable to send this connection request");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unable to send")) {
      throw e;
    }
    console.error("[sendConnectionRequest] block check error (allowing through):", e);
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("connection_requests")
    .insert({
      intent_id: intentId,
      sender_id: senderId,
      receiver_id: receiverId,
      pitch_message: pitchMessage,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[sendConnectionRequest] insert failed:", error);
    throw new Error(error.message || "Failed to create connection request");
  }

  // Non-fatal post-insert side effects
  try {
    trackServerEvent(senderId, "connection_sent", { intentId, receiverId });
  } catch (e) {
    console.error("[sendConnectionRequest] analytics failed:", e);
  }

  try {
    const { getProfile } = await import("@/app/actions/profiles");
    const senderProfile = await getProfile(senderId);
    notifyAsync(receiverId, "connection_request", {
      senderName: senderProfile?.display_name ?? "Someone",
      intentId,
      senderId,
    });
  } catch (e) {
    console.error("[sendConnectionRequest] notification failed:", e);
  }

  revalidatePath("/feed");
  return data as ConnectionRequest;
}

export async function getContactDetails(
  connectionId: string
): Promise<{ telegram_handle: string | null; email: string | null } | null> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  // First verify the request is accepted and the user is involved
  const { data: request, error: reqError } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", connectionId)
    .eq("status", "accepted")
    .single();

  if (reqError || !request) return null;

  const req = request as ConnectionRequest;

  // Determine whose contact info to return
  const targetUserId =
    req.sender_id === userId ? req.receiver_id : req.sender_id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("telegram_handle, email")
    .eq("id", targetUserId)
    .single();

  if (profileError || !profile) return null;

  return profile as { telegram_handle: string | null; email: string | null };
}

export async function updateConnectionLifecycle(
  connectionId: string,
  newStatus: IntentLifecycleStatus
): Promise<void> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  // Verify user is a party to this accepted connection
  const { data: conn, error: fetchError } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", connectionId)
    .eq("status", "accepted")
    .single();

  if (fetchError || !conn) {
    throw new Error("Connection not found or not accepted");
  }

  const req = conn as ConnectionRequest;
  if (req.sender_id !== userId && req.receiver_id !== userId) {
    throw new Error("Not authorized to update this connection");
  }

  const { error } = await supabase
    .from("connection_requests")
    .update({ lifecycle_status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", connectionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/feed");
  revalidatePath(`/profile/${userId}`);
}

/**
 * Accept a pending connection request.
 * Caller must be the request's receiver.
 * Notifies the sender on success.
 */
export async function acceptConnectionRequest(
  requestId: string
): Promise<void> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data: request, error: fetchError } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !request) {
    throw new Error("Request not found");
  }
  const req = request as ConnectionRequest;
  if (req.receiver_id !== userId) {
    throw new Error("Not authorized");
  }
  if (req.status !== "pending") {
    throw new Error(`Request already ${req.status}`);
  }

  const { error: updateError } = await supabase
    .from("connection_requests")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (updateError) throw new Error(updateError.message);

  // Notify the sender
  try {
    const { getProfile } = await import("@/app/actions/profiles");
    const receiverProfile = await getProfile(userId);
    notifyAsync(req.sender_id, "request_accepted", {
      receiverName: receiverProfile?.display_name ?? "Someone",
      intentId: req.intent_id,
      connectionId: req.id,
      receiverId: userId,
    });
  } catch (e) {
    console.error("[acceptConnectionRequest] notify failed:", e);
  }

  try {
    trackServerEvent(userId, "connection_accepted", {
      intentId: req.intent_id,
      senderId: req.sender_id,
    });
  } catch {
    // non-fatal
  }

  revalidatePath("/notifications");
  revalidatePath("/feed");
  revalidatePath(`/profile/${userId}`);
}

/**
 * Decline a pending connection request.
 * Caller must be the request's receiver.
 */
export async function declineConnectionRequest(
  requestId: string
): Promise<void> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data: request, error: fetchError } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !request) {
    throw new Error("Request not found");
  }
  const req = request as ConnectionRequest;
  if (req.receiver_id !== userId) {
    throw new Error("Not authorized");
  }
  if (req.status !== "pending") {
    throw new Error(`Request already ${req.status}`);
  }

  const { error: updateError } = await supabase
    .from("connection_requests")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (updateError) throw new Error(updateError.message);

  try {
    notifyAsync(req.sender_id, "request_declined", {
      intentId: req.intent_id,
      connectionId: req.id,
    });
  } catch (e) {
    console.error("[declineConnectionRequest] notify failed:", e);
  }

  try {
    trackServerEvent(userId, "connection_declined", {
      intentId: req.intent_id,
      senderId: req.sender_id,
    });
  } catch {
    // non-fatal
  }

  revalidatePath("/notifications");
}

/**
 * Find the pending connection_request ID from a notification's payload fields.
 * Notifications store {senderId, intentId}; the receiver is always the current user.
 * Returns null if no matching pending request exists (e.g., already responded).
 */
export async function findPendingRequestFromNotification(params: {
  senderId: string;
  intentId: string;
}): Promise<string | null> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("connection_requests")
    .select("id")
    .eq("sender_id", params.senderId)
    .eq("intent_id", params.intentId)
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as { id: string } | null)?.id ?? null;
}

export interface ConnectionRequestContext {
  sender: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    twitter_handle: string | null;
    twitter_verified: boolean;
    bio: string | null;
    account_type: string | null;
    org_memberships?: Array<{
      role: string;
      organizations: { id: string; name: string; slug: string } | null;
    }>;
  };
  pitch: string;
  intent: { id: string; type: string; content: string };
}

/**
 * Batch-fetch context for connection_request notifications.
 * Takes a list of {senderId, intentId} pairs, returns a Map keyed
 * by "senderId:intentId" with the full sender profile, pitch message,
 * and intent context. Used by the notifications page to enrich the
 * connection request cards.
 */
export async function getConnectionRequestContexts(
  pairs: Array<{ senderId: string; intentId: string }>
): Promise<Record<string, ConnectionRequestContext>> {
  if (pairs.length === 0) return {};

  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const senderIds = Array.from(new Set(pairs.map((p) => p.senderId)));
  const intentIds = Array.from(new Set(pairs.map((p) => p.intentId)));

  const [profilesRes, requestsRes, intentsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url, twitter_handle, twitter_verified, bio, account_type, org_memberships:org_members(role, organizations(id, name, slug))"
      )
      .in("id", senderIds),
    supabase
      .from("connection_requests")
      .select("sender_id, intent_id, pitch_message")
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .in("sender_id", senderIds)
      .in("intent_id", intentIds),
    supabase
      .from("intents")
      .select("id, type, content")
      .in("id", intentIds),
  ]);

  type OrgShape = { id: string; name: string; slug: string };
  type RawProfileRow = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    twitter_handle: string | null;
    twitter_verified: boolean;
    bio: string | null;
    account_type: string | null;
    org_memberships?: Array<{
      role: string;
      organizations: OrgShape | OrgShape[] | null;
    }>;
  };
  type ProfileRow = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    twitter_handle: string | null;
    twitter_verified: boolean;
    bio: string | null;
    account_type: string | null;
    org_memberships?: Array<{
      role: string;
      organizations: OrgShape | null;
    }>;
  };
  type RequestRow = { sender_id: string; intent_id: string; pitch_message: string };
  type IntentRow = { id: string; type: string; content: string };

  // Normalize org_memberships.organizations (Supabase typings can be ambiguous)
  const normalizeProfile = (p: RawProfileRow): ProfileRow => ({
    ...p,
    org_memberships: p.org_memberships?.map((m) => ({
      role: m.role,
      organizations: Array.isArray(m.organizations)
        ? m.organizations[0] ?? null
        : m.organizations,
    })),
  });

  const profileById = new Map<string, ProfileRow>(
    ((profilesRes.data ?? []) as unknown as RawProfileRow[])
      .map(normalizeProfile)
      .map((p) => [p.id, p])
  );
  const intentById = new Map<string, IntentRow>(
    ((intentsRes.data ?? []) as IntentRow[]).map((i) => [i.id, i])
  );
  const pitchByKey = new Map<string, string>(
    ((requestsRes.data ?? []) as RequestRow[]).map((r) => [
      `${r.sender_id}:${r.intent_id}`,
      r.pitch_message,
    ])
  );

  const out: Record<string, ConnectionRequestContext> = {};
  for (const { senderId, intentId } of pairs) {
    const key = `${senderId}:${intentId}`;
    const sender = profileById.get(senderId);
    const intent = intentById.get(intentId);
    const pitch = pitchByKey.get(key);
    if (!sender || !intent || !pitch) continue;
    out[key] = { sender, pitch, intent };
  }

  return out;
}

/**
 * For the caller, return their connection request (if any) for each of
 * the given intent IDs. Keyed by intent_id. Used by the feed to decide
 * which intents show "Connect" vs "Pending" vs "View Contact".
 *
 * The caller may be the sender (they requested connection on someone
 * else's intent) OR the receiver (someone sent a request for their intent).
 */
export async function getMyConnectionsByIntent(
  intentIds: string[]
): Promise<Record<string, { id: string; status: string }>> {
  if (intentIds.length === 0) return {};

  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("connection_requests")
    .select("id, intent_id, status, sender_id, receiver_id, created_at")
    .in("intent_id", intentIds)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    intent_id: string;
    status: string;
    sender_id: string;
    receiver_id: string;
  };

  // Prefer accepted > pending > declined. Multiple rows per intent possible
  // (e.g. user sent request that got declined, then sent another), so we
  // rank and keep the best.
  const rank: Record<string, number> = { accepted: 3, pending: 2, declined: 1 };
  const out: Record<string, { id: string; status: string }> = {};
  for (const r of (data ?? []) as Row[]) {
    const existing = out[r.intent_id];
    if (!existing || (rank[r.status] ?? 0) > (rank[existing.status] ?? 0)) {
      out[r.intent_id] = { id: r.id, status: r.status };
    }
  }
  return out;
}

export async function getAcceptedConnections(): Promise<ConnectionWithIntent[]> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("connection_requests")
    .select(`
      *,
      intents:intent_id (id, type, content, author_id),
      sender_profile:sender_id (id, display_name, avatar_url),
      receiver_profile:receiver_id (id, display_name, avatar_url)
    `)
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ConnectionWithIntent[];
}
