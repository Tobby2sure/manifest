-- 006_hardening.sql — Pre-launch hardening: mint observability, block/report, twitter uniqueness, digest idempotency

-- ═══════════════════════════════════════════════════
-- NFT Mint Observability (Items 2 + 8)
-- ═══════════════════════════════════════════════════

-- Intent mint tracking
ALTER TABLE intents ADD COLUMN IF NOT EXISTS mint_status text DEFAULT 'pending';
ALTER TABLE intents ADD COLUMN IF NOT EXISTS mint_attempts int DEFAULT 0;

-- Profile onboarding mint tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_nft_tx text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_mint_status text DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_mint_attempts int DEFAULT 0;

-- Backfill existing intents
UPDATE intents SET mint_status = 'success', mint_attempts = 1 WHERE nft_tx_hash IS NOT NULL AND mint_status = 'pending';
UPDATE intents SET mint_status = 'skipped', mint_attempts = 0 WHERE nft_tx_hash IS NULL AND nft_token_id IS NULL AND mint_status = 'pending';

-- Backfill existing profiles
UPDATE profiles SET onboarding_mint_status = 'success', onboarding_mint_attempts = 1 WHERE onboarding_nft_tx IS NOT NULL AND onboarding_mint_status = 'pending';
UPDATE profiles SET onboarding_mint_status = 'skipped', onboarding_mint_attempts = 0 WHERE wallet_address IS NULL AND onboarding_mint_status = 'pending';

-- Indexes for retry cron performance
CREATE INDEX IF NOT EXISTS idx_intents_mint_retry
  ON intents(mint_status, mint_attempts)
  WHERE mint_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_profiles_mint_retry
  ON profiles(onboarding_mint_status, onboarding_mint_attempts)
  WHERE onboarding_mint_status IN ('pending', 'failed');


-- ═══════════════════════════════════════════════════
-- Block + Report (Item 4)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_user_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blocks"
  ON blocked_users FOR ALL
  USING (auth.uid()::text = blocker_id);

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

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid()::text = reporter_id);


-- ═══════════════════════════════════════════════════
-- Twitter Verification Uniqueness (Item 6)
-- ═══════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_verified_at timestamptz;

-- Backfill verified_at for existing verified users
UPDATE profiles SET twitter_verified_at = updated_at
  WHERE twitter_verified = true AND twitter_verified_at IS NULL;

-- Deduplicate before creating unique index: if duplicate twitter_ids exist,
-- keep the earliest profile and NULL out the rest
WITH dupes AS (
  SELECT id, twitter_id,
    ROW_NUMBER() OVER (PARTITION BY twitter_id ORDER BY created_at ASC) AS rn
  FROM profiles
  WHERE twitter_id IS NOT NULL
)
UPDATE profiles SET twitter_id = NULL, twitter_verified = false, twitter_verified_at = NULL
  WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- Partial unique index — allows multiple NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_twitter_id_unique
  ON profiles(twitter_id) WHERE twitter_id IS NOT NULL;


-- ═══════════════════════════════════════════════════
-- Digest Idempotency (Item 7)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS digest_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  digest_week text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(user_id, digest_week)
);

ALTER TABLE digest_sends ENABLE ROW LEVEL SECURITY;
