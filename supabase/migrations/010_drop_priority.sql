-- 010_drop_priority.sql
--
-- Remove the priority column from intents.
--
-- The priority feature (Open / Active / Urgent) added surface area without
-- driving partnership formation. We rely on lifecycle_status + is_founding
-- for the signal that priority was trying to convey.
--
-- Safe to run multiple times — IF EXISTS makes it idempotent.

ALTER TABLE public.intents DROP COLUMN IF EXISTS priority;
