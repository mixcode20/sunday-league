"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import CreateGameweek from "@/components/CreateGameweek";
import GameweekInfoStrip from "@/components/GameweekInfoStrip";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import TeamsClient from "@/components/TeamsClient";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import type { Gameweek, GameweekPlayer, Player } from "@/lib/types";
import { fetcher, debugPerfEnabled } from "@/lib/swr";
import { buildEntryPositionMap, getSlotCounts } from "@/lib/slots";

type TeamsOverviewResponse = {
  gameweek: Gameweek | null;
  entries: GameweekPlayer[];
  players: Player[];
};

export default function TeamsPageClient() {
  const routeTimerArmed = useRef(false);
  const routeLabel = "route:teams";
  const { isUnlocked } = useOrganiserMode();

  useEffect(() => {
    if (!debugPerfEnabled || routeTimerArmed.current) return;
    console.time(routeLabel);
    routeTimerArmed.current = true;
  }, []);

  const [nonBlockingError, setNonBlockingError] = useState("");

  const formatFetchError = (err: unknown) => {
    if (!err || typeof err !== "object" || !("message" in err)) {
      return "Failed to fetch team data.";
    }
    const message = String((err as { message?: string }).message ?? "");
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error?.message) {
        const details = parsed.error.details ? ` (${parsed.error.details})` : "";
        const code = parsed.error.code ? ` [${parsed.error.code}]` : "";
        return `${parsed.error.message}${code}${details}`;
      }
      if (typeof parsed?.error === "string") {
        return parsed.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    return message || "Failed to fetch team data.";
  };

  const { data, error, mutate } = useSWR<TeamsOverviewResponse>(
    "/api/teams/overview",
    fetcher,
    {
      refreshInterval: 12000,
      revalidateOnFocus: true,
      keepPreviousData: true,
      onError: (err) => {
        setNonBlockingError(formatFetchError(err));
      },
      onSuccess: () => {
        setNonBlockingError("");
      },
    }
  );

  useEffect(() => {
    if (!debugPerfEnabled || !data || !routeTimerArmed.current) return;
    console.timeEnd(routeLabel);
    routeTimerArmed.current = false;
  }, [data]);

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const players = useMemo(() => data?.players ?? [], [data?.players]);
  const { main: mainCount, subs: subsCount } = useMemo(() => {
    const { positionMap } = buildEntryPositionMap(entries);
    return getSlotCounts(positionMap);
  }, [entries]);

  if (error && !data) {
    return (
      <div className="ui-banner ui-banner-danger">
        Failed to load teams. Please refresh.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="ui-skeleton h-16" />
        <div className="ui-skeleton h-24" />
        <div className="ui-skeleton h-64" />
      </div>
    );
  }

  const gameweek = data.gameweek;
  const handleGameweekCreated = async (gameweekId: string) => {
    const refreshed = await mutate();
    return refreshed?.gameweek?.id === gameweekId;
  };

  if (!gameweek) {
    return (
      <div className="space-y-4">
        <GameweekInfoStrip />
        <CreateGameweek players={players} onCreated={handleGameweekCreated} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {nonBlockingError ? (
        <div className="ui-banner ui-banner-warning">
          {nonBlockingError}
        </div>
      ) : null}
      <GameweekInfoStrip
        gameweekId={gameweek.id}
        gameDate={gameweek.game_date}
        time={gameweek.game_time ?? null}
        location={gameweek.location ?? null}
        paymentLink={gameweek.payment_link ?? null}
        mainCount={mainCount}
        subsCount={subsCount}
        onRefresh={() => mutate()}
        gameweek={gameweek}
        players={players}
        footerAction={
          isUnlocked && gameweek.status === "locked" ? (
            <CreateGameweek
              activeGameweekStatus={gameweek.status}
              players={players}
              onCreated={handleGameweekCreated}
            />
          ) : null
        }
      />
      {gameweek.status === "open" ? (
        <TeamsClient gameweek={gameweek} entries={entries} onRefresh={() => mutate()} />
      ) : (
        <TeamsReadOnly entries={entries} />
      )}
    </div>
  );
}
