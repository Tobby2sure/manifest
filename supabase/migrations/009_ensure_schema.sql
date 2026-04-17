-- 009_ensure_schema.sql
--
-- Idempotent schema reconciliation. Run this if any previous migration
-- was missed or partially applied. Safe to run multiple times — every
-- statement uses IF NOT EXISTS.
--
-- Triggered by: "Could not find the 'is_founding' column of 'intents'"
-- error when posting an intent. Root cause was migration 004_founding_badge
-- never ran against the deployed Supabase instance.

-- ═══════════════════════════════════════════════════
-- intents columns
-- ═══════════════════════════════════════════════════

-- From 004_founding_badge
ALTER TABLE intents ADD COLUMN IF NOT EXISTS is_founding boolean DEFAULT false;

-- From 006_hardening
ALTER TABLE intents ADD COLUMN IF NOT EXISTS mint_status text DEFAULT 'pending';
ALTER TABLE intents ADD COLUMN IF NOT EXISTS mint_attempts int DEFAULT 0;

-- Backfill founding badges for the first 100 intents (one-time, idempotent:
-- sets is_founding=true only where it's currently false/null).
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM intents
)
UPDATE intents
SET is_founding = true
FROM ranked
WHERE intents.id = ranked.id
  AND ranked.rn <= 100
  AND COALESCE(intents.is_founding, false) = false;

-- ═══════════════════════════════════════════════════
-- profiles columns
-- ═══════════════════════════════════════════════════

-- From 006_hardening
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_nft_tx text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_mint_status text DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_mint_attempts int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_verified_at timestamptz;

-- Partial unique index for twitter_id (nullable, enforces uniqueness only
-- when set).
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_twitter_id_unique
  ON profiles(twitter_id) WHERE twitter_id IS NOT NULL;

-- ═══════════════════════════════════════════════════
-- Tables from 006 (block/report, digest idempotency)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_user_id)
);
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own blocks" ON blocked_users;
CREATE POLICY "Users can manage own blocks"
  ON blocked_users FOR ALL USING (auth.uid()::text = blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users(blocked_user_id);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id text REFERENCES profiles(id),
  reported_intent_id uuid REFERENCES intents(id),
  reported_connection_id uuid REFERENCES connection_requests(id),
  reason text NOT NULL,
  details text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT WITH CHECK (auth.uid()::text = reporter_id);

CREATE TABLE IF NOT EXISTS digest_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  digest_week text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(user_id, digest_week)
);
ALTER TABLE digest_sends ENABLE ROW LEVEL SECURITY;

-- Indexes for mint retry cron
CREATE INDEX IF NOT EXISTS idx_intents_mint_retry
  ON intents(mint_status, mint_attempts)
  WHERE mint_status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_profiles_mint_retry
  ON profiles(onboarding_mint_status, onboarding_mint_attempts)
  WHERE onboarding_mint_status IN ('pending', 'failed');

-- ═══════════════════════════════════════════════════
-- Tables from 007 (affiliates)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS org_affiliate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by text NOT NULL REFERENCES profiles(id),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(org_id, target_profile_id)
);
ALTER TABLE org_affiliate_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view affiliate requests they're involved in" ON org_affiliate_requests;
CREATE POLICY "Users can view affiliate requests they're involved in"
  ON org_affiliate_requests FOR SELECT
  USING (
    auth.uid()::text = target_profile_id
    OR auth.uid()::text = requested_by
  );
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_org ON org_affiliate_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_target ON org_affiliate_requests(target_profile_id);

-- ═══════════════════════════════════════════════════
-- Force PostgREST schema cache reload
-- (Supabase's PostgREST caches the schema; after ALTERs, reload it
-- so the new columns are immediately visible to the API.)
-- ═══════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
