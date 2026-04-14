-- Endorsements: testimonials from partnership_formed deals
create table endorsements (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references intents(id) on delete cascade,
  endorser_id text not null references profiles(id) on delete cascade,
  endorsee_id text not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  unique(intent_id, endorser_id)
);

alter table endorsements enable row level security;

create policy "Endorsements are viewable by everyone"
  on endorsements for select using (true);

create policy "Users can create endorsements for their deals"
  on endorsements for insert with check (
    auth.uid()::text = endorser_id
  );
