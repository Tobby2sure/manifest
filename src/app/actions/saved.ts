"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { IntentWithAuthor } from "@/lib/types/database";

export async function toggleSave(
  intentId: string,
  userId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  // Check if already saved
  const { data: existing } = await supabase
    .from("saved_intents")
    .select("id")
    .eq("intent_id", intentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_intents").delete().eq("id", existing.id);
    revalidatePath("/feed");
    return false;
  } else {
    const { error } = await supabase.from("saved_intents").insert({
      user_id: userId,
      intent_id: intentId,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/feed");
    return true;
  }
}

export async function getSavedIntents(
  userId: string
): Promise<IntentWithAuthor[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("saved_intents")
    .select("intent_id, intents(*, author:profiles!author_id(*))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Supabase infers intents(*) as any[] without a typed DB; the FK is actually many-to-one
  return ((data ?? []) as unknown as { intents: IntentWithAuthor | null }[])
    .map((row) => row.intents)
    .filter(Boolean) as IntentWithAuthor[];
}

export async function getUserSavedIds(userId: string): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("saved_intents")
    .select("intent_id")
    .eq("user_id", userId);

  if (error) return [];
  return (data ?? []).map((row: { intent_id: string }) => row.intent_id);
}

export async function getSaveCount(intentId: string): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("saved_intents")
    .select("*", { count: "exact", head: true })
    .eq("intent_id", intentId);

  if (error) return 0;
  return count ?? 0;
}
