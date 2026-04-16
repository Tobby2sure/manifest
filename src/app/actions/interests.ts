"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getSessionUserId } from "@/lib/auth";

export async function toggleInterest(
  intentId: string
): Promise<boolean> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("intent_interests")
    .select("id")
    .eq("intent_id", intentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("intent_interests").delete().eq("id", existing.id);
    revalidatePath("/feed");
    return false;
  } else {
    const { error } = await supabase.from("intent_interests").insert({
      user_id: userId,
      intent_id: intentId,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/feed");
    return true;
  }
}

export async function getIntentInterests(intentId: string): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("intent_interests")
    .select("*", { count: "exact", head: true })
    .eq("intent_id", intentId);

  if (error) return 0;
  return count ?? 0;
}

export async function getUserInterestedIds(): Promise<string[]> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("intent_interests")
    .select("intent_id")
    .eq("user_id", userId);

  if (error) return [];
  return (data ?? []).map((row: { intent_id: string }) => row.intent_id);
}
