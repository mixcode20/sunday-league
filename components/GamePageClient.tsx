"use client";

import dynamic from "next/dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
const CreateGameweek = dynamic(() => import("@/components/CreateGameweek"), {
  ssr: false,
});
import JoinSlots from "@/components/JoinSlots";
import GameweekInfoStrip from "@/components/GameweekInfoStrip";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { GameLive, Player } from "@/lib/types";
import { fetcher, debugPerfEnabled } from "@/lib/swr";
import { useGameweekRealtime } from "@/lib/useGameweekRealtime";
import { buildEntryPositionMap, capacityForFormat, getSlotCounts } from "@/lib/slots";

export const ROSTER_KEY = "/api/players/roster";

export default function GamePageClient({
  fallback,
}: {
  fallback?: GameLive;
}) {
  const routeTimerArmed = useRef(false);
  const routeLabel = "route:game";
  const { isUnlocked } = useOrganiserMode();

  useEffect(() => {
    if (!debugPerfEnabled || routeTimerArmed.current) return;
    console.time(routeLabel);
    routeTimerArmed.current = true;
  }, []);

  const { data, error, mutate } = useSWR<GameLive>(
    "/api/game/overview",
    fetcher,
    {
      fallbackData: fallback,
      // Server-rendered above; skip the duplicate fetch on mount.
      revalidateOnMount: false,
      refreshInterval: 10000,
      revalidateOnFocus: true,
    }
  );

  // The roster (9.7KB, 61 players) exists only so someone can pick a name.
  // Most visitors read the slots and leave, so it is not shipped with the page
  // or fetched on mount - only once intent toward a slot is detected, or when
  // organiser mode unlocks and CreateGameweek needs it.
  const [rosterNeeded, setRosterNeeded] = useState(false);
  const requestRoster = useCallback(() => setRosterNeeded(true), []);

  const { data: rosterData } = useSWR<{ players: Player[] }>(
    rosterNeeded || isUnlocked ? ROSTER_KEY : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!debugPerfEnabled || !data || !routeTimerArmed.current) return;
    console.timeEnd(routeLabel);
    routeTimerArmed.current = false;
  }, [data]);

  // Slots fill in near-instantly once the realtime migration and its anon read
  // policies are applied; refreshInterval above stays as the fallback until then.
  const revalidate = useCallback(() => {
    void mutate();
  }, [mutate]);
  useGameweekRealtime(revalidate);

  const normalizedEntries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const gameFormat = data?.gameweek?.format ?? null;
  const { main: mainCount, subs: subsCount } = useMemo(() => {
    const { positionMap } = buildEntryPositionMap(normalizedEntries);
    return getSlotCounts(positionMap, capacityForFormat(gameFormat));
  }, [normalizedEntries, gameFormat]);

  if (error) {
    return (
      <div className="ui-banner ui-banner-danger">
        Failed to load gameweek. Please refresh.
      </div>
    );
  }

  const gameweek = data?.gameweek ?? null;
  const openGameweek = data?.openGameweek ?? null;
  const players = rosterData?.players ?? [];

  return (
    <div className="space-y-4">
      <GameweekInfoStrip
        gameweekId={gameweek?.id ?? null}
        gameDate={gameweek?.game_date ?? null}
        time={gameweek?.game_time ?? null}
        location={gameweek?.location ?? null}
        paymentLink={gameweek?.payment_link ?? null}
        mainCount={mainCount}
        subsCount={subsCount}
        entries={normalizedEntries}
        onRefresh={() => mutate()}
        showShareButton={Boolean(openGameweek)}
        gameweek={gameweek}
        players={players}
        footerAction={
          isUnlocked && gameweek?.status === "locked" ? (
            <CreateGameweek
              activeGameweekStatus={gameweek.status}
              players={players}
              onCreated={async (gameweekId) => {
                const refreshed = await mutate();
                return (
                  refreshed?.openGameweek?.id === gameweekId ||
                  refreshed?.gameweek?.id === gameweekId
                );
              }}
            />
          ) : null
        }
      />

      <section className="flex flex-col gap-4">
        {!data ? (
          <div className="space-y-3">
            <div className="ui-skeleton h-10" />
            <div className="ui-skeleton h-48" />
          </div>
        ) : gameweek ? (
          <JoinSlots
            onRosterIntent={requestRoster}
            rosterLoaded={Boolean(rosterData)}
            isOpen={Boolean(openGameweek)}
            gameweekId={openGameweek?.id}
            gameDate={openGameweek?.game_date ?? null}
            players={players}
            entries={normalizedEntries}
            format={openGameweek?.format ?? null}
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
