"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { notifyAsync } from "@/app/actions/notifications";
import type {
  ConnectionRequest,
  ConnectionWithIntent,
  IntentLifecycleStatus,
} from "@/lib/types/database";

export async function sendConnectionRequest(
  intentId: string,
  senderId: string,
  receiverId: string,
  pitchMessage: string
): Promise<ConnectionRequest> {
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
    throw new Error(error.message);
  }

  const { getProfile } = await import("@/app/actions/profiles");
  const senderProfile = await getProfile(senderId);
  notifyAsync(receiverId, "connection_request", {
    senderName: senderProfile?.display_name ?? "Someone",
    intentId,
    senderId,
  });

  revalidatePath("/feed");
  return data as ConnectionRequest;
}

export async function getContactDetails(
  connectionId: string,
  userId: string
): Promise<{ telegram_handle: string | null; email: string | null } | null> {
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
  newStatus: IntentLifecycleStatus,
  userId: string
): Promise<void> {
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

export async function getAcceptedConnections(
  userId: string
): Promise<ConnectionWithIntent[]> {
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
