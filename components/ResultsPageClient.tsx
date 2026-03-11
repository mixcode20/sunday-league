"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR, { preload } from "swr";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import type { Gameweek, GameweekPlayer } from "@/lib/types";
import { formatGameweekDate, getGameweekWinner } from "@/lib/utils";
import { fetcher, debugPerfEnabled } from "@/lib/swr";

type ResultsOverviewResponse = {
  currentGameweek: Gameweek | null;
  entries: GameweekPlayer[];
  olderId: string | null;
  newerId: string | null;
};

const winnerPin = (winner: Gameweek["winner"], team: "darks" | "whites") => {
  if (winner !== team) {
    return "absolute bottom-0 left-0 inline-flex items-center rounded-full border border-transparent bg-transparent px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-transparent shadow-none";
  }

  if (team === "darks") {
    return "absolute bottom-0 left-0 inline-flex items-center rounded-full border border-[rgba(15,61,52,0.18)] bg-[var(--color-primary-dark)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_18px_rgba(15,61,52,0.14)]";
  }

  return "absolute bottom-0 left-0 inline-flex items-center rounded-full border border-[rgba(31,122,99,0.18)] bg-white px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-dark)] shadow-[0_8px_18px_rgba(15,61,52,0.08)]";
};

const buildSummary = (gameweek: Gameweek) => {
  const hasScore =
    typeof gameweek.darks_score === "number" &&
    typeof gameweek.whites_score === "number";
  const winner = getGameweekWinner(gameweek);

  if (hasScore) {
    return {
      hasScore: true,
      darksValue: String(gameweek.darks_score),
      whitesValue: String(gameweek.whites_score),
      winner,
    };
  }

  return {
    hasScore: false,
    darksValue: null,
    whitesValue: null,
    winner,
  };
};

export default function ResultsPageClient() {
  const searchParams = useSearchParams();
  const gameweekId = searchParams.get("gameweekId");
  const routeTimerArmed = useRef(false);
  const routeLabel = "route:results";
  const previousGameweekId = useRef<string | null>(gameweekId);

  useEffect(() => {
    if (!debugPerfEnabled || routeTimerArmed.current) return;
    console.time(routeLabel);
    routeTimerArmed.current = true;
  }, []);

  useEffect(() => {
    if (!debugPerfEnabled) return;
    if (previousGameweekId.current === gameweekId) return;
    console.time(routeLabel);
    routeTimerArmed.current = true;
    previousGameweekId.current = gameweekId;
  }, [gameweekId]);

  const key = gameweekId
    ? `/api/results/overview?gameweekId=${gameweekId}`
    : "/api/results/overview";
  const { data, error } = useSWR<ResultsOverviewResponse>(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (!debugPerfEnabled || !data || !routeTimerArmed.current) return;
    console.timeEnd(routeLabel);
    routeTimerArmed.current = false;
  }, [data]);

  useEffect(() => {
    if (!data) return;

    if (data.olderId) {
      preload(`/api/results/overview?gameweekId=${data.olderId}`, fetcher);
    }

    if (data.newerId) {
      preload(`/api/results/overview?gameweekId=${data.newerId}`, fetcher);
    }
  }, [data]);

  if (error) {
    return (
      <div className="ui-banner ui-banner-danger">
        Failed to load results. Please refresh.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="ui-skeleton h-24" />
        <div className="ui-skeleton h-72" />
      </div>
    );
  }

  if (!data.currentGameweek) {
    return (
      <div className="ui-card p-6">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-primary-dark)]">
          Results
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">No results yet.</p>
      </div>
    );
  }

  const { currentGameweek, entries, olderId, newerId } = data;
  const normalized = entries ?? [];
  const summary = buildSummary(currentGameweek);

  return (
    <div className="space-y-6">
      <section className="ui-card overflow-hidden pt-6">
        <div className="flex items-center justify-between gap-3 px-6">
          <Link
            href={olderId ? `/history?gameweekId=${olderId}` : "#"}
            prefetch
            className={`ui-icon-btn text-2xl leading-none ${
              olderId
                ? ""
                : "pointer-events-none opacity-40"
            }`}
            aria-disabled={!olderId}
          >
            ‹
          </Link>
          <div className="text-center">
            <p className="ui-kicker">Results</p>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-primary-dark)] sm:text-2xl">
              {formatGameweekDate(currentGameweek.game_date)}
            </h2>
          </div>
          <Link
            href={newerId ? `/history?gameweekId=${newerId}` : "#"}
            prefetch
            className={`ui-icon-btn text-2xl leading-none ${
              newerId
                ? ""
                : "pointer-events-none opacity-40"
            }`}
            aria-disabled={!newerId}
          >
            ›
          </Link>
        </div>

        <div className="mt-6 border-t border-[rgba(31,122,99,0.1)] bg-[rgba(31,122,99,0.05)] px-4 pb-6 pt-5 sm:px-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-5">
            <div className="relative pb-6 text-left">
              <div className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-primary-dark)] sm:text-5xl">
                Darks
              </div>
              <span className={winnerPin(summary.winner, "darks")}>Winners</span>
            </div>

            <div className="flex items-start justify-center gap-3 pt-0.5 text-4xl font-semibold tracking-[-0.05em] text-[var(--color-text-secondary)] sm:gap-5 sm:text-6xl">
              {summary.hasScore ? (
                <>
                  <span>{summary.darksValue}</span>
                  <span>-</span>
                  <span>{summary.whitesValue}</span>
                </>
              ) : (
                <span>vs</span>
              )}
            </div>

            <div className="relative pb-6 text-right">
              <div className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-primary-dark)] sm:text-5xl">
                Whites
              </div>
              <span className={`${winnerPin(summary.winner, "whites")} left-auto right-0`}>
                Winners
              </span>
            </div>
          </div>
        </div>
      </section>

      <TeamsReadOnly entries={normalized} />
    </div>
  );
}
