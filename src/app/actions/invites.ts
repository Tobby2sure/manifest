"use server";

import { createAdminClient } from "@/lib/supabase/admin";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createInvite(orgId: string, createdBy: string) {
  const supabase = createAdminClient();

  const code = generateCode();
  const { data, error } = await supabase
    .from("org_invites")
    .insert({ org_id: orgId, code, created_by: createdBy })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as { id: string; code: string; org_id: string };
}

export async function validateInvite(code: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("org_invites")
    .select("*, organizations(*)")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return null;

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  // Check max uses
  if (data.max_uses !== null && data.use_count >= data.max_uses) return null;

  return data;
}

export async function consumeInvite(code: string, userId: string) {
  const supabase = createAdminClient();

  const invite = await validateInvite(code);
  if (!invite) throw new Error("Invalid or expired invite code");

  // Check if already a member
  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing) throw new Error("Already a member of this organization");

  // Add user to org
  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: invite.org_id,
    profile_id: userId,
    role: "member",
  });

  if (memberError) throw new Error(memberError.message);

  // Increment use count
  await supabase
    .from("org_invites")
    .update({ use_count: invite.use_count + 1 })
    .eq("id", invite.id);

  return invite.organizations;
}
