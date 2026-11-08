-- Gameweeks can be played 7-a-side (14 main slots) or 5-a-side (10 main slots).
alter table gameweeks
  add column if not exists format text not null default '7s';

alter table gameweeks
  drop constraint if exists gameweeks_format_check;

alter table gameweeks
  add constraint gameweeks_format_check check (format in ('7s', '5s'));
