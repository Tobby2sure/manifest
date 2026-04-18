-- 011_unique_display_name.sql
--
-- Two data-integrity fixes for profiles:
--
-- 1. Enforce case-insensitive uniqueness on display_name.
--    Before this, two users could share the same name, which broke
--    discoverability and the sender card in connection requests.
--
-- 2. Belt-and-suspenders: enforce case-insensitive uniqueness on
--    twitter_handle for *verified* profiles. twitter_id is already
--    uniquely indexed in 006_hardening.sql, but if a handle exists
--    without an id (legacy rows), this still catches the collision.
--
-- Pre-flight: if duplicates already exist in prod, these index
-- creations will fail. Run this first to find them:
--
--   SELECT LOWER(display_name), array_agg(id) FROM profiles
--   WHERE display_name IS NOT NULL
--   GROUP BY LOWER(display_name) HAVING COUNT(*) > 1;
--
--   SELECT LOWER(twitter_handle), array_agg(id) FROM profiles
--   WHERE twitter_handle IS NOT NULL AND twitter_verified = true
--   GROUP BY LOWER(twitter_handle) HAVING COUNT(*) > 1;
--
-- Resolve any duplicates (rename the newer profile, or null-out the
-- stale twitter_handle) before applying this migration.

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_display_name_ci_unique
  ON public.profiles (LOWER(display_name))
  WHERE display_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_twitter_handle_ci_unique
  ON public.profiles (LOWER(twitter_handle))
  WHERE twitter_handle IS NOT NULL AND twitter_verified = true;
