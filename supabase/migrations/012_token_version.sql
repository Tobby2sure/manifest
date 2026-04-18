-- 012_token_version.sql
--
-- Per-user session-revocation counter. Every signed session cookie
-- now carries the token_version it was issued at; the server
-- verifies that matches the profile's current value on every
-- authenticated request.
--
-- Incrementing a user's token_version invalidates *all* of their
-- existing session cookies at once. Used by the "sign out of all
-- other sessions" flow in settings.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
