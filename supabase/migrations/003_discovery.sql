-- M3: Discovery layer — search, notifications, saves, interests, response rate

-- Full text search index on intent content
CREATE INDEX IF NOT EXISTS intents_content_fts
  ON intents USING gin(to_tsvector('english', content));

-- Response rate fields on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS response_rate int DEFAULT NULL;

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Saved intents RLS
ALTER TABLE saved_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved intents" ON saved_intents
  FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Anyone can read save counts" ON saved_intents
  FOR SELECT USING (true);

-- Intent interests RLS
ALTER TABLE intent_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own interests" ON intent_interests
  FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Anyone can read interest counts" ON intent_interests
  FOR SELECT USING (true);
