"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import useSWR from "swr";
import LeagueTableClient from "@/components/LeagueTableClient";
import { fetcher, debugPerfEnabled } from "@/lib/swr";

type StatRow = {
  id: string;
  name: string;
  gp: number;
  w: number;
  d: number;
  l: number;
  winPct: number;
};

type LeagueOverviewResponse = {
  rows: StatRow[];
  playersCount: number;
};

export default function LeaguePageClient() {
  const routeTimerArmed = useRef(false);
  const routeLabel = "route:league";

  useEffect(() => {
    if (!debugPerfEnabled || routeTimerArmed.current) return;
    console.time(routeLabel);
    routeTimerArmed.current = true;
  }, []);

  const { data, error } = useSWR<LeagueOverviewResponse>(
    "/api/league/overview",
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );

  useEffect(() => {
    if (!debugPerfEnabled || !data || !routeTimerArmed.current) return;
    console.timeEnd(routeLabel);
    routeTimerArmed.current = false;
  }, [data]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Failed to load league table. Please refresh.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 rounded-lg bg-slate-200" />
        <div className="h-64 rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">League</h2>
      <LeagueTableClient rows={data.rows} />
      {data.playersCount === 0 ? (
        <p className="text-sm text-slate-500">
          No players yet. Add them in{" "}
          <Link href="/admin/players" className="font-medium text-slate-900">
            player settings
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
