"use client";

import { useEffect, useState } from "react";
import { formatGameweekDate } from "@/lib/utils";

type GameweekInfoStripProps = {
  gameweekId?: string | null;
  gameDate?: string | null;
  time?: string | null;
  location?: string | null;
  mainCount?: number;
  subsCount?: number;
};

export default function GameweekInfoStrip({
  gameweekId,
  gameDate,
  time,
  location,
  mainCount = 0,
  subsCount = 0,
}: GameweekInfoStripProps) {
  const [counts, setCounts] = useState({ main: mainCount, subs: subsCount });

  useEffect(() => {
    setCounts({ main: mainCount, subs: subsCount });
  }, [mainCount, subsCount]);

  useEffect(() => {
    if (!gameweekId) return;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/gameweeks/${gameweekId}/entries`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.entries)) {
        const total = data.entries.length;
        setCounts({
          main: Math.min(total, 14),
          subs: Math.max(total - 14, 0),
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [gameweekId]);

  if (!gameDate) {
    return (
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-2 text-sm text-slate-500">
          No gameweek scheduled yet.
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-2 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">
          {formatGameweekDate(gameDate)}
        </span>
        <span>{time ?? "9:15am"} · {location ?? "MH"}</span>
        <span>
          {Math.min(counts.main, 14)}/14 · {Math.min(counts.subs, 4)}/4 subs
        </span>
      </div>
    </div>
  );
}
