"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type {
  IntentLifecycleStatus,
  Organization,
} from "@/lib/types/database";

export async function submitIntentForOrgApproval(
  intentId: string,
  orgId: string,
  submittedBy: string
) {
  const supabase = createAdminClient();

  const { error: reqError } = await supabase
    .from("org_intent_requests")
    .insert({
      intent_id: intentId,
      org_id: orgId,
      submitted_by: submittedBy,
      status: "pending",
    });

  if (reqError) throw new Error(reqError.message);

  const { error: updateError } = await supabase
    .from("intents")
    .update({
      lifecycle_status: "pending_org_approval" as IntentLifecycleStatus,
    })
    .eq("id", intentId);

  if (updateError) throw new Error(updateError.message);

  // Notify org admins
  try {
    const { createNotification } = await import("@/app/actions/notifications");
    const { getProfile } = await import("@/app/actions/profiles");

    const { data: admins } = await supabase
      .from("org_members")
      .select("profile_id")
      .eq("org_id", orgId)
      .eq("role", "admin");

    const submitter = await getProfile(submittedBy);

    for (const admin of admins ?? []) {
      await createNotification(admin.profile_id, "org_approval_request", {
        intentId,
        orgId,
        submitterName: submitter?.display_name ?? "Someone",
      });
    }
  } catch {
    // Non-fatal
  }

  revalidatePath("/feed");
}

export async function getPendingOrgApprovals(orgId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("org_intent_requests")
    .select(
      "*, intent:intents(*, author:profiles!author_id(*)), submitter:profiles!org_intent_requests_submitted_by_fkey(*)"
    )
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function approveOrgIntent(requestId: string, adminId: string) {
  const supabase = createAdminClient();

  const { data: request, error: fetchErr } = await supabase
    .from("org_intent_requests")
    .select("*, intent:intents(*)")
    .eq("id", requestId)
    .single();

  if (fetchErr || !request) throw new Error("Request not found");

  const { error: updateReq } = await supabase
    .from("org_intent_requests")
    .update({
      status: "approved",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateReq) throw new Error(updateReq.message);

  const { error: updateIntent } = await supabase
    .from("intents")
    .update({
      lifecycle_status: "active" as IntentLifecycleStatus,
    })
    .eq("id", request.intent_id);

  if (updateIntent) throw new Error(updateIntent.message);

  // Notify submitter
  try {
    const { createNotification } = await import("@/app/actions/notifications");
    await createNotification(request.submitted_by, "org_intent_approved", {
      intentId: request.intent_id,
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/feed");
}

export async function rejectOrgIntent(
  requestId: string,
  adminId: string,
  reason: string
) {
  const supabase = createAdminClient();

  const { data: request, error: fetchErr } = await supabase
    .from("org_intent_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !request) throw new Error("Request not found");

  const { error: updateReq } = await supabase
    .from("org_intent_requests")
    .update({
      status: "rejected",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", requestId);

  if (updateReq) throw new Error(updateReq.message);

  const { error: updateIntent } = await supabase
    .from("intents")
    .update({
      lifecycle_status: "closed" as IntentLifecycleStatus,
    })
    .eq("id", request.intent_id);

  if (updateIntent) throw new Error(updateIntent.message);

  // Notify submitter
  try {
    const { createNotification } = await import("@/app/actions/notifications");
    await createNotification(request.submitted_by, "org_intent_rejected", {
      intentId: request.intent_id,
      reason,
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/feed");
}

export async function getUserOrgs(
  userId: string
): Promise<Array<{ role: string; organizations: Organization }>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("org_members")
    .select("role, organizations(*)")
    .eq("profile_id", userId);

  if (error) throw new Error(error.message);

  return (data ?? []) as unknown as Array<{
    role: string;
    organizations: Organization;
  }>;
}
