"use client";

import { useEffect } from "react";

// Push updates for the join page, replacing the 10s poll.
//
// Two deliberate constraints:
//  1. supabase-js is imported dynamically. A static import pulls ~63KB over
//     the wire into the initial bundle (measured: 182.9KB -> 245.8KB on /),
//     which is far more than this feature is worth on a phone.
//  2. It is off unless NEXT_PUBLIC_REALTIME_ENABLED === "true", because the
//     tables are not in the supabase_realtime publication yet. Until they are,
//     a subscription reaches SUBSCRIBED but never receives an event, so it
//     would download the client for nothing.
//
// To turn on: apply supabase/realtime.sql, then set the env var.
export const useGameweekRealtime = (onChange: () => void) => {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_REALTIME_ENABLED !== "true") return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      if (cancelled) return;

      const supabase = createClient(url, key, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 2 } },
      });
      const channel = supabase
        .channel("gameweek-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "gameweek_players" },
          () => onChange()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "gameweeks" },
          () => onChange()
        )
        .subscribe();

      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [onChange]);
};
