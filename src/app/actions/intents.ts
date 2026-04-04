"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { deliverIntentWebhooks } from "@/lib/webhooks";
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

export type IntentSort = "newest" | "ending_soon";

export interface IntentFilters {
  type?: IntentType;
  ecosystem?: Ecosystem;
  sector?: Sector;
  priority?: IntentPriority;
  search?: string;
  sort?: IntentSort;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getIntents(
  filters?: IntentFilters
): Promise<{ intents: IntentWithAuthor[]; total: number }> {
  const supabase = createAdminClient();
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const activeOnly = filters?.activeOnly !== false;

  let query = supabase
    .from("intents")
    .select("*, author:profiles!author_id(*, org_memberships:org_members(role, organizations(*)))", { count: "exact" })
    .range(from, to);

  if (activeOnly) {
    query = query
      .eq("lifecycle_status", "active" as IntentLifecycleStatus)
      .gte("expires_at", new Date().toISOString());
  }

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
  if (filters?.search) {
    query = query.textSearch("content", filters.search, { type: "websearch" });
  }

  // Sort
  const sort = filters?.sort ?? "newest";
  if (sort === "ending_soon") {
    query = query.order("expires_at", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    intents: (data ?? []) as unknown as IntentWithAuthor[],
    total: count ?? 0,
  };
}

export async function getIntent(id: string): Promise<IntentWithAuthor | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("intents")
    .select("*, author:profiles!author_id(*, org_memberships:org_members(role, organizations(*)))")
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
  const supabase = createAdminClient();

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

  // Fire webhooks (fire-and-forget)
  deliverIntentWebhooks(data as Intent);

  revalidatePath("/feed");
  return data as Intent;
}

export async function closeIntent(
  id: string,
  reason: IntentClosedReason
): Promise<Intent> {
  const supabase = createAdminClient();

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
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("intents")
    .select("*, author:profiles!author_id(*, org_memberships:org_members(role, organizations(*)))")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as IntentWithAuthor[];
}

export async function updateIntentLifecycle(
  intentId: string,
  status: IntentLifecycleStatus,
  userId: string
): Promise<Intent> {
  const supabase = createAdminClient();

  // Verify the user is the author or a connected party
  const { data: intent } = await supabase
    .from("intents")
    .select("author_id")
    .eq("id", intentId)
    .single();

  if (!intent || intent.author_id !== userId) {
    throw new Error("Not authorized to update this intent");
  }

  const { data, error } = await supabase
    .from("intents")
    .update({ lifecycle_status: status, updated_at: new Date().toISOString() })
    .eq("id", intentId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/feed");
  revalidatePath(`/profile/${userId}`);
  return data as Intent;
}
