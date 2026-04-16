"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Notification } from "@/lib/types/database";

export async function getNotifications(
  userId: string
): Promise<Notification[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Notification[];
}

export async function markRead(notificationId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createNotification(
  userId: string,
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    payload,
    read: false,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) return 0;
  return count ?? 0;
}

export async function notifyAsync(
  userId: string,
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await createNotification(userId, type, payload);
  } catch {
    // Non-fatal
  }
}
