"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import Modal from "@/components/Modal";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import { formatGameweekDate, formatPlayerName, getGameweekWinner } from "@/lib/utils";
import type { Gameweek, GameweekPlayer, PlayerFormEntry, PlayerStats } from "@/lib/types";

const BAR_W = 270;
const DARK_FULL_PX = 66;
const WHITE_FULL_PX = 72;
const NUM_PX = 36;

const FORM_W = 5 * 22 + 4 * 4; // 126px — exactly 5 tiles

const RESULT_BG: Record<"w" | "l" | "d", string> = {
  w: "#2f9e6a",
  l: "#d6533f",
  d: "#c2c8c4",
};

const TEAM_STRIPE: Record<"darks" | "whites", string> = {
  darks: "#0f3d34",
  whites: "#ffffff",
};

// Matches winnerPin from ResultsPageClient exactly
const winnerPin = (winner: Gameweek["winner"], team: "darks" | "whites") => {
  if (winner !== team) {
    return "absolute bottom-0 left-0 inline-flex items-center rounded-full border border-transparent bg-transparent px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-transparent shadow-none";
  }
  if (team === "darks") {
    return "absolute bottom-0 left-0 inline-flex items-center rounded-full border border-[rgba(15,61,52,0.18)] bg-[var(--color-primary-dark)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_18px_rgba(15,61,52,0.14)]";
  }
  return "absolute bottom-0 left-0 inline-flex items-center rounded-full border border-[rgba(31,122,99,0.18)] bg-white px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-dark)] shadow-[0_8px_18px_rgba(15,61,52,0.08)]";
};

function FormTile({
  result,
  team,
  onClick,
}: {
  result: "w" | "l" | "d";
  team: "darks" | "whites";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 flex-col overflow-hidden rounded-[3px] active:opacity-70"
      style={{ width: 22, height: 30, border: "1px solid #374151" }}
    >
      <div style={{ flex: 3, background: RESULT_BG[result] }} />
      <div style={{ flex: 1, background: TEAM_STRIPE[team] }} />
    </button>
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

type GameweekOverview = {
  currentGameweek: Gameweek | null;
  entries: GameweekPlayer[];
};

function GameweekDetail({ entry }: { entry: PlayerFormEntry }) {
  const { data, isLoading } = useSWR<GameweekOverview>(
    `/api/results/overview?gameweekId=${entry.gameweekId}`,
    fetcher
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="ui-skeleton h-24" />
        <div className="ui-skeleton h-64" />
      </div>
    );
  }

  if (!data.currentGameweek) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">No data found.</p>
    );
  }

  const { currentGameweek, entries } = data;
  const winner = getGameweekWinner(currentGameweek);
  const hasScore =
    typeof currentGameweek.darks_score === "number" &&
    typeof currentGameweek.whites_score === "number";

  const darksValue = hasScore ? String(currentGameweek.darks_score) : null;
  const whitesValue = hasScore ? String(currentGameweek.whites_score) : null;

  return (
    // Inner card replicates the results page section exactly
    <div className="overflow-hidden rounded-[1.25rem]">
      {/* Score section — matches ResultsPageClient score block */}
      <div className="bg-[rgba(31,122,99,0.05)] px-4 pb-6 pt-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="relative pb-6 text-left">
            <div className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-primary-dark)]">
              Darks
            </div>
            <span className={winnerPin(winner, "darks")}>Winners</span>
          </div>

          <div className="flex items-start justify-center gap-3 pt-0.5 text-4xl font-semibold tracking-[-0.05em] text-[var(--color-text-secondary)]">
            <span className="inline-block min-w-[1ch] text-center">{darksValue ?? ""}</span>
            <span>-</span>
            <span className="inline-block min-w-[1ch] text-center">{whitesValue ?? ""}</span>
          </div>

          <div className="relative pb-6 text-right">
            <div className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-primary-dark)]">
              Whites
            </div>
            <span className={`${winnerPin(winner, "whites")} left-auto right-0`}>Winners</span>
          </div>
        </div>
      </div>

      {/* Teams section — matches ResultsPageClient teams block */}
      <div className="pb-5 pt-[10px]">
        <TeamsReadOnly
          entries={entries ?? []}
          winner={winner}
          showCounts={false}
        />
      </div>
    </div>
  );
}

export default function PlayerDrawer({ playerId }: { playerId: string }) {
  const [selectedEntry, setSelectedEntry] = useState<PlayerFormEntry | null>(null);
  const [scrollRatio, setScrollRatio] = useState(0);
  const formScrollRef = useRef<HTMLDivElement>(null);

  const handleFormScroll = () => {
    const el = formScrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScrollRatio(max > 0 ? el.scrollLeft / max : 0);
  };

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
    <>
      <div className="flex gap-3">
        {/* Form: fixed outer width, tiles scroll horizontally inside */}
        <div className="shrink-0 space-y-1.5" style={{ width: FORM_W }}>
          {/* Heading with full-width arrow */}
          <div className="flex items-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            <span className="shrink-0">Form</span>
            <span className="mx-1.5 h-px flex-1 bg-current opacity-25" />
            <span className="shrink-0 opacity-40">→</span>
          </div>

          {data.form.length === 0 ? (
            <p className="text-[11px] text-[var(--color-text-secondary)]">No data</p>
          ) : (
            <>
              <div
                ref={formScrollRef}
                onScroll={handleFormScroll}
                className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none" }}
              >
                {data.form.map((entry, i) => (
                  <FormTile
                    key={i}
                    result={entry.result}
                    team={entry.team}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
              {/* Scroll indicator — only shown when there are more than 5 games */}
              {data.form.length > 5 && (
                <div className="h-[2px] w-full overflow-hidden rounded-full bg-[rgba(15,61,52,0.08)]">
                  <div
                    className="h-full w-2/5 rounded-full bg-[rgba(15,61,52,0.2)]"
                    style={{
                      transform: `translateX(${scrollRatio * 150}%)`,
                      transition: "transform 60ms linear",
                    }}
                  />
                </div>
              )}
            </>
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

      <Modal
        isOpen={selectedEntry !== null}
        title={selectedEntry ? formatGameweekDate(selectedEntry.gameDate) : ""}
        onClose={() => setSelectedEntry(null)}
        closeVariant="icon"
        position="top"
      >
        {selectedEntry && <GameweekDetail entry={selectedEntry} />}
      </Modal>
    </>
  );
}
