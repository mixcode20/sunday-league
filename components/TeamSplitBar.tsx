"use client";

import type { LeagueTeamRecord } from "@/lib/types";

export default function TeamSplitBar({ record }: { record: LeagueTeamRecord }) {
  const { darksWins, whitesWins, draws, games } = record;
  if (games === 0) return null;

  const pct = (n: number) => (n / games) * 100;
  const darksPct = pct(darksWins);
  const whitesPct = pct(whitesWins);
  const drawsPct = pct(draws);

  return (
    <div className="ui-card px-3 py-2.5">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
        <span>
          Darks{" "}
          <span className="text-sm font-semibold tracking-normal text-[var(--color-text)]">
            {darksWins}W
          </span>
        </span>
        <span className="tracking-normal normal-case opacity-70">
          {games} game{games === 1 ? "" : "s"}
          {draws > 0 ? ` · ${draws}D` : ""}
        </span>
        <span>
          <span className="text-sm font-semibold tracking-normal text-[var(--color-text)]">
            {whitesWins}W
          </span>{" "}
          Whites
        </span>
      </div>
      <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--off-white-green)]">
        <div
          style={{ width: `${darksPct}%`, backgroundColor: "var(--color-primary-dark)" }}
          title={`Darks ${darksWins} wins`}
        />
        <div
          style={{ width: `${drawsPct}%`, backgroundColor: "var(--color-draw)" }}
          title={`${draws} draws`}
        />
        <div
          style={{ width: `${whitesPct}%`, backgroundColor: "#ffffff" }}
          title={`Whites ${whitesWins} wins`}
        />
      </div>
    </div>
  );
}
