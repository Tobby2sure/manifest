"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import type { Report } from "@/lib/types/database";

/** Minimal joined report shape for the moderation UI. */
export interface ReportWithContext extends Report {
  reporter: { id: string; display_name: string | null; twitter_handle: string | null } | null;
  reported_user: { id: string; display_name: string | null; twitter_handle: string | null } | null;
  reported_intent: { id: string; content: string; type: string } | null;
}

/**
 * List all reports. Filter by status (default: open).
 * Admin-only.
 */
export async function listReports(
  status: "open" | "resolved" | "dismissed" = "open"
): Promise<ReportWithContext[]> {
  await assertAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select(
      `*,
      reporter:profiles!reporter_id(id, display_name, twitter_handle),
      reported_user:profiles!reported_user_id(id, display_name, twitter_handle),
      reported_intent:intents(id, content, type)`
    )
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ReportWithContext[];
}

/** Mark a report as resolved or dismissed. Admin-only. */
export async function updateReportStatus(
  reportId: string,
  status: "resolved" | "dismissed"
): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", reportId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/reports");
}
