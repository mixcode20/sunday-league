"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import GameweekInfoStrip from "@/components/GameweekInfoStrip";
import ConfirmResultPanel from "@/components/ConfirmResultPanel";
import TeamsClient from "@/components/TeamsClient";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import type { Gameweek, GameweekPlayer } from "@/lib/types";
import { fetcher, debugPerfEnabled } from "@/lib/swr";
import { buildEntryPositionMap, getSlotCounts } from "@/lib/slots";

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
    }
  );

  useEffect(() => {
    if (!debugPerfEnabled || !data || !routeTimerArmed.current) return;
    console.timeEnd(routeLabel);
    routeTimerArmed.current = false;
  }, [data]);

  useEffect(() => {
    if (data) {
      setNonBlockingError("");
    }
  }, [data]);

  const entries = data?.entries ?? [];
  const { main: mainCount, subs: subsCount } = useMemo(() => {
    const { positionMap } = buildEntryPositionMap(entries);
    return getSlotCounts(positionMap);
  }, [entries]);

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Failed to load teams. Please refresh.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-16 rounded-2xl border border-slate-200 bg-white" />
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
      {nonBlockingError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {nonBlockingError}
        </div>
      ) : null}
      <GameweekInfoStrip
        gameweekId={gameweek.id}
        gameDate={gameweek.game_date}
        time={gameweek.game_time ?? null}
        location={gameweek.location ?? null}
        mainCount={mainCount}
        subsCount={subsCount}
        onRefresh={() => mutate()}
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
        <TeamsClient gameweek={gameweek} entries={entries} onRefresh={() => mutate()} />
      ) : (
        <TeamsReadOnly entries={entries} />
      )}
    </div>
  );
}
