"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
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

const buildSummary = (gameweek: Gameweek) => {
  const hasScore =
    typeof gameweek.darks_score === "number" &&
    typeof gameweek.whites_score === "number";
  const winner = getGameweekWinner(gameweek);

  if (gameweek.result_mode === "score" && hasScore) {
    return {
      leftValue: String(gameweek.darks_score),
      leftLabel: "Darks",
      focusValue: `${gameweek.darks_score}-${gameweek.whites_score}`,
      focusLabel: "Score",
      rightValue: String(gameweek.whites_score),
      rightLabel: "Whites",
    };
  }

  return {
    leftValue: winner === "draw" ? "Draw" : winner === "darks" ? "Darks" : "Whites",
    leftLabel: "Winner",
    focusValue: winner === "draw" ? "Level" : winner === "darks" ? "Darks" : "Whites",
    focusLabel: "Full time",
    rightValue: winner === "draw" ? "Shared" : "3 pts",
    rightLabel: "Outcome",
  };
};

export default function ResultsPageClient() {
  const searchParams = useSearchParams();
  const gameweekId = searchParams.get("gameweekId");
  const routeTimerArmed = useRef(false);
  const routeLabel = "route:results";

  useEffect(() => {
    if (!debugPerfEnabled || routeTimerArmed.current) return;
    console.time(routeLabel);
    routeTimerArmed.current = true;
  }, []);

  const key = gameweekId
    ? `/api/results/overview?gameweekId=${gameweekId}`
    : "/api/results/overview";
  const { data, error } = useSWR<ResultsOverviewResponse>(key, fetcher, {
    revalidateOnFocus: true,
  });

  useEffect(() => {
    if (!debugPerfEnabled || !data || !routeTimerArmed.current) return;
    console.timeEnd(routeLabel);
    routeTimerArmed.current = false;
  }, [data]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Failed to load results. Please refresh.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-3xl border border-slate-200 bg-white" />
        <div className="h-72 rounded-3xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (!data.currentGameweek) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Results</h2>
        <p className="text-sm text-slate-500">No results yet.</p>
      </div>
    );
  }

  const { currentGameweek, entries, olderId, newerId } = data;
  const normalized = entries ?? [];
  const summary = buildSummary(currentGameweek);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#260023_0%,#3d0038_55%,#22001f_100%)] p-6 text-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={olderId ? `/history?gameweekId=${olderId}` : "#"}
            prefetch
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-2xl leading-none transition ${
              olderId
                ? "border-white/25 bg-white/5 text-white"
                : "pointer-events-none border-white/10 text-white/25"
            }`}
            aria-disabled={!olderId}
          >
            ‹
          </Link>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Results</p>
            <h2 className="text-xl font-semibold sm:text-2xl">
              {formatGameweekDate(currentGameweek.game_date)}
            </h2>
          </div>
          <Link
            href={newerId ? `/history?gameweekId=${newerId}` : "#"}
            prefetch
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-2xl leading-none transition ${
              newerId
                ? "border-white/25 bg-white/5 text-white"
                : "pointer-events-none border-white/10 text-white/25"
            }`}
            aria-disabled={!newerId}
          >
            ›
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="text-center sm:text-left">
            <div className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {summary.leftValue}
            </div>
            <p className="mt-2 text-base text-white/75 sm:text-lg">{summary.leftLabel}</p>
          </div>

          <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#1ee3ff_0%,#2fb7ff_48%,#8f73ff_100%)] px-8 py-7 text-center text-slate-950 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
            <div className="text-5xl font-semibold tracking-tight sm:text-6xl">
              {summary.focusValue}
            </div>
            <p className="mt-2 text-base font-medium uppercase tracking-[0.18em] text-slate-900/70">
              {summary.focusLabel}
            </p>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {summary.rightValue}
            </div>
            <p className="mt-2 text-base text-white/75 sm:text-lg">{summary.rightLabel}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <TeamsReadOnly entries={normalized} />
      </section>
    </div>
  );
}
