alter table public.gameweeks
  drop constraint if exists gameweeks_check;

alter table public.gameweeks
  drop constraint if exists gameweeks_status_result_consistency_check;

alter table public.gameweeks
  add constraint gameweeks_check
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
