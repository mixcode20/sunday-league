create table if not exists potm_votes (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references gameweeks(id) on delete cascade,
  voter_player_id uuid not null references players(id) on delete cascade,
  voted_player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (gameweek_id, voter_player_id)
);

create index if not exists potm_votes_gameweek_idx
  on potm_votes (gameweek_id);

create index if not exists potm_votes_gameweek_voted_player_idx
  on potm_votes (gameweek_id, voted_player_id);
