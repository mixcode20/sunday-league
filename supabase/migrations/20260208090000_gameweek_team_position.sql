alter table gameweek_players
  add column if not exists team_position integer;

create index if not exists gameweek_players_team_position_idx
  on gameweek_players (gameweek_id, team, team_position);
