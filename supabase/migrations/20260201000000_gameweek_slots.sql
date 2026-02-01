alter table gameweek_players
  alter column position drop default;

alter table gameweek_players
  add column if not exists remove_requested boolean not null default false;
