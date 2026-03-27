"use server";

import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/types/database";

export async function getOrg(slug: string) {
  const supabase = await createClient();

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
  slug: string;
  website?: string;
  logo_url?: string;
  twitter_handle?: string;
  created_by: string;
}) {
  const supabase = await createClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: data.name,
      slug: data.slug,
      website: data.website ?? null,
      logo_url: data.logo_url ?? null,
      twitter_handle: data.twitter_handle ?? null,
      twitter_verified: false,
      created_by: data.created_by,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Add creator as admin
  await supabase.from("org_members").insert({
    org_id: org.id,
    profile_id: data.created_by,
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
