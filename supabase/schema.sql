-- Complete schema for whatsapp-footy.
--
-- This file is the source of truth for the current state of the database and
-- is safe to run against an empty project to set it up from scratch. Every
-- statement is idempotent, so it is also safe to re-run against an existing
-- project to pick up anything missing.
--
-- supabase/migrations/ remains the incremental history of how the live
-- database reached this state. When adding a change, write a migration AND
-- fold it into this file - the two drifting apart is what caused
-- gameweeks.payment_link to be declared here while missing in production,
-- which silently broke gameweek editing with a 500.
--
-- Verified against the live database on 2026-11-17: the column sets of
-- players, gameweeks, gameweek_players and potm_votes match exactly, and
-- league_player_stats exists.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Names are the identity players pick themselves from, so they must be unique
-- case- and whitespace-insensitively.
create unique index if not exists players_full_name_unique_idx
  on players (lower(trim(first_name) || ' ' || trim(last_name)));

create table if not exists gameweeks (
  id uuid primary key default gen_random_uuid(),
  game_date date not null,
  game_time text not null default '9:15am',
  location text not null default 'MH',
  payment_link text,
  format text not null default '7s' check (format in ('7s', '5s')),
  status text not null check (status in ('open', 'locked')),
  darks_score integer check (darks_score >= 0),
  whites_score integer check (whites_score >= 0),
  result_mode text check (result_mode in ('score', 'result')),
  winner text check (winner in ('darks', 'whites', 'draw')),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  -- An open gameweek has no result. A locked one is either a recorded score
  -- (both scores plus a winner) or a result-only entry (winner, no scores).
  constraint gameweeks_check check (
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
  )
);

-- At most one gameweek may be open at a time; the app relies on this.
create unique index if not exists gameweeks_one_open_idx
  on gameweeks (status)
  where status = 'open';

create index if not exists gameweeks_date_idx on gameweeks (game_date desc);

create table if not exists gameweek_players (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references gameweeks(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team text not null check (team in ('darks', 'whites', 'subs')),
  -- Join-order slot on the sign-up sheet. No default: the app assigns it.
  position integer not null,
  -- Slot within a team once the organiser picks sides. Null until assigned.
  team_position integer,
  remove_requested boolean not null default false,
  created_at timestamptz not null default now(),
  unique (gameweek_id, player_id)
);

create unique index if not exists gameweek_players_slot_unique_idx
  on gameweek_players (gameweek_id, position);

create index if not exists gameweek_players_gameweek_team_idx
  on gameweek_players (gameweek_id, team, position);

create index if not exists gameweek_players_team_position_idx
  on gameweek_players (gameweek_id, team, team_position);

-- Two players cannot hold the same slot in the same team.
create unique index if not exists gameweek_players_team_position_unique_idx
  on gameweek_players (gameweek_id, team, team_position)
  where team_position is not null;

create index if not exists gameweek_players_player_idx
  on gameweek_players (player_id);

create table if not exists potm_votes (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references gameweeks(id) on delete cascade,
  voter_player_id uuid not null references players(id) on delete cascade,
  voted_player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (gameweek_id, voter_player_id)
);

create index if not exists potm_votes_gameweek_idx
  on potm_votes (gameweek_id);

create index if not exists potm_votes_gameweek_voted_player_idx
  on potm_votes (gameweek_id, voted_player_id);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

-- Per-player league totals, aggregated in Postgres. Replaces loading every
-- locked gameweek and every entry row and aggregating in Node per request.
-- Mirrors getGameweekWinner / deriveWinnerFromScores / getGameweekGoals in
-- lib/utils.ts: the winner column wins if set, otherwise it is derived from
-- the scores, and goals count as 0/0 when either score is null.
-- See supabase/migrations/20261116090000_league_player_stats_view.sql.
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

-- security_invoker means the view respects the RLS below rather than running
-- as its owner, so the anon role stays blocked.
alter view public.league_player_stats set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- REQUIRED. The publishable key is NEXT_PUBLIC_, so it ships in the browser
-- bundle and anyone can read it out of devtools. Without RLS that key can read
-- AND write every table directly against the REST API, bypassing app/api and
-- the organiser PIN entirely.
--
-- Enabling RLS with no policies denies the anon role everything, and the app
-- is unaffected: it never queries Supabase from the browser. Every read and
-- write goes through lib/supabase.ts with SUPABASE_SECRET_KEY, and the service
-- role bypasses RLS by design.
--
-- See supabase/migrations/20261115120000_enable_rls.sql for the history and
-- for the read policies that would be needed only if realtime is ever enabled.

alter table public.players enable row level security;
alter table public.gameweeks enable row level security;
alter table public.gameweek_players enable row level security;
alter table public.potm_votes enable row level security;

-- ---------------------------------------------------------------------------
-- Not included deliberately
-- ---------------------------------------------------------------------------
--
-- 20261115130000_realtime_publication.sql adds gameweek_players and gameweeks to the
-- supabase_realtime publication. It has been applied to the live database but
-- is intentionally inert: realtime delivers postgres_changes as the anon role,
-- which RLS above blocks, and the client is gated behind
-- NEXT_PUBLIC_REALTIME_ENABLED. A fresh project does not need it.
