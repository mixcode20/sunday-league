"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { PlayerStats } from "@/lib/types";

// Reference bar width for label threshold calculations
const BAR_W = 270;
// "Dark X%"  ≈ 8 chars × 6px + 18px padding
const DARK_FULL_PX = 66;
// "White X%" ≈ 9 chars × 6px + 18px padding
const WHITE_FULL_PX = 72;
// "X%"       ≈ 3 chars × 6px + 18px padding
const NUM_PX = 36;

// Fixed width for exactly 5 tiles (22px each) with gap-1 (4px) between them
const FORM_W = 5 * 22 + 4 * 4; // 126px

const RESULT_BG: Record<"w" | "l" | "d", string> = {
  w: "#22c55e",
  l: "#e5484d",
  d: "#9ca3af",
};

const TEAM_STRIPE: Record<"darks" | "whites", string> = {
  darks: "#0f3d34",
  whites: "#ffffff",
};

function FormTile({ result, team }: { result: "w" | "l" | "d"; team: "darks" | "whites" }) {
  const bg = RESULT_BG[result];
  const stripe = TEAM_STRIPE[team];
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[3px]"
      style={{ width: 22, height: 30, border: "1px solid #374151" }}
    >
      <div style={{ flex: 4, background: bg }} />
      <div style={{ flex: 2, background: stripe }} />
      <div style={{ flex: 4, background: bg }} />
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

  const showDarkFull = darkPx >= DARK_FULL_PX;
  const showDarkNum = !showDarkFull && darkPx >= NUM_PX;
  const showWhiteFull = whitePx >= WHITE_FULL_PX;
  const showWhiteNum = !showWhiteFull && whitePx >= NUM_PX;

  return (
    <div className="flex h-[26px] w-full overflow-hidden rounded-full">
      {darkPct > 0 && (
        <div
          className="flex shrink-0 items-center justify-end overflow-hidden px-[9px]"
          style={{ width: `${darkPct}%`, background: "#0f3d34" }}
        >
          {showDarkFull ? (
            <span className="whitespace-nowrap text-[11px] font-semibold text-white">
              Dark {darkPct}%
            </span>
          ) : showDarkNum ? (
            <span className="whitespace-nowrap text-[11px] font-semibold text-white">
              {darkPct}%
            </span>
          ) : null}
        </div>
      )}
      {whitePct > 0 && (
        <div
          className="flex shrink-0 items-center justify-start overflow-hidden px-[9px]"
          style={{ width: `${whitePct}%`, background: "#ffffff" }}
        >
          {showWhiteFull ? (
            <span className="whitespace-nowrap text-[11px] font-semibold text-[#0f3d34]">
              White {whitePct}%
            </span>
          ) : showWhiteNum ? (
            <span className="whitespace-nowrap text-[11px] font-semibold text-[#0f3d34]">
              {whitePct}%
            </span>
          ) : null}
        </div>
      )}
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
      <div className="flex gap-3">
        <div className="shrink-0 space-y-1.5" style={{ width: FORM_W }}>
          <div className="h-3 w-16 animate-pulse rounded bg-[rgba(15,61,52,0.12)]" />
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
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3 w-10 animate-pulse rounded bg-[rgba(15,61,52,0.12)]" />
          <div className="h-[26px] animate-pulse rounded-full bg-[rgba(15,61,52,0.12)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {/* Form: fixed width for exactly 5 tiles; arrow inline with heading */}
      <div className="shrink-0 space-y-1.5" style={{ width: FORM_W }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
          Form <span className="font-normal opacity-40">→</span>
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

      {/* Team picks: fills remaining width */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
          Team
        </p>
        <TeamPicksBar darks={data.teamPicks.darks} whites={data.teamPicks.whites} />
      </div>
    </div>
  );
}
