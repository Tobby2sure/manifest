-- 007_affiliates.sql — Org affiliate badge system
-- Admin sends affiliate request → user accepts → org_members row with role='affiliate'

CREATE TABLE IF NOT EXISTS org_affiliate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by text NOT NULL REFERENCES profiles(id),
  status text DEFAULT 'pending',  -- pending | accepted | declined
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(org_id, target_profile_id)
);

ALTER TABLE org_affiliate_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view affiliate requests they're involved in"
  ON org_affiliate_requests FOR SELECT
  USING (
    auth.uid()::text = target_profile_id
    OR auth.uid()::text = requested_by
  );

CREATE INDEX IF NOT EXISTS idx_affiliate_requests_org ON org_affiliate_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_target ON org_affiliate_requests(target_profile_id);
