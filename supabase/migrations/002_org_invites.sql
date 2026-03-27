-- M2: Organization invite system
CREATE TABLE org_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_by text REFERENCES profiles(id),
  max_uses int DEFAULT NULL,
  use_count int DEFAULT 0,
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can read invites (needed to validate codes)
CREATE POLICY "Invites are publicly readable" ON org_invites
  FOR SELECT USING (true);

-- Org admins can create invites
CREATE POLICY "Org admins can create invites" ON org_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_invites.org_id
        AND org_members.profile_id = created_by
        AND org_members.role = 'admin'
    )
  );

-- Index for fast code lookup
CREATE INDEX idx_org_invites_code ON org_invites(code);
