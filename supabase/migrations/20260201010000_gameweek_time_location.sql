alter table gameweeks
  add column if not exists game_time text not null default '9:15am',
  add column if not exists location text not null default 'MH';

alter table gameweeks
  alter column game_time set default '9:15am';

alter table gameweeks
  alter column location set default 'MH';

update gameweeks
  set game_time = '9:15am'
  where game_time is null;

update gameweeks
  set location = 'MH'
  where location is null;

alter table gameweeks
  alter column game_time set not null;

alter table gameweeks
  alter column location set not null;
