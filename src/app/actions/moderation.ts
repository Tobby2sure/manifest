"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function blockUser(
  blockerId: string,
  blockedUserId: string
): Promise<void> {
  if (blockerId === blockedUserId) {
    throw new Error("Cannot block yourself");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("blocked_users")
    .upsert(
      { blocker_id: blockerId, blocked_user_id: blockedUserId },
      { onConflict: "blocker_id,blocked_user_id" }
    );

  if (error) throw new Error(error.message);
  revalidatePath("/feed");
}

export async function unblockUser(
  blockerId: string,
  blockedUserId: string
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_user_id", blockedUserId);

  if (error) throw new Error(error.message);
  revalidatePath("/feed");
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("blocked_users")
    .select("blocked_user_id")
    .eq("blocker_id", userId);

  return (data ?? []).map((r: { blocked_user_id: string }) => r.blocked_user_id);
}

/**
 * Check if either user has blocked the other (bidirectional).
 */
export async function isBlocked(
  userId1: string,
  userId2: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("blocked_users")
    .select("id")
    .or(
      `and(blocker_id.eq.${userId1},blocked_user_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_user_id.eq.${userId1})`
    )
    .limit(1);

  return (data ?? []).length > 0;
}

export async function reportUser(input: {
  reporterId: string;
  reportedUserId?: string;
  reportedIntentId?: string;
  reportedConnectionId?: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId ?? null,
    reported_intent_id: input.reportedIntentId ?? null,
    reported_connection_id: input.reportedConnectionId ?? null,
    reason: input.reason,
    details: input.details ?? null,
  });

  if (error) throw new Error(error.message);
}
