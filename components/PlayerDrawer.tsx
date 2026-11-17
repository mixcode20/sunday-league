"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import Modal from "@/components/Modal";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import { formatGameweekDate, formatShortGameDate, getGameweekWinner } from "@/lib/utils";
import type { Gameweek, GameweekPlayer, PlayerFormEntry, PlayerStats } from "@/lib/types";

const BAR_W = 270;
const DARK_FULL_PX = 66;
const WHITE_FULL_PX = 72;
const NUM_PX = 24;

const FORM_W = 5 * 25 + 4 * 4; // 141px — exactly 5 tiles

const RESULT_BG: Record<"w" | "l" | "d", string> = {
  w: "var(--color-success)",
  l: "var(--color-danger)",
  d: "var(--color-draw)",
};

const TEAM_STRIPE: Record<"darks" | "whites", string> = {
  darks: "var(--color-primary-dark)",
  whites: "#ffffff",
};

// A draw is badged once, centred under the score, rather than on either side.
const DRAW_PIN =
  "absolute bottom-0 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full border border-[rgba(15,61,52,0.18)] bg-white px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-dark)] shadow-[0_8px_18px_rgba(15,61,52,0.08)]";

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
      style={{ width: 25, height: 38, border: "1px solid var(--color-text-secondary)" }}
    >
      <div
        className="flex items-center justify-center text-[11px] font-bold leading-none text-white"
        style={{ flex: 3, background: RESULT_BG[result] }}
      >
        {result.toUpperCase()}
      </div>
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

  const darkPad = darkPx >= 40 ? "pl-[5px] pr-[9px]" : "px-[4px]";
  const whitePad = whitePx >= 40 ? "pl-[9px] pr-[5px]" : "px-[4px]";

  return (
    <div className="flex h-[26px] w-full overflow-hidden rounded-[6px]">
      {darkPct > 0 && (
        <div
          className={`flex shrink-0 items-center justify-end overflow-hidden ${darkPad}`}
          style={{ width: `${darkPct}%`, background: "var(--color-primary-dark)" }}
        >
          {showDarkFull ? (
            <span className="whitespace-nowrap text-[11px] font-semibold text-white">
              Darks · {darkPct}%
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
          className={`flex shrink-0 items-center justify-start overflow-hidden ${whitePad}`}
          style={{ width: `${whitePct}%`, background: "#ffffff" }}
        >
          {showWhiteFull ? (
            <span className="whitespace-nowrap text-[11px] font-semibold text-[var(--color-primary-dark)]">
              White {whitePct}%
            </span>
          ) : showWhiteNum ? (
            <span className="whitespace-nowrap text-[11px] font-semibold text-[var(--color-primary-dark)]">
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
  const range = 3;

  const points = data.map((v, i) => [
    PAD_X + (i / (data.length - 1)) * (W - 2 * PAD_X),
    PAD_Y + (1 - (v - min) / range) * (H - 2 * PAD_Y),
  ]);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0]},${H} L${points[0][0]},${H} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full flex-1"
      style={{ minHeight: 0 }}
      preserveAspectRatio="none"
    >
      <path d={areaPath} fill="rgba(31,122,99,0.07)" />
      <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--color-primary)" />
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
    <div className="overflow-hidden rounded-[8px]">
      <div className="bg-[rgba(31,122,99,0.05)] px-4 pb-6 pt-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="relative pb-6 text-left">
            <div className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-primary-dark)]">
              Darks
            </div>
            <span className={winnerPin(winner, "darks")}>Winners</span>
          </div>
          <div className="relative pb-6">
            <div className="flex items-start justify-center gap-3 pt-0.5 text-4xl font-semibold tracking-[-0.05em] text-[var(--color-text-secondary)]">
              <span className="inline-block min-w-[1ch] text-center">{darksValue ?? ""}</span>
              <span>-</span>
              <span className="inline-block min-w-[1ch] text-center">{whitesValue ?? ""}</span>
            </div>
            {winner === "draw" ? <span className={DRAW_PIN}>Draw</span> : null}
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

function SectionHeader({
  label,
  meta,
  className,
}: {
  label: string;
  meta?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className ?? ""}`}>
      <p className={KICKER}>{label}</p>
      {meta ? (
        <p className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
          {meta}
        </p>
      ) : null}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1.5 rounded-[8px] border border-[rgba(31,122,99,0.14)] bg-white p-3">
      {children}
    </div>
  );
}

function Stat({
  value,
  label,
  topLabel,
  labelTone = "kicker",
  valueClass,
  badge,
  badgeClass,
  badgeStyle,
}: {
  value: string;
  label: string;
  topLabel?: string;
  labelTone?: "kicker" | "caption";
  valueClass?: string;
  badge?: string;
  badgeClass?: string;
  badgeStyle?: React.CSSProperties;
}) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      {topLabel ? (
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
          {topLabel}
        </p>
      ) : null}
      <div className={`flex items-center gap-2 ${topLabel ? "mt-1" : ""}`}>
        <p
          className={`font-semibold tracking-[-0.03em] ${
            topLabel ? "text-[20px] leading-none" : "text-[17px]"
          } ${valueClass ?? "text-[var(--color-text)]"}`}
        >
          {value}
        </p>
        {badge ? (
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.08em] ${
              badgeClass ?? "bg-[rgba(31,122,99,0.12)] text-[var(--color-text)]"
            }`}
            style={badgeStyle}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p
        className={
          labelTone === "caption"
            ? "mt-1 text-[11px] font-normal text-[var(--color-text-secondary)] opacity-70"
            : "mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]"
        }
      >
        {label}
      </p>
    </div>
  );
}

function RecordBar({ w, d, l }: { w: number; d: number; l: number }) {
  const total = w + d + l;
  if (total === 0) {
    return <p className="text-[11px] text-[var(--color-text-secondary)]">No data</p>;
  }
  const segments: { count: number; label: string; bg: string; text: string }[] = [
    { count: w, label: `${w} W`, bg: "var(--color-success)", text: "#ffffff" },
    { count: d, label: `${d}`, bg: "var(--color-draw)", text: "var(--color-text)" },
    { count: l, label: `${l} L`, bg: "var(--color-danger)", text: "#ffffff" },
  ];
  return (
    <div className="flex h-[26px] w-full overflow-hidden rounded-[6px]">
      {segments.map((segment) =>
        segment.count === 0 ? null : (
          <div
            key={segment.label}
            className="flex shrink-0 items-center justify-center overflow-hidden"
            style={{ width: `${(segment.count / total) * 100}%`, background: segment.bg }}
          >
            {/* Hide the label when the segment is too narrow to hold it. */}
            {(segment.count / total) * 100 >= 9 ? (
              <span
                className="whitespace-nowrap text-[11px] font-bold"
                style={{ color: segment.text }}
              >
                {segment.label}
              </span>
            ) : null}
          </div>
        )
      )}
    </div>
  );
}

const RANK_BG: Record<1 | 2 | 3, string> = {
  1: "var(--color-rank-gold)",
  2: "var(--color-rank-silver)",
  3: "var(--color-rank-bronze)",
};

type BadgeProps = {
  badge?: string;
  badgeClass?: string;
  badgeStyle?: React.CSSProperties;
};

/** BEST / 2ND / 3RD at the top, WORST at the bottom, plain "#12" in between. */
const wordRankBadge = (rank?: number, isWorst?: boolean): BadgeProps => {
  if (rank && rank <= 3) {
    return {
      badge: rank === 1 ? "BEST" : rank === 2 ? "2ND" : "3RD",
      badgeClass: "text-white",
      badgeStyle: { background: RANK_BG[rank as 1 | 2 | 3] },
    };
  }
  if (isWorst) {
    return { badge: "WORST", badgeClass: "bg-[var(--color-danger)] text-white" };
  }
  if (rank) return { badge: `#${rank}` };
  return {};
};

export default function PlayerDrawer({
  playerId,
  avgGoalsRank,
  isWorstAttacker = false,
  avgConcededRank,
  isWorstDefender = false,
  totalGdRank,
}: {
  playerId: string;
  avgGoalsRank?: number;
  isWorstAttacker?: boolean;
  avgConcededRank?: number;
  isWorstDefender?: boolean;
  totalGdRank?: number;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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

  const formCount = data?.form.length ?? 0;
  // Form runs oldest -> newest, so open scrolled to the newest end.
  useEffect(() => {
    const el = formScrollRef.current;
    if (!el || formCount === 0) return;
    // Assigning scrollLeft fires a scroll event, so handleFormScroll keeps the
    // progress indicator in sync without setting state here.
    el.scrollLeft = el.scrollWidth;
  }, [formCount]);

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
            <div key={i} className="h-14 animate-pulse rounded-[8px] bg-[rgba(15,61,52,0.08)]" />
          ))}
        </div>
        <div className="h-[26px] animate-pulse rounded-full bg-[rgba(15,61,52,0.12)]" />
      </div>
    );
  }

  const selectedEntry = selectedIndex !== null ? data.form[selectedIndex] ?? null : null;

  const showTeamWinRates =
    data.darkWinRate !== null && data.whitesWinRate !== null;

  const winRate = data.gamesPlayed > 0 ? data.record.w / data.gamesPlayed : null;
  const totalGd = data.goalsFor - data.goalsAgainst;

  return (
    <>
      {/* Form + PPG */}
      <SectionHeader
        label="Form"
        meta="oldest → latest"
        className="mt-4"
      />
      <Card>
        <div className="flex items-stretch gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
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
                  {data.form
                    .map((entry, i) => ({ entry, i }))
                    .reverse()
                    .map(({ entry, i }) => (
                      <FormTile
                        key={i}
                        result={entry.result}
                        team={entry.team}
                        onClick={() => setSelectedIndex(i)}
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
              </>
            )}
          </div>
          <div className="w-px shrink-0 bg-[rgba(15,61,52,0.08)]" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-baseline justify-between gap-2">
              <p className={KICKER}>PPG</p>
              <p className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--color-text)]">
                {data.ppg.toFixed(2)}
              </p>
            </div>
            <PpgSparkline data={data.ppgTrend} />
          </div>
        </div>
      </Card>

      {data.lastPlayedDate ? (
        <p className="mt-3 text-[11px] text-[var(--color-text-secondary)]">
          Last played{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {formatShortGameDate(data.lastPlayedDate)}
          </span>
        </p>
      ) : null}

      {/* Record */}
      <SectionHeader
        label="Record"
        meta={`${data.gamesPlayed} GP`}
        className="mt-4"
      />
      <Card>
        <RecordBar w={data.record.w} d={data.record.d} l={data.record.l} />
        <div className="mt-3 grid grid-cols-3 divide-x divide-[rgba(15,61,52,0.08)]">
          <Stat
            value={winRate !== null ? `${Math.round(winRate * 100)}%` : "-"}
            label="Win rate"
          />
          <Stat
            value={
              data.biggestWin
                ? `${data.biggestWin.goalsFor}–${data.biggestWin.goalsAgainst}`
                : "-"
            }
            label="Biggest win"
            valueClass={data.biggestWin ? "text-[var(--color-success)]" : undefined}
          />
          <Stat
            value={
              data.heaviestDefeat
                ? `${data.heaviestDefeat.goalsFor}–${data.heaviestDefeat.goalsAgainst}`
                : "-"
            }
            label="Heaviest loss"
            valueClass={data.heaviestDefeat ? "text-[var(--color-danger)]" : undefined}
          />
        </div>
      </Card>

      {/* Goals per game */}
      <SectionHeader label="Goals per game" className="mt-4" />
      <Card>
        <div className="grid grid-cols-3 divide-x divide-[rgba(15,61,52,0.08)]">
          <Stat
            topLabel="For"
            value={String(data.avgGoalsPerGame)}
            label="Attack"
            labelTone="caption"
            {...wordRankBadge(avgGoalsRank, isWorstAttacker)}
          />
          <Stat
            topLabel="Against"
            value={String(data.avgConcededPerGame)}
            label="Defence"
            labelTone="caption"
            {...wordRankBadge(avgConcededRank, isWorstDefender)}
          />
          <Stat
            topLabel="Total GD"
            value={`${totalGd > 0 ? "+" : ""}${totalGd}`}
            label="Overall"
            labelTone="caption"
            valueClass={
              totalGd > 0
                ? "text-[var(--color-success)]"
                : totalGd < 0
                  ? "text-[var(--color-danger)]"
                  : undefined
            }
            {...wordRankBadge(totalGdRank)}
          />
        </div>
      </Card>

      {/* Team picks */}
      <SectionHeader label="Team picks" className="mt-4" />
      <div className="mt-1.5">
        <TeamPicksBar darks={data.teamPicks.darks} whites={data.teamPicks.whites} />
        {showTeamWinRates && (
          <div className="mt-1.5 flex items-baseline justify-between text-[11px] text-[var(--color-text-secondary)]">
            <span>
              <span className="font-semibold text-[var(--color-text)]">
                {Math.round(data.darkWinRate! * 100)}%
              </span>{" "}
              won
            </span>
            <span>
              <span className="font-semibold text-[var(--color-text)]">
                {Math.round(data.whitesWinRate! * 100)}%
              </span>{" "}
              won
            </span>
          </div>
        )}
      </div>

      {/* Best teammates + Toughest opponent, side by side */}
      {(data.bestTeammates.length > 0 || data.toughestOpponent) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col">
            <SectionHeader label="Best teammates" />
            {data.bestTeammates.length === 0 ? (
              <p className="mt-1.5 text-[11px] text-[var(--color-text-secondary)]">
                No data
              </p>
            ) : (
              <div className="mt-1.5 space-y-1">
                {data.bestTeammates.map((t) => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <span className="w-14 shrink-0 truncate text-[11px] font-medium text-[var(--color-text)]">
                      {t.name}
                    </span>
                    <div className="h-[18px] min-w-0 flex-1 overflow-hidden rounded-full bg-[rgba(15,61,52,0.08)]">
                      <div
                        className="flex h-full items-center justify-end overflow-hidden rounded-full bg-[var(--color-success)] px-1.5"
                        style={{ width: `${t.winRate * 100}%` }}
                      >
                        <span className="whitespace-nowrap text-[9px] font-bold text-white">
                          {Math.round(t.winRate * 100)}%
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[10px] text-[var(--color-text-secondary)]">
                      {t.gp} GP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col">
            <SectionHeader label="Toughest opponent" />
            {!data.toughestOpponent ? (
              <p className="mt-1.5 text-[11px] text-[var(--color-text-secondary)]">
                No data
              </p>
            ) : (
              <div className="mt-1.5 flex flex-1 flex-col justify-center rounded-[8px] border border-[rgba(229,72,77,0.2)] bg-[var(--color-background)] px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-1">
                  <p className="min-w-0 truncate text-[13px] font-semibold text-[var(--color-text)]">
                    {data.toughestOpponent.name}
                  </p>
                  <p className="shrink-0 text-lg font-bold tracking-[-0.03em] text-[var(--color-danger)]">
                    {Math.round(data.toughestOpponent.winRate * 100)}%
                  </p>
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <p className="text-[10px] text-[var(--color-text-secondary)]">
                    Lost {data.toughestOpponent.losses} of {data.toughestOpponent.gp}
                  </p>
                  <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                    Win rate
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pb-3" />

      <Modal
        isOpen={selectedIndex !== null}
        title={selectedEntry ? formatGameweekDate(selectedEntry.gameDate) : ""}
        onClose={() => setSelectedIndex(null)}
        closeVariant="icon"
        position="top"
        topOffsetClassName="pt-3"
        panelMaxHeightClassName="max-h-[calc(100dvh-1.5rem)]"
        onPrev={() => setSelectedIndex((i) => (i === null ? i : i + 1))}
        onNext={() => setSelectedIndex((i) => (i === null ? i : i - 1))}
        prevDisabled={selectedIndex === null || selectedIndex >= data.form.length - 1}
        nextDisabled={selectedIndex === null || selectedIndex <= 0}
      >
        {selectedEntry && <GameweekDetail entry={selectedEntry} />}
      </Modal>
    </>
  );
}
