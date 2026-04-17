"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUserId } from "@/lib/auth";
import { isReservedSlug } from "@/lib/reserved-slugs";
import type { Organization } from "@/lib/types/database";

/**
 * Returns the caller's primary org (admin role preferred).
 * Null if they have no org memberships.
 */
export async function getMyPrimaryOrg(): Promise<{
  id: string;
  slug: string;
  name: string;
  role: string;
} | null> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("org_members")
    .select("role, organizations(id, slug, name)")
    .eq("profile_id", userId)
    .order("role", { ascending: false }) // admin sorts after member/affiliate; reverse manually
    .limit(5);

  if (!data || data.length === 0) return null;

  // Supabase typings for one-to-many joins can be ambiguous — normalize
  type OrgShape = { id: string; slug: string; name: string };
  type Row = { role: string; organizations: OrgShape | OrgShape[] | null };
  const rows = data as unknown as Row[];

  const adminRow = rows.find((r) => r.role === "admin");
  const chosen = adminRow ?? rows[0];
  const org = Array.isArray(chosen.organizations)
    ? chosen.organizations[0]
    : chosen.organizations;
  if (!org) return null;

  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    role: chosen.role,
  };
}

/**
 * Generate a URL-safe slug from a name. Appends a random suffix if taken.
 */
async function generateUniqueSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "org";

  const supabase = createAdminClient();

  // Reserved slugs are never assigned — skip straight to suffixing
  const baseIsUsable = !isReservedSlug(base);

  // Check base
  if (baseIsUsable) {
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", base)
      .maybeSingle();

    if (!existing) return base;
  }

  // Try with a short random suffix
  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${base}-${suffix}`;
    const { data: taken } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!taken) return candidate;
  }

  // Last resort
  return `${base}-${Date.now().toString(36)}`;
}

export async function getOrg(slug: string) {
  const supabase = createAdminClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !org) return null;

  const { data: members } = await supabase
    .from("org_members")
    .select("*, profiles(*)")
    .eq("org_id", org.id);

  const { data: intents } = await supabase
    .from("intents")
    .select("*, profiles!intents_author_id_fkey(*)")
    .eq("org_id", org.id)
    .eq("lifecycle_status", "active")
    .order("created_at", { ascending: false });

  return {
    ...org,
    members: members ?? [],
    intents: intents ?? [],
  };
}

export async function createOrg(data: {
  name: string;
  slug?: string;
  website?: string;
  logo_url?: string;
  twitter_handle?: string;
}): Promise<Organization> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  // If caller supplied an explicit slug, reject reserved names outright
  if (data.slug && isReservedSlug(data.slug)) {
    throw new Error("That org name is reserved — please choose another.");
  }

  const slug = data.slug || (await generateUniqueSlug(data.name));

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: data.name,
      slug,
      website: data.website ?? null,
      logo_url: data.logo_url ?? null,
      twitter_handle: data.twitter_handle ?? null,
      twitter_verified: false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Add creator as admin
  await supabase.from("org_members").insert({
    org_id: org.id,
    profile_id: userId,
    role: "admin",
  });

  return org as Organization;
}

export async function joinOrg(inviteCode: string, userId: string) {
  const { consumeInvite } = await import("@/app/actions/invites");
  return consumeInvite(inviteCode, userId);
}

export async function generateInviteCode(orgId: string, userId: string) {
  const { createInvite } = await import("@/app/actions/invites");
  return createInvite(orgId, userId);
}
