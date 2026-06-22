"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import Modal from "@/components/Modal";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import { formatGameweekDate, getGameweekWinner } from "@/lib/utils";
import type { Gameweek, GameweekPlayer, PlayerFormEntry, PlayerStats } from "@/lib/types";

const BAR_W = 270;
const DARK_FULL_PX = 66;
const WHITE_FULL_PX = 72;
const NUM_PX = 36;

const FORM_W = 5 * 25 + 4 * 4; // 141px — exactly 5 tiles

const RESULT_BG: Record<"w" | "l" | "d", string> = {
  w: "#2f9e6a",
  l: "#d6533f",
  d: "#c2c8c4",
};

const TEAM_STRIPE: Record<"darks" | "whites", string> = {
  darks: "#0f3d34",
  whites: "#ffffff",
};

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
      style={{ width: 25, height: 38, border: "1px solid #374151" }}
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

function PpgSparkline({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-full items-end pb-1">
        {data.length === 1 && (
          <p className="text-right text-[10px] text-[var(--color-text-secondary)]">
            now · {data[0].toFixed(2)} PPG
          </p>
        )}
      </div>
    );
  }

  const W = 200;
  const H = 44;
  const PAD_X = 2;
  const PAD_Y = 4;

  const min = 0;
  const max = 3;
  const range = 3;

  const points = data.map((v, i) => [
    PAD_X + (i / (data.length - 1)) * (W - 2 * PAD_X),
    PAD_Y + (1 - (v - min) / range) * (H - 2 * PAD_Y),
  ]);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0]},${H} L${points[0][0]},${H} Z`;
  const last = points[points.length - 1];
  const currentPpg = data[data.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full flex-1"
      style={{ minHeight: 0 }}
      preserveAspectRatio="none"
    >
      <path d={areaPath} fill="rgba(31,122,99,0.07)" />
      <path d={linePath} fill="none" stroke="#1f7a63" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="#1f7a63" />
    </svg>
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
    <div className="overflow-hidden rounded-[1.25rem]">
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
      <div className="pb-5 pt-[10px]">
        <TeamsReadOnly entries={entries ?? []} winner={winner} showCounts={false} />
      </div>
    </div>
  );
}

const KICKER = "text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]";

const RANK_BG: Record<1 | 2 | 3, string> = {
  1: "#E8B84B",
  2: "#9BA3AF",
  3: "#CD8B4E",
};

const RANK_BORDER: Record<1 | 2 | 3, string> = {
  1: "border-[#E8B84B]",
  2: "border-[#9BA3AF]",
  3: "border-[#CD8B4E]",
};

export default function PlayerDrawer({
  playerId,
  goalsForRank,
  avgGoalsRank,
  isWorstAttacker = false,
  avgConcededRank,
  isWorstDefender = false,
}: {
  playerId: string;
  goalsForRank?: 1 | 2 | 3;
  avgGoalsRank?: 1 | 2 | 3;
  isWorstAttacker?: boolean;
  avgConcededRank?: 1 | 2 | 3;
  isWorstDefender?: boolean;
}) {
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
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="shrink-0 space-y-1.5" style={{ width: FORM_W }}>
            <div className="h-3 w-10 animate-pulse rounded bg-[rgba(15,61,52,0.12)]" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-[3px] bg-[rgba(15,61,52,0.12)]" style={{ width: 25, height: 30 }} />
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="h-3 w-16 animate-pulse rounded bg-[rgba(15,61,52,0.12)]" />
            <div className="mt-1.5 h-[44px] animate-pulse rounded bg-[rgba(15,61,52,0.08)]" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[rgba(15,61,52,0.08)]" />
          ))}
        </div>
        <div className="h-[26px] animate-pulse rounded-full bg-[rgba(15,61,52,0.12)]" />
      </div>
    );
  }

  const showTeamWinRates =
    data.darkWinRate !== null && data.whitesWinRate !== null;

  const gdSign = data.avgGdPerGame > 0 ? "+" : "";
  const gdColor =
    data.avgGdPerGame > 0
      ? "text-[#2f9e6a]"
      : data.avgGdPerGame < 0
        ? "text-[#d6533f]"
        : "text-[var(--color-text-secondary)]";

  return (
    <>
      {/* Row 1: Form + PPG Trend */}
      <div className="flex gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            <span className="shrink-0">Form</span>
            <svg width="40" height="8" viewBox="0 0 40 8" fill="none" className="shrink-0 opacity-40">
              <path d="M0 4h36M33 1l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {data.form.length === 0 ? (
            <p className="text-[11px] text-[var(--color-text-secondary)]">No data</p>
          ) : (
            <div className="flex flex-1 flex-col">
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
              {data.form.length > 5 && (
                <div className="mt-auto pt-2">
                  <div className="h-[2px] w-full overflow-hidden rounded-full bg-[rgba(15,61,52,0.08)]">
                    <div
                      className="h-full w-2/5 rounded-full bg-[rgba(15,61,52,0.2)]"
                      style={{
                        transform: `translateX(${scrollRatio * 150}%)`,
                        transition: "transform 60ms linear",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={KICKER}>PPG Trend</p>
          <PpgSparkline data={data.ppgTrend} />
        </div>
      </div>

      {/* Row 2: Goals For / Avg FOR/GP / Avg CON/GP */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {/* Goals For */}
        <div className={`relative rounded-xl border bg-white px-2 py-3 text-center ${goalsForRank ? RANK_BORDER[goalsForRank] : "border-[rgba(31,122,99,0.18)]"}`}>
          {goalsForRank && (
            <span className="absolute -right-1 -top-1 inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white shadow-sm" style={{ background: RANK_BG[goalsForRank] }}>
              #{goalsForRank}
            </span>
          )}
          <p className="text-base font-semibold tracking-[-0.02em] text-[var(--color-text)]">{data.goalsFor}</p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Goals For</p>
        </div>
        {/* Avg FOR/GP */}
        <div className={`relative rounded-xl border bg-white px-2 py-3 text-center ${avgGoalsRank ? RANK_BORDER[avgGoalsRank] : isWorstAttacker ? "border-[#d6533f]" : "border-[rgba(31,122,99,0.18)]"}`}>
          {avgGoalsRank && (
            <span className="absolute -right-1 -top-1 inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white shadow-sm" style={{ background: RANK_BG[avgGoalsRank] }}>
              {avgGoalsRank === 1 ? "BEST" : avgGoalsRank === 2 ? "2ND" : "3RD"}
            </span>
          )}
          {!avgGoalsRank && isWorstAttacker && (
            <span className="absolute -right-1 -top-1 inline-flex items-center rounded-full bg-[#d6533f] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white shadow-sm">
              WORST
            </span>
          )}
          <p className="text-base font-semibold tracking-[-0.02em] text-[var(--color-text)]">{data.avgGoalsPerGame}</p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">AVG GOALS FOR</p>
        </div>
        {/* Avg CON/GP */}
        <div className={`relative rounded-xl border bg-white px-2 py-3 text-center ${avgConcededRank ? RANK_BORDER[avgConcededRank] : isWorstDefender ? "border-[#d6533f]" : "border-[rgba(31,122,99,0.18)]"}`}>
          {avgConcededRank && (
            <span className="absolute -right-1 -top-1 inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white shadow-sm" style={{ background: RANK_BG[avgConcededRank] }}>
              {avgConcededRank === 1 ? "BEST" : avgConcededRank === 2 ? "2ND" : "3RD"}
            </span>
          )}
          {!avgConcededRank && isWorstDefender && (
            <span className="absolute -right-1 -top-1 inline-flex items-center rounded-full bg-[#d6533f] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white shadow-sm">
              WORST
            </span>
          )}
          <p className="text-base font-semibold tracking-[-0.02em] text-[var(--color-text)]">{data.avgConcededPerGame}</p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">AVG GOALS CON</p>
        </div>
      </div>

      <div className="mt-4 border-t border-[rgba(31,122,99,0.08)]" />

      {/* Row 3: Team Picks + Win Rates */}
      <div className="mt-4 space-y-2">
        <p className={KICKER}>Team Picks</p>
        <TeamPicksBar darks={data.teamPicks.darks} whites={data.teamPicks.whites} />
        {showTeamWinRates && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-center gap-1.5 px-3 py-1">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#0f3d34]" />
              <p className="font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                {Math.round(data.darkWinRate! * 100)}%
              </p>
              <p className="text-[10px] text-[var(--color-text-secondary)]">win rate</p>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-3 py-1">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-[rgba(15,61,52,0.3)] bg-white" />
              <p className="font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                {Math.round(data.whitesWinRate! * 100)}%
              </p>
              <p className="text-[10px] text-[var(--color-text-secondary)]">win rate</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-[rgba(31,122,99,0.08)]" />

      {/* Row 5: Best Teammates + Toughest Opponent */}
      {(data.bestTeammates.length > 0 || data.toughestOpponent) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Best Teammates */}
          <div className="flex flex-col">
            <p className={`mb-2 ${KICKER}`}>Best Teammates</p>
            {data.bestTeammates.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-secondary)]">No data</p>
            ) : (
              <div className="space-y-1">
                {data.bestTeammates.map((t) => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <span className="w-14 shrink-0 truncate text-[11px] font-medium text-[var(--color-text)]">{t.name}</span>
                    <div className="h-[18px] min-w-0 flex-1 overflow-hidden rounded-full bg-[rgba(15,61,52,0.08)]">
                      <div
                        className="flex h-full items-center overflow-hidden rounded-full bg-[#2f9e6a] px-1.5"
                        style={{ width: `${t.winRate * 100}%` }}
                      >
                        <span className="whitespace-nowrap text-[9px] font-bold text-white">{Math.round(t.winRate * 100)}%</span>
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[10px] text-[var(--color-text-secondary)]">{t.gp}GP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toughest Opponent */}
          <div className="flex flex-col">
            <p className={`mb-2 ${KICKER}`}>Toughest Opponent</p>
            {!data.toughestOpponent ? (
              <p className="text-[11px] text-[var(--color-text-secondary)]">No data</p>
            ) : (
              <div className="flex flex-1 flex-col justify-center rounded-xl border border-[rgba(31,122,99,0.18)] bg-white px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-1">
                  <p className="min-w-0 truncate text-[13px] font-semibold text-[var(--color-text)]">{data.toughestOpponent.name}</p>
                  <p className="shrink-0 text-lg font-bold tracking-[-0.03em] text-[#d6533f]">
                    {Math.round(data.toughestOpponent.winRate * 100)}%
                  </p>
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <p className="text-[10px] text-[var(--color-text-secondary)]">
                    Lost {data.toughestOpponent.losses} of {data.toughestOpponent.gp}
                  </p>
                  <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Win Rate</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pb-3" />

      <Modal
        isOpen={selectedEntry !== null}
        title={selectedEntry ? formatGameweekDate(selectedEntry.gameDate) : ""}
        onClose={() => setSelectedEntry(null)}
        closeVariant="icon"
        position="top"
        topOffsetClassName="pt-3"
        panelMaxHeightClassName="max-h-[calc(100dvh-1.5rem)]"
      >
        {selectedEntry && <GameweekDetail entry={selectedEntry} />}
      </Modal>
    </>
  );
}
