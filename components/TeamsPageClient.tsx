"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import GameweekInfoStrip from "@/components/GameweekInfoStrip";
import ConfirmResultPanel from "@/components/ConfirmResultPanel";
import TeamsClient from "@/components/TeamsClient";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import type { Gameweek, GameweekPlayer } from "@/lib/types";
import { fetcher, debugPerfEnabled } from "@/lib/swr";

type TeamsOverviewResponse = {
  gameweek: Gameweek | null;
  entries: GameweekPlayer[];
};

export default function TeamsPageClient() {
  const routeTimerArmed = useRef(false);
  const routeLabel = "route:teams";

  useEffect(() => {
    if (!debugPerfEnabled || routeTimerArmed.current) return;
    console.time(routeLabel);
    routeTimerArmed.current = true;
  }, []);

  const { data, error } = useSWR<TeamsOverviewResponse>(
    "/api/teams/overview",
    fetcher,
    {
      refreshInterval: 12000,
      revalidateOnFocus: true,
    }
  );

  useEffect(() => {
    if (!debugPerfEnabled || !data || !routeTimerArmed.current) return;
    console.timeEnd(routeLabel);
    routeTimerArmed.current = false;
  }, [data]);

  const entries = data?.entries ?? [];
  const mainCount = useMemo(
    () => entries.filter((entry) => entry.position <= 14).length,
    [entries]
  );
  const subsCount = useMemo(
    () => entries.filter((entry) => entry.position > 14).length,
    [entries]
  );

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Failed to load teams. Please refresh.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <GameweekInfoStrip />
        <div className="h-24 rounded-2xl border border-slate-200 bg-white" />
        <div className="h-64 rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  const gameweek = data.gameweek;

  if (!gameweek) {
    return (
      <div className="space-y-4">
        <GameweekInfoStrip />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No open gameweek yet. Unlock organiser mode to create one.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GameweekInfoStrip
        gameweekId={gameweek.status === "open" ? gameweek.id : null}
        gameDate={gameweek.game_date}
        time={gameweek.game_time ?? null}
        location={gameweek.location ?? null}
        mainCount={mainCount}
        subsCount={subsCount}
      />
      <ConfirmResultPanel gameweek={gameweek} />

      {gameweek.status === "locked" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Final score: Darks {gameweek.darks_score ?? 0} -{" "}
          {gameweek.whites_score ?? 0} · Locked
        </div>
      ) : null}

      {gameweek.status === "open" ? (
        <section className="flex items-start justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Current teams
          </p>
          <p className="text-xs text-slate-400">Pick teams for this week.</p>
        </section>
      ) : null}

      {gameweek.status === "open" ? (
        <TeamsClient gameweek={gameweek} entries={entries} />
      ) : (
        <TeamsReadOnly entries={entries} />
      )}
    </div>
  );
}
