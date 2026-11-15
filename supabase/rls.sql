-- Row Level Security: currently DISABLED on every table, which means the
-- publishable ("anon") key has full read AND write access.
--
-- That key is public by design: it is NEXT_PUBLIC_, so it ships in the browser
-- bundle and anyone can read it out of devtools. With RLS off, it is enough to
-- insert, update or delete any row directly against the Supabase REST API,
-- bypassing every route in app/api and the organiser PIN entirely.
--
-- Verified on 2026-11-15 using only the publishable key:
--   update gameweek_players  -> ALLOWED
--   insert players           -> ALLOWED
--   delete potm_votes        -> ALLOWED
--
-- Enabling RLS with no policies denies the anon key everything. The app is
-- unaffected: it never queries Supabase from the browser. Every read and write
-- goes through lib/supabase.ts with SUPABASE_SECRET_KEY, and the service role
-- bypasses RLS by design.

alter table public.players enable row level security;
alter table public.gameweeks enable row level security;
alter table public.gameweek_players enable row level security;
alter table public.potm_votes enable row level security;

-- Only needed if supabase/realtime.sql is applied as well. Realtime delivers
-- postgres_changes to the browser as the anon role, so it needs read access to
-- the tables it streams. Read-only: writes stay denied.
--
-- alter publication supabase_realtime add table gameweek_players;  -- see realtime.sql
--
-- create policy "anon can read gameweeks"
--   on public.gameweeks for select to anon using (true);
-- create policy "anon can read gameweek entries"
--   on public.gameweek_players for select to anon using (true);
