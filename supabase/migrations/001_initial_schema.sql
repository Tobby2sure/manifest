-- profiles
create table profiles (
  id text primary key,
  display_name text,
  bio text,
  twitter_handle text,
  twitter_id text,
  twitter_verified boolean default false,
  wallet_address text,
  telegram_handle text,
  email text,
  account_type text default 'individual',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  website text,
  twitter_handle text,
  twitter_id text,
  twitter_verified boolean default false,
  created_by text references profiles(id),
  created_at timestamptz default now()
);

-- org_members
create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  profile_id text references profiles(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  unique(org_id, profile_id)
);

-- intents
create table intents (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references profiles(id),
  org_id uuid references organizations(id),
  type text not null,
  content text not null,
  ecosystem text,
  sector text,
  priority text default 'Open',
  expires_at timestamptz not null,
  lifecycle_status text default 'active',
  closed_reason text,
  nft_token_id text,
  nft_tx_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- connection_requests
create table connection_requests (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references intents(id) on delete cascade,
  sender_id text not null references profiles(id),
  receiver_id text not null references profiles(id),
  pitch_message text not null,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- saved_intents
create table saved_intents (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles(id) on delete cascade,
  intent_id uuid references intents(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, intent_id)
);

-- intent_interests
create table intent_interests (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles(id) on delete cascade,
  intent_id uuid references intents(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, intent_id)
);

-- intent_views
create table intent_views (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid references intents(id) on delete cascade,
  viewer_id text,
  created_at timestamptz default now()
);

-- notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(id) on delete cascade,
  type text not null,
  payload jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table intents enable row level security;
alter table connection_requests enable row level security;
alter table saved_intents enable row level security;
alter table intent_interests enable row level security;
alter table intent_views enable row level security;
alter table notifications enable row level security;

-- Profiles policies
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid()::text = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid()::text = id);

-- Intents policies
create policy "Intents are viewable by everyone"
  on intents for select using (true);

create policy "Verified users can create intents"
  on intents for insert with check (
    auth.uid()::text = author_id
    and exists (
      select 1 from profiles
      where id = auth.uid()::text
      and twitter_verified = true
    )
  );

-- Connection requests policies
create policy "Users can view their own connection requests"
  on connection_requests for select using (
    auth.uid()::text = sender_id
    or auth.uid()::text = receiver_id
  );

create policy "Authenticated users can create connection requests"
  on connection_requests for insert with check (
    auth.uid()::text = sender_id
  );
