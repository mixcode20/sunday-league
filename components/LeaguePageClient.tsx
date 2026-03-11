"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import useSWR from "swr";
import LeagueTableClient from "@/components/LeagueTableClient";
import type { LeagueStatRow } from "@/lib/types";
import { fetcher, debugPerfEnabled } from "@/lib/swr";

type LeagueOverviewResponse = {
  rows: LeagueStatRow[];
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
      <div className="ui-banner ui-banner-danger">
        Failed to load league table. Please refresh.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="ui-skeleton h-8 w-32" />
        <div className="ui-skeleton h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LeagueTableClient rows={data.rows} />
      {data.playersCount === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          No players yet. Add them in{" "}
          <Link href="/admin/players" className="font-medium text-[var(--color-primary-dark)]">
            player settings
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
