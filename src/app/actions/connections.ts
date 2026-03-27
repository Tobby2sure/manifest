"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  ConnectionRequest,
  ConnectionRequestStatus,
} from "@/lib/types/database";

export async function sendConnectionRequest(
  intentId: string,
  senderId: string,
  receiverId: string,
  pitchMessage: string
): Promise<ConnectionRequest> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("connection_requests")
    .insert({
      intent_id: intentId,
      sender_id: senderId,
      receiver_id: receiverId,
      pitch_message: pitchMessage,
      status: "pending" as ConnectionRequestStatus,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Notify the intent owner about the connection request
  try {
    const { createNotification } = await import("@/app/actions/notifications");
    const { getProfile } = await import("@/app/actions/profiles");
    const senderProfile = await getProfile(senderId);
    await createNotification(receiverId, "connection_request", {
      senderName: senderProfile?.display_name ?? "Someone",
      intentId,
      senderId,
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/feed");
  return data as ConnectionRequest;
}

export async function respondToRequest(
  requestId: string,
  status: "accepted" | "declined"
): Promise<ConnectionRequest> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("connection_requests")
    .update({ status })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Notify the sender about the response
  try {
    const { createNotification } = await import("@/app/actions/notifications");
    const { getProfile } = await import("@/app/actions/profiles");
    const req = data as ConnectionRequest;
    const receiverProfile = await getProfile(req.receiver_id);
    const notifType = status === "accepted" ? "request_accepted" : "request_declined";
    await createNotification(req.sender_id, notifType, {
      intentId: req.intent_id,
      receiverName: receiverProfile?.display_name ?? "Someone",
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/feed");
  return data as ConnectionRequest;
}

export async function getConnectionRequests(
  userId: string
): Promise<ConnectionRequest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("receiver_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ConnectionRequest[];
}

export async function getMyRequests(
  userId: string
): Promise<ConnectionRequest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("sender_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ConnectionRequest[];
}

export async function getContactDetails(
  connectionId: string,
  userId: string
): Promise<{ telegram_handle: string | null; email: string | null } | null> {
  const supabase = await createClient();

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

export async function getRequestForIntent(
  intentId: string,
  senderId: string
): Promise<ConnectionRequest | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("intent_id", intentId)
    .eq("sender_id", senderId)
    .maybeSingle();

  if (error) return null;
  return (data as ConnectionRequest) ?? null;
}
