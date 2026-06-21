"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { PlayerStats } from "@/lib/types";

const BAR_W = 270;
const DARK_MIN_PX = 78;
const WHITE_MIN_PX = 84;
const WHITE_NUM_PX = 44;

// Fixed width for exactly 5 tiles at 22px with gap-1 (4px) between them
const FORM_W = 5 * 22 + 4 * 4; // 126px

const RESULT_BG: Record<"w" | "l" | "d", string> = {
  w: "#22c55e",
  l: "#e5484d",
  d: "#9ca3af",
};

function FormTile({ result }: { result: "w" | "l" | "d" }) {
  return (
    <div
      className="rounded-[3px]"
      style={{ width: 22, height: 30, background: RESULT_BG[result], border: "1px solid rgba(0,0,0,0.07)" }}
    />
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
  const showWhiteFull = whitePx >= WHITE_MIN_PX;
  const showWhiteNum = !showWhiteFull && whitePx >= WHITE_NUM_PX;

  return (
    <div className="flex h-[26px] w-full overflow-hidden rounded-full">
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
        style={{ width: `${whitePct}%`, background: "#ffffff" }}
      >
        {showWhiteFull ? (
          <span className="whitespace-nowrap text-[11px] font-semibold text-[#0f3d34]">
            Whites {whitePct}%
          </span>
        ) : showWhiteNum ? (
          <span className="whitespace-nowrap text-[11px] font-semibold text-[#0f3d34]">
            {whitePct}%
          </span>
        ) : null}
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
      <div className="flex">
        <div className="shrink-0 space-y-1.5" style={{ width: FORM_W }}>
          <div className="h-3 w-10 animate-pulse rounded bg-[rgba(15,61,52,0.12)]" />
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
        <div className="flex shrink-0 flex-col justify-end pb-1" style={{ width: 24 }}>
          <span className="text-center text-[11px] text-[rgba(15,61,52,0.12)]">→</span>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3 w-20 animate-pulse rounded bg-[rgba(15,61,52,0.12)]" />
          <div className="h-[26px] animate-pulse rounded-full bg-[rgba(15,61,52,0.12)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Form: fixed width for exactly 5 tiles */}
      <div className="shrink-0 space-y-1.5" style={{ width: FORM_W }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
          Form
        </p>
        {data.form.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-secondary)]">No data</p>
        ) : (
          <div className="flex gap-1">
            {data.form.map((entry, i) => (
              <FormTile key={i} result={entry.result} />
            ))}
          </div>
        )}
      </div>

      {/* Arrow: fixed width column, arrow pushed to bottom to sit beside tiles */}
      <div className="flex shrink-0 flex-col justify-end pb-1" style={{ width: 24 }}>
        <span className="text-center text-[11px] text-[rgba(15,61,52,0.35)]">→</span>
      </div>

      {/* Team picks: fills remaining width */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
          Team picks
        </p>
        <TeamPicksBar darks={data.teamPicks.darks} whites={data.teamPicks.whites} />
      </div>
    </div>
  );
}
