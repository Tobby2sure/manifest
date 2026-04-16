"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { trackServerEvent } from "@/lib/posthog";
import type { Endorsement, EndorsementWithAuthor } from "@/lib/types/database";

export async function createEndorsement(input: {
  intentId: string;
  endorserId: string;
  endorseeId: string;
  content: string;
}): Promise<Endorsement> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("endorsements")
    .insert({
      intent_id: input.intentId,
      endorser_id: input.endorserId,
      endorsee_id: input.endorseeId,
      content: input.content,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  trackServerEvent(input.endorserId, "endorsement_given", {
    endorseeId: input.endorseeId,
    intentId: input.intentId,
  });

  revalidatePath(`/profile/${input.endorseeId}`);
  return data as Endorsement;
}

export async function getEndorsementsForUser(
  userId: string
): Promise<EndorsementWithAuthor[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("endorsements")
    .select("*, endorser:profiles!endorser_id(*)")
    .eq("endorsee_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as EndorsementWithAuthor[];
}

