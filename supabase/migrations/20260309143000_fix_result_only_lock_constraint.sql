do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select
      c.conname,
      pg_get_constraintdef(c.oid) as definition
    from pg_constraint c
    where c.conrelid = 'public.gameweeks'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status = ''locked''%'
      and pg_get_constraintdef(c.oid) ilike '%darks_score is not null%'
      and pg_get_constraintdef(c.oid) ilike '%whites_score is not null%'
      and pg_get_constraintdef(c.oid) not ilike '%result_mode = ''result''%'
  loop
    execute format('alter table public.gameweeks drop constraint %I', constraint_record.conname);
  end loop;
end $$;

alter table public.gameweeks
  drop constraint if exists gameweeks_status_result_consistency_check;

alter table public.gameweeks
  add constraint gameweeks_status_result_consistency_check
  check (
    (
      status = 'open'
      and darks_score is null
      and whites_score is null
      and result_mode is null
      and winner is null
    )
    or
    (
      status = 'locked'
      and (
        (
          result_mode = 'score'
          and darks_score is not null
          and whites_score is not null
          and winner is not null
        )
        or
        (
          result_mode = 'result'
          and darks_score is null
          and whites_score is null
          and winner is not null
        )
      )
    )
  );
