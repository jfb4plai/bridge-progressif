-- Bridge Progressif — tables à ajouter au projet Supabase existant (dfoaumjleqtxjeaplnna)
-- NE PAS recréer profiles ni les triggers existants

-- Profil bridge (extension du profil existant)
create table if not exists bridge_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  display_name text,
  lang        text not null default 'fr', -- 'fr' | 'en'
  system      text not null default 'sf', -- 'sf' (Standard Français) | 'saf'
  level       int  not null default 1,    -- 1..5
  xp          int  not null default 0,
  created_at  timestamptz default now()
);

alter table bridge_profiles enable row level security;
create policy "own profile" on bridge_profiles
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Donnes (pré-construites slug + générées uuid)
create table if not exists bridge_deals (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique,               -- null si générée aléatoirement
  source      text not null default 'generated', -- 'preset' | 'generated'
  level       int  not null default 1,
  title_fr    text,
  title_en    text,
  data        jsonb not null,            -- {north,south,east,west,dealer,vul,optimal_contract,...}
  concepts    text[] default '{}',       -- ['finesse','communication',...]
  created_at  timestamptz default now()
);

-- Sessions de jeu
create table if not exists bridge_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  deal_id       uuid references bridge_deals(id),
  mode          text not null,           -- 'bidding' | 'play' | 'full'
  system        text not null default 'sf',
  bids_played   jsonb default '[]',      -- [{seat,bid,is_hint}]
  cards_played  jsonb default '[]',      -- [{trick,seat,card,is_hint}]
  hints_used    int  not null default 0,
  xp_earned     int  not null default 0,
  result        jsonb,                   -- {contract,made,tricks,score}
  completed_at  timestamptz,
  created_at    timestamptz default now()
);

alter table bridge_sessions enable row level security;
create policy "own sessions" on bridge_sessions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Maîtrise des concepts par utilisateur
create table if not exists bridge_user_concepts (
  user_id      uuid references auth.users(id) on delete cascade not null,
  concept_slug text not null,
  seen_count   int  not null default 0,
  mastered     bool not null default false,
  last_seen    timestamptz default now(),
  primary key  (user_id, concept_slug)
);

alter table bridge_user_concepts enable row level security;
create policy "own concepts" on bridge_user_concepts
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index utiles
create index if not exists bridge_sessions_user_idx on bridge_sessions(user_id);
create index if not exists bridge_deals_level_idx   on bridge_deals(level, source);
