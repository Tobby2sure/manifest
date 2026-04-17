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
