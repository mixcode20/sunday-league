create extension if not exists "pgcrypto";

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists players_full_name_unique_idx
  on players (lower(trim(first_name) || ' ' || trim(last_name)));

create table if not exists gameweeks (
  id uuid primary key default gen_random_uuid(),
  game_date date not null,
  game_time text default '9:15am',
  location text default 'MH',
  status text not null check (status in ('open', 'locked')),
  darks_score integer check (darks_score >= 0),
  whites_score integer check (whites_score >= 0),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'open' and darks_score is null and whites_score is null)
    or
    (status = 'locked' and darks_score is not null and whites_score is not null)
  )
);

create unique index if not exists gameweeks_one_open_idx
  on gameweeks (status)
  where status = 'open';

create index if not exists gameweeks_date_idx on gameweeks (game_date desc);

create table if not exists gameweek_players (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references gameweeks(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team text not null check (team in ('darks', 'whites', 'subs')),
  position integer not null default 0,
  remove_requested boolean not null default false,
  created_at timestamptz not null default now(),
  unique (gameweek_id, player_id)
);

create unique index if not exists gameweek_players_slot_unique_idx
  on gameweek_players (gameweek_id, position);

create index if not exists gameweek_players_gameweek_team_idx
  on gameweek_players (gameweek_id, team, position);

create index if not exists gameweek_players_player_idx
  on gameweek_players (player_id);
