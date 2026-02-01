"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import CreateGameweek from "@/components/CreateGameweek";
import JoinSlots from "@/components/JoinSlots";
import GameweekInfoStrip from "@/components/GameweekInfoStrip";
import type { Gameweek, GameweekPlayer, Player } from "@/lib/types";
import { fetcher, debugPerfEnabled } from "@/lib/swr";

type GameOverviewResponse = {
  openGameweek: Gameweek | null;
  gameweek: Gameweek | null;
  players: Player[];
  entries: GameweekPlayer[];
};

export default function GamePageClient() {
  const routeTimerArmed = useRef(false);
  const routeLabel = "route:game";

  useEffect(() => {
    if (!debugPerfEnabled || routeTimerArmed.current) return;
    console.time(routeLabel);
    routeTimerArmed.current = true;
  }, []);

  const { data, error } = useSWR<GameOverviewResponse>(
    "/api/game/overview",
    fetcher,
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
    }
  );

  useEffect(() => {
    if (!debugPerfEnabled || !data || !routeTimerArmed.current) return;
    console.timeEnd(routeLabel);
    routeTimerArmed.current = false;
  }, [data]);

  const normalizedEntries = data?.entries ?? [];
  const mainCount = useMemo(
    () => normalizedEntries.filter((entry) => entry.position <= 14).length,
    [normalizedEntries]
  );
  const subsCount = useMemo(
    () => normalizedEntries.filter((entry) => entry.position > 14).length,
    [normalizedEntries]
  );

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Failed to load gameweek. Please refresh.
      </div>
    );
  }

  const gameweek = data?.gameweek ?? null;
  const openGameweek = data?.openGameweek ?? null;
  const players = data?.players ?? [];

  return (
    <div className="space-y-4">
      <CreateGameweek />
      <GameweekInfoStrip
        gameweekId={openGameweek?.id ?? null}
        gameDate={gameweek?.game_date ?? null}
        time={gameweek?.game_time ?? null}
        location={gameweek?.location ?? null}
        mainCount={mainCount}
        subsCount={subsCount}
      />

      <section className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {openGameweek ? "Open gameweek" : "Latest result"}
        </p>

        {!data ? (
          <div className="space-y-3">
            <div className="h-10 rounded-xl border border-slate-200 bg-white" />
            <div className="h-48 rounded-2xl border border-dashed border-slate-200 bg-white" />
          </div>
        ) : gameweek && players.length > 0 ? (
          <JoinSlots
            isOpen={Boolean(openGameweek)}
            gameweekId={openGameweek?.id}
            players={players}
            entries={normalizedEntries}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No open gameweek yet. Unlock organiser mode to create one.
          </div>
        )}
      </section>
    </div>
  );
}
