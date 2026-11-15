-- Enables push updates for the join page, replacing the 10s poll in
-- GamePageClient. Without this the client still subscribes successfully but
-- never receives events, so polling remains the only refresh path.
--
-- Verified needed on 2026-11-15: a channel on gameweek_players reached
-- SUBSCRIBED but a row update produced no event, confirming the table is not
-- in the publication.
--
-- anon already has read access to both tables, so no RLS policy changes are
-- required for events to be delivered to the browser.

alter publication supabase_realtime add table gameweek_players;
alter publication supabase_realtime add table gameweeks;

-- After applying this, set NEXT_PUBLIC_REALTIME_ENABLED=true so the client
-- actually loads the realtime library (it is dynamically imported and gated,
-- so that it costs nothing while this migration is unapplied). The 10s poll in
-- GamePageClient can then be relaxed or removed.
