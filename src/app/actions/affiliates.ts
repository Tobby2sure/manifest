"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getSessionUserId } from "@/lib/auth";
import { notifyAsync } from "@/app/actions/notifications";
import type { AffiliateRequest } from "@/lib/types/database";

/** Verify that the current user is an admin of the given org. */
async function assertOrgAdmin(orgId: string, userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (!data || (data as { role: string }).role !== "admin") {
    throw new Error("Not authorized — admin access required");
  }
}

/**
 * Search profiles by display_name or twitter_handle (case-insensitive).
 * Returns up to 10 matches. Used by admins to find affiliate targets.
 */
export async function searchUsersByHandle(
  query: string
): Promise<Array<{ id: string; display_name: string | null; twitter_handle: string | null; avatar_url: string | null; twitter_verified: boolean }>> {
  await getSessionUserId(); // must be authenticated

  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, twitter_handle, avatar_url, twitter_verified")
    .or(`display_name.ilike.%${q}%,twitter_handle.ilike.%${q}%`)
    .limit(10);

  return (data ?? []) as Array<{
    id: string;
    display_name: string | null;
    twitter_handle: string | null;
    avatar_url: string | null;
    twitter_verified: boolean;
  }>;
}

/**
 * Admin sends an affiliate request to a user.
 * Creates org_affiliate_requests row + notifies the target.
 */
export async function sendAffiliateRequest(input: {
  orgId: string;
  targetProfileId: string;
}): Promise<void> {
  const requesterId = await getSessionUserId();
  await assertOrgAdmin(input.orgId, requesterId);

  if (requesterId === input.targetProfileId) {
    throw new Error("You can't send an affiliate request to yourself");
  }

  const supabase = createAdminClient();

  // Check if target is already a member of the org
  const { data: existing } = await supabase
    .from("org_members")
    .select("id, role")
    .eq("org_id", input.orgId)
    .eq("profile_id", input.targetProfileId)
    .maybeSingle();

  if (existing) {
    throw new Error("This user is already a member of the organization");
  }

  // Check for existing pending request
  const { data: existingRequest } = await supabase
    .from("org_affiliate_requests")
    .select("id, status")
    .eq("org_id", input.orgId)
    .eq("target_profile_id", input.targetProfileId)
    .maybeSingle();

  if (existingRequest && (existingRequest as { status: string }).status === "pending") {
    throw new Error("A request is already pending for this user");
  }

  // Upsert (replaces any declined request)
  const { data: request, error } = await supabase
    .from("org_affiliate_requests")
    .upsert(
      {
        org_id: input.orgId,
        target_profile_id: input.targetProfileId,
        requested_by: requesterId,
        status: "pending",
        responded_at: null,
      },
      { onConflict: "org_id,target_profile_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Fetch org name for the notification
  const { data: org } = await supabase
    .from("organizations")
    .select("name, slug")
    .eq("id", input.orgId)
    .single();

  notifyAsync(input.targetProfileId, "affiliate_request", {
    requestId: (request as AffiliateRequest).id,
    orgId: input.orgId,
    orgName: (org as { name: string } | null)?.name ?? "An organization",
    orgSlug: (org as { slug: string } | null)?.slug ?? "",
    requesterId,
  });
}

/**
 * Target user accepts an affiliate request.
 * Creates org_members row with role='affiliate'.
 */
export async function acceptAffiliateRequest(requestId: string): Promise<void> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("org_affiliate_requests")
    .select("id, org_id, target_profile_id, requested_by, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) throw new Error("Request not found");
  const req = request as AffiliateRequest;
  if (req.target_profile_id !== userId) throw new Error("Not authorized");
  if (req.status !== "pending") throw new Error("Request already responded to");

  // Create the org_members row (idempotent — ignore if already exists)
  await supabase
    .from("org_members")
    .upsert(
      {
        org_id: req.org_id,
        profile_id: userId,
        role: "affiliate",
      },
      { onConflict: "org_id,profile_id", ignoreDuplicates: true }
    );

  // Mark request as accepted
  await supabase
    .from("org_affiliate_requests")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", requestId);

  // Fetch user + org for notification back to requester
  const [{ data: profile }, { data: org }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
    supabase.from("organizations").select("name, slug").eq("id", req.org_id).single(),
  ]);

  notifyAsync(req.requested_by, "affiliate_accepted", {
    orgId: req.org_id,
    orgName: (org as { name: string } | null)?.name ?? "",
    orgSlug: (org as { slug: string } | null)?.slug ?? "",
    targetName: (profile as { display_name: string | null } | null)?.display_name ?? "Someone",
    targetId: userId,
  });

  revalidatePath(`/org/${(org as { slug: string } | null)?.slug ?? ""}`);
  revalidatePath("/feed");
}

/**
 * Target user declines an affiliate request.
 */
export async function declineAffiliateRequest(requestId: string): Promise<void> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("org_affiliate_requests")
    .select("id, target_profile_id, requested_by, org_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) throw new Error("Request not found");
  const req = request as AffiliateRequest;
  if (req.target_profile_id !== userId) throw new Error("Not authorized");
  if (req.status !== "pending") throw new Error("Request already responded to");

  await supabase
    .from("org_affiliate_requests")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", requestId);

  notifyAsync(req.requested_by, "affiliate_declined", {
    orgId: req.org_id,
    targetId: userId,
  });
}

/**
 * Admin removes an affiliate from the org.
 */
export async function removeAffiliate(input: {
  orgId: string;
  profileId: string;
}): Promise<void> {
  const requesterId = await getSessionUserId();
  await assertOrgAdmin(input.orgId, requesterId);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", input.orgId)
    .eq("profile_id", input.profileId)
    .eq("role", "affiliate"); // safety: only affiliates

  if (error) throw new Error(error.message);

  // Fetch org slug for revalidate
  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", input.orgId)
    .single();

  revalidatePath(`/org/${(org as { slug: string } | null)?.slug ?? ""}`);
  revalidatePath("/feed");
}

/**
 * Get all affiliate requests sent by an org (admin dashboard).
 */
export async function getOrgAffiliateRequests(orgId: string): Promise<
  Array<
    AffiliateRequest & {
      target: { id: string; display_name: string | null; twitter_handle: string | null; avatar_url: string | null };
    }
  >
> {
  const userId = await getSessionUserId();
  await assertOrgAdmin(orgId, userId);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("org_affiliate_requests")
    .select("*, target:profiles!target_profile_id(id, display_name, twitter_handle, avatar_url)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<
    AffiliateRequest & {
      target: { id: string; display_name: string | null; twitter_handle: string | null; avatar_url: string | null };
    }
  >;
}

/**
 * Cancel a pending affiliate request (admin only).
 */
export async function cancelAffiliateRequest(requestId: string): Promise<void> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("org_affiliate_requests")
    .select("id, org_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) throw new Error("Request not found");
  const req = request as { id: string; org_id: string; status: string };
  await assertOrgAdmin(req.org_id, userId);

  if (req.status !== "pending") {
    throw new Error("Can only cancel pending requests");
  }

  await supabase.from("org_affiliate_requests").delete().eq("id", requestId);
}
