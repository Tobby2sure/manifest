"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Intent,
  IntentWithAuthor,
  IntentType,
  Ecosystem,
  Sector,
  IntentPriority,
  IntentLifecycleStatus,
  IntentClosedReason,
} from "@/lib/types/database";

export interface IntentFilters {
  type?: IntentType;
  ecosystem?: Ecosystem;
  sector?: Sector;
  priority?: IntentPriority;
  page?: number;
  pageSize?: number;
}

export async function getIntents(
  filters?: IntentFilters
): Promise<IntentWithAuthor[]> {
  const supabase = await createClient();
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("intents")
    .select("*, author:profiles!author_id(*)")
    .eq("lifecycle_status", "active" as IntentLifecycleStatus)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.ecosystem) {
    query = query.eq("ecosystem", filters.ecosystem);
  }
  if (filters?.sector) {
    query = query.eq("sector", filters.sector);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as IntentWithAuthor[];
}

export async function getIntent(id: string): Promise<IntentWithAuthor | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("intents")
    .select("*, author:profiles!author_id(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as unknown as IntentWithAuthor;
}

export async function createIntent(input: {
  authorId: string;
  orgId?: string;
  type: IntentType;
  content: string;
  ecosystem: Ecosystem | null;
  sector: Sector | null;
  priority: IntentPriority;
  durationDays: number;
}): Promise<Intent> {
  const supabase = await createClient();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.durationDays);

  const { data, error } = await supabase
    .from("intents")
    .insert({
      author_id: input.authorId,
      org_id: input.orgId ?? null,
      type: input.type,
      content: input.content,
      ecosystem: input.ecosystem,
      sector: input.sector,
      priority: input.priority,
      expires_at: expiresAt.toISOString(),
      lifecycle_status: "active" as IntentLifecycleStatus,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // NFT mint stub — will be implemented in a future milestone
  // mintProofOfIntentNFT(data.id, input.authorId);

  revalidatePath("/feed");
  return data as Intent;
}

export async function closeIntent(
  id: string,
  reason: IntentClosedReason
): Promise<Intent> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("intents")
    .update({
      lifecycle_status: "closed" as IntentLifecycleStatus,
      closed_reason: reason,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/feed");
  return data as Intent;
}

export async function getIntentsByAuthor(
  authorId: string
): Promise<IntentWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("intents")
    .select("*, author:profiles!author_id(*)")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as IntentWithAuthor[];
}
