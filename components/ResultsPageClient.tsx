"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import type { Gameweek, GameweekPlayer } from "@/lib/types";
import { formatGameweekDate } from "@/lib/utils";
import { fetcher, debugPerfEnabled } from "@/lib/swr";

type ResultsOverviewResponse = {
  currentGameweek: Gameweek | null;
  entries: GameweekPlayer[];
  olderId: string | null;
  newerId: string | null;
};

const outcomeBadge = (label: string, variant: string) => (
  <span
    className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${variant}`}
  >
    {label}
  </span>
);

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
  const darks = normalized.filter((entry) => entry.team === "darks");
  const whites = normalized.filter((entry) => entry.team === "whites");

  const darksScore = currentGameweek.darks_score ?? 0;
  const whitesScore = currentGameweek.whites_score ?? 0;
  const isDraw = darksScore === whitesScore;
  const darksOutcome = isDraw ? "Draw" : darksScore > whitesScore ? "Win" : "Loss";
  const whitesOutcome = isDraw ? "Draw" : whitesScore > darksScore ? "Win" : "Loss";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Results
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {formatGameweekDate(currentGameweek.game_date)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={olderId ? `/history?gameweekId=${olderId}` : "#"}
              prefetch
              className={`rounded-full border px-3 py-2 text-sm ${
                olderId
                  ? "border-slate-200 text-slate-700"
                  : "border-slate-100 text-slate-300 pointer-events-none"
              }`}
              aria-disabled={!olderId}
            >
              ←
            </Link>
            <Link
              href={newerId ? `/history?gameweekId=${newerId}` : "#"}
              prefetch
              className={`rounded-full border px-3 py-2 text-sm ${
                newerId
                  ? "border-slate-200 text-slate-700"
                  : "border-slate-100 text-slate-300 pointer-events-none"
              }`}
              aria-disabled={!newerId}
            >
              →
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Darks
              </h3>
              {outcomeBadge(
                darksOutcome,
                isDraw
                  ? "border-slate-200 text-slate-500"
                  : darksOutcome === "Win"
                    ? "border-emerald-200 text-emerald-600"
                    : "border-rose-200 text-rose-600"
              )}
            </div>
            <div className="mt-3 space-y-2">
              {darks.map((entry) => (
                <div
                  key={entry.player_id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  {entry.players.first_name} {entry.players.last_name}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-2xl font-semibold text-slate-800">
            <span>{darksScore}</span>
            <span className="text-slate-400">-</span>
            <span>{whitesScore}</span>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Whites
              </h3>
              {outcomeBadge(
                whitesOutcome,
                isDraw
                  ? "border-slate-200 text-slate-500"
                  : whitesOutcome === "Win"
                    ? "border-emerald-200 text-emerald-600"
                    : "border-rose-200 text-rose-600"
              )}
            </div>
            <div className="mt-3 space-y-2">
              {whites.map((entry) => (
                <div
                  key={entry.player_id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  {entry.players.first_name} {entry.players.last_name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
