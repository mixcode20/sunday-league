do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'gameweek_players'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%team%'
  loop
    execute format('alter table gameweek_players drop constraint %I', constraint_name);
  end loop;
end $$;

alter table gameweek_players
  add constraint gameweek_players_team_check
  check (team in ('darks', 'whites', 'subs'));
