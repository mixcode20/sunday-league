-- Moves the league table aggregation from JavaScript into Postgres.
--
-- /api/league/overview currently loads every locked gameweek and every
-- non-subs entry row, then aggregates in Node on every request (~190ms). That
-- is O(all history) and grows every week the league is played.
--
-- The logic below mirrors lib/utils.ts exactly:
--   getGameweekWinner      -> winner column, else derived from the scores
--   deriveWinnerFromScores -> equal scores draw, else higher score wins
--   getGameweekGoals       -> 0/0 when either score is null
-- and lib/leagueOverview.ts: subs are excluded, and a gameweek only counts
-- once it has a resolvable result.
--
-- After applying, run scripts/verify-league-view.mjs. It compares this view
-- against the existing JavaScript result row by row. Do not switch
-- getLeagueOverview over until that passes - a mismatch would silently change
-- the standings.

create or replace view public.league_player_stats as
with resolved as (
  select
    g.id,
    g.darks_score,
    g.whites_score,
    coalesce(
      g.winner,
      case
        when g.darks_score is null or g.whites_score is null then null
        when g.darks_score = g.whites_score then 'draw'
        when g.darks_score > g.whites_score then 'darks'
        else 'whites'
      end
    ) as result
  from public.gameweeks g
  where g.status = 'locked'
)
select
  gp.player_id,
  count(*)::int as gp,
  count(*) filter (
    where r.darks_score is not null and r.whites_score is not null
  )::int as games_with_score,
  count(*) filter (where r.result <> 'draw' and r.result = gp.team)::int as w,
  count(*) filter (where r.result = 'draw')::int as d,
  count(*) filter (where r.result <> 'draw' and r.result <> gp.team)::int as l,
  coalesce(sum(
    case
      when r.darks_score is null or r.whites_score is null then 0
      when gp.team = 'darks' then r.darks_score
      else r.whites_score
    end
  ), 0)::int as goals_for,
  coalesce(sum(
    case
      when r.darks_score is null or r.whites_score is null then 0
      when gp.team = 'darks' then r.whites_score
      else r.darks_score
    end
  ), 0)::int as goals_against
from public.gameweek_players gp
join resolved r on r.id = gp.gameweek_id
where gp.team <> 'subs'
  and r.result is not null
group by gp.player_id;

-- Views inherit the RLS of their underlying tables under invoker security,
-- which is what we want: the app reads this with the service role, and the
-- anon role stays blocked by the policies in rls.sql.
alter view public.league_player_stats set (security_invoker = on);
