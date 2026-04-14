-- Add founding badge flag for first 100 intents
alter table intents add column is_founding boolean default false;

-- Mark existing intents as founding if they're in the first 100
-- (This handles the case where some intents already exist before this migration)
with ranked as (
  select id, row_number() over (order by created_at asc) as rn
  from intents
)
update intents
set is_founding = true
from ranked
where intents.id = ranked.id and ranked.rn <= 100;
