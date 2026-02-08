alter table public.gameweek_players
  add column if not exists team_position integer;

create index if not exists gameweek_players_team_position_idx
  on public.gameweek_players (gameweek_id, team, team_position);

create unique index if not exists gameweek_players_team_position_unique_idx
  on public.gameweek_players (gameweek_id, team, team_position)
  where team_position is not null;
