alter table public.gameweeks
  add column if not exists result_mode text,
  add column if not exists winner text;

alter table public.gameweeks
  drop constraint if exists gameweeks_result_mode_check;

alter table public.gameweeks
  add constraint gameweeks_result_mode_check
  check (result_mode in ('score', 'result'));

alter table public.gameweeks
  drop constraint if exists gameweeks_winner_check;

alter table public.gameweeks
  add constraint gameweeks_winner_check
  check (winner in ('darks', 'whites', 'draw'));

update public.gameweeks
set
  result_mode = 'score',
  winner = case
    when darks_score = whites_score then 'draw'
    when darks_score > whites_score then 'darks'
    else 'whites'
  end
where
  status = 'locked'
  and darks_score is not null
  and whites_score is not null
  and (result_mode is null or winner is null);

do $$
declare
  existing_constraint text;
begin
  select c.conname into existing_constraint
  from pg_constraint c
  where c.conrelid = 'public.gameweeks'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%status = ''open'' and darks_score is null and whites_score is null%'
  limit 1;

  if existing_constraint is not null then
    execute format('alter table public.gameweeks drop constraint %I', existing_constraint);
  end if;
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
