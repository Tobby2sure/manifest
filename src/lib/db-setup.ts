import { createAdminClient } from "@/lib/supabase/admin";

let _initialized = false;

/**
 * Ensure required tables exist. Runs once per process.
 */
export async function ensureTables() {
  if (_initialized) return;
  _initialized = true;

  const supabase = createAdminClient();

  // Use rpc to run raw SQL — requires a helper function in Supabase,
  // or we can just attempt inserts and let them fail gracefully.
  // Instead, we'll check if the tables exist by querying them.

  // Check webhook_subscriptions
  const { error: wsErr } = await supabase
    .from("webhook_subscriptions")
    .select("id")
    .limit(0);

  if (wsErr?.code === "42P01") {
    console.warn(
      "[db-setup] webhook_subscriptions table does not exist. Please create it via Supabase SQL editor."
    );
  }

  // Check api_keys
  const { error: akErr } = await supabase
    .from("api_keys")
    .select("id")
    .limit(0);

  if (akErr?.code === "42P01") {
    console.warn(
      "[db-setup] api_keys table does not exist. Please create it via Supabase SQL editor."
    );
  }

  // Check events
  const { error: evErr } = await supabase
    .from("events")
    .select("id")
    .limit(0);

  if (evErr?.code === "42P01") {
    console.warn(
      "[db-setup] events table does not exist. Please create it via Supabase SQL editor."
    );
  }

  // Check event_attendees
  const { error: eaErr } = await supabase
    .from("event_attendees")
    .select("id")
    .limit(0);

  if (eaErr?.code === "42P01") {
    console.warn(
      "[db-setup] event_attendees table does not exist. Please create it via Supabase SQL editor."
    );
  }
}
