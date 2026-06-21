"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { PlayerStats } from "@/lib/types";

const BAR_W = 270;
const DARK_MIN_PX = 78;
const WHITE_MIN_PX = 84;

const RESULT_BG: Record<"w" | "l" | "d", string> = {
  w: "#22c55e",
  l: "#e5484d",
  d: "#9ca3af",
};

const TEAM_STRIP_BG: Record<"darks" | "whites", string> = {
  darks: "#0f3d34",
  whites: "#dde8e5",
};

function FormTile({ result, team }: { result: "w" | "l" | "d"; team: "darks" | "whites" }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[3px]"
      style={{ width: 22, height: 30, border: "1px solid rgba(0,0,0,0.07)" }}
    >
      <div style={{ flex: 7, background: RESULT_BG[result] }} />
      <div style={{ flex: 3, background: TEAM_STRIP_BG[team] }} />
    </div>
  );
}

function TeamPicksBar({ darks, whites }: { darks: number; whites: number }) {
  const total = darks + whites;
  if (total === 0) {
    return <p className="text-[11px] text-[var(--color-text-secondary)]">No data</p>;
  }

  const darkPct = Math.round((darks / total) * 100);
  const whitePct = 100 - darkPct;
  const darkPx = (BAR_W * darkPct) / 100;
  const whitePx = BAR_W - darkPx;
  const showDark = darkPx >= DARK_MIN_PX;
  const showWhite = whitePx >= WHITE_MIN_PX;

  return (
    <div
      className="flex h-[26px] overflow-hidden rounded-full"
      style={{ width: "100%", maxWidth: BAR_W }}
    >
      <div
        className="flex shrink-0 items-center justify-end overflow-hidden px-[9px]"
        style={{ width: `${darkPct}%`, background: "#0f3d34" }}
      >
        {showDark && (
          <span className="whitespace-nowrap text-[11px] font-semibold text-white">
            Darks {darkPct}%
          </span>
        )}
      </div>
      <div
        className="flex shrink-0 items-center justify-start overflow-hidden px-[9px]"
        style={{
          width: `${whitePct}%`,
          background: "#dde8e5",
          border: "1px solid rgba(0,0,0,0.07)",
        }}
      >
        {showWhite && (
          <span className="whitespace-nowrap text-[11px] font-semibold text-[#0f3d34]">
            Whites {whitePct}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function PlayerDrawer({ playerId }: { playerId: string }) {
  const { data, isLoading } = useSWR<PlayerStats>(
    `/api/players/${playerId}/stats`,
    fetcher
  );

  if (isLoading || !data) {
    return (
      <div className="flex gap-6">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-12 animate-pulse rounded bg-[rgba(15,61,52,0.12)]" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-[3px] bg-[rgba(15,61,52,0.12)]"
                style={{ width: 22, height: 30 }}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-[rgba(15,61,52,0.12)]" />
          <div className="h-[26px] animate-pulse rounded-full bg-[rgba(15,61,52,0.12)]" style={{ maxWidth: BAR_W }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
          Form
          <span className="opacity-50">→</span>
        </p>
        {data.form.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-secondary)]">No data</p>
        ) : (
          <div className="flex gap-1">
            {data.form.map((entry, i) => (
              <FormTile key={i} result={entry.result} team={entry.team} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
          Team picks
        </p>
        <TeamPicksBar darks={data.teamPicks.darks} whites={data.teamPicks.whites} />
      </div>
    </div>
  );
}
