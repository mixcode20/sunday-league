-- NOT IN USE. Decision on 2026-11-15: keep the 10s poll on / instead.
-- Realtime needs anon SELECT on these tables (see below), which would re-open
-- public read access that rls.sql just closed. The measured benefit is modest
-- at this scale -- mainly fewer "slot already taken" collisions in the race for
-- a last slot -- so it was not judged worth trading the lockdown for.
--
-- The publication statements below have already been applied, which is
-- harmless: changes are published but no client can read them. The client code
-- stays gated behind NEXT_PUBLIC_REALTIME_ENABLED, dynamically imported so it
-- costs nothing while off. To enable later, add the read policies and set the
-- env var.
--
-- Enables push updates for the join page, replacing the 10s poll in
-- GamePageClient. Without this the client still subscribes successfully but
-- never receives events, so polling remains the only refresh path.
--
-- Verified needed on 2026-11-15: a channel on gameweek_players reached
-- SUBSCRIBED but a row update produced no event, confirming the table is not
-- in the publication.
--
-- IMPORTANT: this is necessary but NOT sufficient once RLS is enabled.
-- Realtime authorises postgres_changes as the anon role, so anon needs SELECT
-- on these tables or the channel reaches SUBSCRIBED and silently receives
-- nothing. Verified on 2026-11-15 after rls.sql was applied: publication in
-- place, channel SUBSCRIBED, zero events delivered.
--
-- To finish enabling realtime, also apply the two read policies at the bottom
-- of rls.sql. That re-opens public READ (not write) on these two tables.

alter publication supabase_realtime add table gameweek_players;
alter publication supabase_realtime add table gameweeks;

-- After applying this, set NEXT_PUBLIC_REALTIME_ENABLED=true so the client
-- actually loads the realtime library (it is dynamically imported and gated,
-- so that it costs nothing while this migration is unapplied). The 10s poll in
-- GamePageClient can then be relaxed or removed.
