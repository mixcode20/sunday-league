"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import CreateGameweek from "@/components/CreateGameweek";
import JoinSlots from "@/components/JoinSlots";
import GameweekInfoStrip from "@/components/GameweekInfoStrip";
import type { Gameweek, GameweekPlayer, Player } from "@/lib/types";
import { fetcher, debugPerfEnabled } from "@/lib/swr";
import { buildEntryPositionMap, getSlotCounts } from "@/lib/slots";

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

  const { data, error, mutate } = useSWR<GameOverviewResponse>(
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

  const normalizedEntries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const { main: mainCount, subs: subsCount } = useMemo(() => {
    const { positionMap } = buildEntryPositionMap(normalizedEntries);
    return getSlotCounts(positionMap);
  }, [normalizedEntries]);

  if (error) {
    return (
      <div className="ui-banner ui-banner-danger">
        Failed to load gameweek. Please refresh.
      </div>
    );
  }

  const gameweek = data?.gameweek ?? null;
  const openGameweek = data?.openGameweek ?? null;
  const players = data?.players ?? [];

  return (
    <div className="space-y-4">
      <CreateGameweek
        activeGameweekStatus={gameweek?.status ?? null}
        players={players}
        onCreated={async (gameweekId) => {
          const refreshed = await mutate();
          return (
            refreshed?.openGameweek?.id === gameweekId ||
            refreshed?.gameweek?.id === gameweekId
          );
        }}
      />
      <GameweekInfoStrip
        gameweekId={gameweek?.id ?? null}
        gameDate={gameweek?.game_date ?? null}
        time={gameweek?.game_time ?? null}
        location={gameweek?.location ?? null}
        mainCount={mainCount}
        subsCount={subsCount}
        onRefresh={() => mutate()}
        showShareButton={Boolean(openGameweek)}
      />

      <section className="flex flex-col gap-4">
        {!data ? (
          <div className="space-y-3">
            <div className="ui-skeleton h-10" />
            <div className="ui-skeleton h-48" />
          </div>
        ) : gameweek && players.length > 0 ? (
          <JoinSlots
            isOpen={Boolean(openGameweek)}
            gameweekId={openGameweek?.id}
            players={players}
            entries={normalizedEntries}
          />
        ) : (
          <div className="ui-empty p-4 text-sm">
            No open gameweek yet. Unlock organiser mode to create one.
          </div>
        )}
      </section>
    </div>
  );
}
