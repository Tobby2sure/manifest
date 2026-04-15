-- Add lifecycle tracking to individual connections (instead of per-intent)
alter table connection_requests
  add column lifecycle_status text default 'active';
