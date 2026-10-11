"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import Modal from "@/components/Modal";
import TrophyIcon from "@/components/TrophyIcon";
import { formatShortGameweekDate } from "@/lib/utils";
import {
  getPotmVoteCookieMaxAgeSeconds,
  getPotmVoteCookieName,
  getPotmVoteRecord,
  getPotmVoteStorageKey,
  mergePotmVoteMaps,
  parsePotmVoteCookie,
  serializePotmVoteCookie,
  setPotmVoteRecord,
  type PotmVoteMap,
  type PotmVoteRecord,
} from "@/lib/potmVoteCookie";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { PotmOverview, PotmVoterAuditEntry } from "@/lib/types";

type PotmVoteFlowProps = {
  gameweekId: string;
  gameDate: string;
  gameweekLabel: string;
  darksScore: number | null;
  whitesScore: number | null;
  votingClosed: boolean;
};

type Phase = "voter" | "candidate";

function BackArrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 5.5 7 10l4.5 4.5" />
    </svg>
  );
}

function RadioDot({ checked, isDark }: { checked: boolean; isDark: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
        checked
          ? "border-[var(--color-rank-gold)] bg-[var(--color-rank-gold)]"
          : isDark
            ? "border-white/45"
            : "border-[var(--color-border)]"
      }`}
      aria-hidden="true"
    >
      {checked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
    </span>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full bg-[var(--color-accent)]">
      <path
        d="M6 10.2 8.6 12.8 14 7"
        fill="none"
        stroke="var(--color-primary-dark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 5.5 13 10l-4.5 4.5" />
    </svg>
  );
}

function GoldPlayerIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="11.5" cy="8.5" r="4" fill="var(--color-rank-gold)" />
      <path
        d="M4 20.5c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5"
        fill="var(--color-rank-gold)"
      />
      <path
        d="m18.5 2.5.72 1.46 1.61.23-1.17 1.14.28 1.6-1.44-.76-1.44.76.28-1.6-1.17-1.14 1.61-.23z"
        fill="var(--color-rank-gold)"
      />
    </svg>
  );
}

function VoteHero({
  gameDate,
  votingClosed,
}: {
  gameDate: string;
  votingClosed: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] ${
            votingClosed ? "text-[var(--color-text-secondary)]" : "text-[var(--color-success)]"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {votingClosed ? null : (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-75 motion-reduce:animate-none" />
            )}
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                votingClosed ? "bg-[var(--color-text-secondary)]" : "bg-[var(--color-success)]"
              }`}
            />
          </span>
          {votingClosed ? "Voting closed" : "Voting open"}
        </span>
        <span className="text-[0.7rem] text-[var(--color-text-secondary)]">
          Gameweek: {formatShortGameweekDate(gameDate)}
        </span>
      </div>

      <h1 className="mt-2 text-[1.75rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-[var(--color-text)]">
        Player of the Match
      </h1>

      <span className="mt-2 block h-1 w-7 rounded-full bg-[var(--color-rank-gold)]" aria-hidden="true" />
    </div>
  );
}

function TeamColumn({
  title,
  players,
  isDark,
  isWinner,
  selectedId,
  disabledIds,
  disabledLabel,
  onSelect,
}: {
  title: string;
  players: { id: string; name: string }[];
  isDark: boolean;
  isWinner?: boolean;
  selectedId: string | null;
  disabledIds?: string[];
  disabledLabel?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-[8px] border p-3 ${
        isDark
          ? "border-[rgba(15,61,52,0.16)] bg-[var(--color-primary-dark)]"
          : "border-[var(--color-border)] bg-[rgba(255,255,255,0.9)]"
      }`}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <h3
          className={`text-xs font-semibold uppercase tracking-[0.18em] ${
            isDark ? "text-white/80" : "text-[var(--color-text-secondary)]"
          }`}
        >
          {title}
        </h3>
        <span
          className={isWinner ? undefined : "invisible"}
          aria-hidden={!isWinner}
          aria-label={isWinner ? `${title} winners` : undefined}
        >
          <TrophyIcon className="h-5 w-5" />
        </span>
      </div>
      <div className="space-y-2">
        {players.map((player) => {
          const isSelected = player.id === selectedId;
          const isDisabled = disabledIds?.includes(player.id) ?? false;
          return (
            <button
              key={player.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(player.id)}
              className={`flex w-full items-center gap-2.5 rounded-[8px] border px-3 py-2.5 text-left text-sm font-semibold transition ${
                isDisabled
                  ? isDark
                    ? "cursor-not-allowed border-white/10 bg-white/5 text-white/40"
                    : "cursor-not-allowed border-[var(--color-border)] bg-[rgba(229,231,235,0.35)] text-[var(--color-text-secondary)]"
                  : isSelected
                    ? "border-[var(--color-rank-gold)] bg-white text-[var(--color-text)] ring-2 ring-[var(--color-rank-gold)]"
                    : isDark
                      ? "border-white/12 bg-white/8 text-white hover:bg-white/14"
                      : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[rgba(31,122,99,0.3)] hover:bg-[var(--off-white-green)]"
              }`}
            >
              {isDisabled ? (
                <span className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <RadioDot checked={isSelected} isDark={isDark} />
              )}
              <span className="min-w-0 flex-1 truncate">
                {player.name}
                {isDisabled && disabledLabel ? (
                  <span className="font-normal opacity-70"> ({disabledLabel})</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TeamVotePicker({
  players,
  selectedId,
  disabledIds,
  disabledLabel,
  winner,
  onSelect,
}: {
  players: { id: string; name: string; team: "darks" | "whites" }[];
  selectedId: string | null;
  disabledIds?: string[];
  disabledLabel?: string;
  winner?: "darks" | "whites" | null;
  onSelect: (id: string) => void;
}) {
  const darksPlayers = players
    .filter((player) => player.team === "darks")
    .sort((a, b) => a.name.localeCompare(b.name));
  const whitesPlayers = players
    .filter((player) => player.team === "whites")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid grid-cols-2 gap-3">
      <TeamColumn
        title="Darks"
        players={darksPlayers}
        isDark
        isWinner={winner === "darks"}
        selectedId={selectedId}
        disabledIds={disabledIds}
        disabledLabel={disabledLabel}
        onSelect={onSelect}
      />
      <TeamColumn
        title="Whites"
        players={whitesPlayers}
        isDark={false}
        isWinner={winner === "whites"}
        selectedId={selectedId}
        disabledIds={disabledIds}
        disabledLabel={disabledLabel}
        onSelect={onSelect}
      />
    </div>
  );
}

function TeamChip({ team }: { team: "darks" | "whites" }) {
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[0.65rem] font-bold uppercase tracking-[0.04em] ${
        team === "darks"
          ? "bg-[var(--color-primary-dark)] text-white"
          : "border border-[var(--color-border)] bg-white text-[var(--color-text)]"
      }`}
    >
      {team === "darks" ? "D" : "W"}
    </span>
  );
}

function AdminVoterAudit({ gameweekId }: { gameweekId: string }) {
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const { data, error } = useSWR<{ voters: PotmVoterAuditEntry[] }>(
    isUnlocked && organiserPin ? [`/api/gameweeks/${gameweekId}/potm/voters`, organiserPin] : null,
    ([url, pin]: [string, string]) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      }).then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "Failed to load voters.");
        return body;
      })
  );

  if (!isUnlocked) return null;

  const voters = data?.voters ?? [];
  const voted = voters.filter((voter) => voter.votedPlayerId);
  const notVoted = voters.filter((voter) => !voter.votedPlayerId);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <p className="ui-kicker">Organiser · vote tracker</p>
        {data ? (
          <span className="text-xs text-[var(--color-text-secondary)]">
            {voted.length}/{voters.length} voted
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="ui-banner ui-banner-danger mt-2">{(error as Error).message}</p>
      ) : !data ? (
        <div className="ui-skeleton mt-2 h-40" />
      ) : (
        <div className="mt-2 overflow-hidden rounded-[8px] border border-[var(--color-border)] bg-white">
          <AuditGroupHeading label="Voted" count={voted.length} />
          {voted.length === 0 ? (
            <AuditEmptyRow text="Nobody has voted yet." />
          ) : (
            <ul>
              {voted.map((voter) => (
                <li key={voter.voterId} className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-3.5 py-2.5 last:border-b-0">
                  <TeamChip team={voter.voterTeam} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text)]">
                    {voter.voterName}
                  </span>
                  <ChevronRightIcon />
                  <span className="min-w-0 max-w-[45%] truncate text-sm font-semibold text-[var(--color-primary-dark)]">
                    {voter.votedPlayerName}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <AuditGroupHeading label="Not voted" count={notVoted.length} withTopBorder />
          {notVoted.length === 0 ? (
            <AuditEmptyRow text="Everyone has voted." />
          ) : (
            <ul>
              {notVoted.map((voter) => (
                <li key={voter.voterId} className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-3.5 py-2.5 last:border-b-0">
                  <TeamChip team={voter.voterTeam} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text)]">
                    {voter.voterName}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">
                    Awaiting vote
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function AuditGroupHeading({
  label,
  count,
  withTopBorder,
}: {
  label: string;
  count: number;
  withTopBorder?: boolean;
}) {
  return (
    <p
      className={`${
        withTopBorder ? "border-y" : "border-b"
      } border-[var(--color-border)] bg-[var(--off-white-green)] px-3.5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]`}
    >
      {label} ({count})
    </p>
  );
}

function AuditEmptyRow({ text }: { text: string }) {
  return (
    <p className="px-3.5 py-3 text-sm italic text-[var(--color-text-secondary)]">{text}</p>
  );
}

const readVoteMap = (): PotmVoteMap => {
  if (typeof document === "undefined") return {};
  const rawCookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${getPotmVoteCookieName()}=`))
    ?.slice(getPotmVoteCookieName().length + 1);
  const cookieMap = parsePotmVoteCookie(rawCookie);
  const storedMap = parsePotmVoteCookie(window.localStorage.getItem(getPotmVoteStorageKey()));
  return mergePotmVoteMaps(cookieMap, storedMap);
};

const writeVoteMap = (map: PotmVoteMap) => {
  if (typeof document === "undefined") return;
  const serialized = serializePotmVoteCookie(map);
  document.cookie = `${getPotmVoteCookieName()}=${serialized}; max-age=${getPotmVoteCookieMaxAgeSeconds()}; path=/; samesite=lax`;
  window.localStorage.setItem(getPotmVoteStorageKey(), serialized);
};

const persistVoteRecord = (gameweekId: string, record: PotmVoteRecord) => {
  writeVoteMap(setPotmVoteRecord(readVoteMap(), gameweekId, record));
};

export default function PotmVoteFlow({
  gameweekId,
  gameDate,
  gameweekLabel,
  darksScore,
  whitesScore,
  votingClosed,
}: PotmVoteFlowProps) {
  const [voteRecord, setVoteRecord] = useState<PotmVoteRecord | null | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("voter");
  const [voterId, setVoterId] = useState<string | null>(null);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [spectating, setSpectating] = useState(false);
  const [localResult, setLocalResult] = useState<{
    votedForId: string;
    tally: PotmOverview["tally"];
    totalVotes: number;
  } | null>(null);

  useEffect(() => {
    setVoteRecord(getPotmVoteRecord(readVoteMap(), gameweekId));
  }, [gameweekId]);

  const query = new URLSearchParams();
  if (voteRecord) query.set("voterPlayerId", voteRecord.voterPlayerId);
  else if (spectating) query.set("spectate", "true");
  const queryString = query.toString();

  const { data, isLoading, mutate } = useSWR<PotmOverview>(
    `/api/gameweeks/${gameweekId}/potm${queryString ? `?${queryString}` : ""}`,
    fetcher
  );

  if (voteRecord === undefined || isLoading || !data) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="ui-skeleton h-8 w-32" />
        <div className="ui-skeleton mt-4 h-40" />
      </div>
    );
  }

  if (data.eligiblePlayers.length === 0) {
    return (
      <div className="ui-card mx-auto max-w-lg p-6 text-center">
        <p className="text-[0.9375rem] text-[var(--color-text-secondary)]">
          No teams were selected for this gameweek, so there&apos;s nothing to vote on.
        </p>
        <Link href="/history" className="ui-btn ui-btn-secondary mt-4 inline-flex">
          Back to results
        </Link>
      </div>
    );
  }

  const hasVoted = Boolean(localResult) || data.hasVoted;
  const votedForId = localResult?.votedForId ?? data.votedForId;
  const tally = localResult?.tally ?? data.tally;
  const totalVotes = localResult?.totalVotes ?? data.totalVotes;
  const topThree = tally.slice(0, 3);
  const maxVotes = topThree.reduce((max, entry) => Math.max(max, entry.votes), 0);
  const votedForName = data.eligiblePlayers.find((player) => player.id === votedForId)?.name;
  const totalEligible = data.eligiblePlayers.length;
  const remainingToVote = Math.max(totalEligible - totalVotes, 0);

  const sortedOptions = [...data.eligiblePlayers].sort((a, b) => a.name.localeCompare(b.name));
  const voterName = sortedOptions.find((player) => player.id === voterId)?.name;
  const candidateName = sortedOptions.find((player) => player.id === votedId)?.name;
  const hasScore = typeof darksScore === "number" && typeof whitesScore === "number";
  const winningSide = hasScore
    ? darksScore > whitesScore
      ? "darks"
      : whitesScore > darksScore
        ? "whites"
        : null
    : null;

  const handleSubmit = async () => {
    if (!voterId || !votedId) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/gameweeks/${gameweekId}/potm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterPlayerId: voterId, votedPlayerId: votedId }),
      });
      const body = await response.json();
      const record: PotmVoteRecord = {
        voterPlayerId: voterId,
        votedPlayerId: votedId,
        votedAt: Date.now(),
      };

      if (!response.ok) {
        if (response.status === 409) {
          persistVoteRecord(gameweekId, record);
          setVoteRecord(record);
        }
        setError(body.error ?? "Failed to submit vote.");
        return;
      }

      persistVoteRecord(gameweekId, record);
      setVoteRecord(record);
      setLocalResult({
        votedForId: body.votedForId,
        tally: body.tally,
        totalVotes: body.totalVotes,
      });
      void mutate();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (hasVoted || spectating) {
    const rankCircleBg = ["var(--color-rank-gold)", "rgba(107,122,141,0.14)", "rgba(205,139,78,0.14)"];
    const rankCircleText = ["var(--color-primary-dark)", "var(--color-rank-silver)", "var(--color-rank-bronze)"];
    const rankBarColor = ["var(--color-rank-gold)", "rgba(107,122,141,0.55)", "rgba(205,139,78,0.55)"];
    const isVotingLive = !votingClosed && remainingToVote > 0;

    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-[8px] bg-[var(--color-primary-dark)] p-5 text-white">
          {votedForName ? (
            <div className="flex items-center gap-2">
              <CheckCircleIcon />
              <p className="text-sm text-white/85">
                You voted for <span className="font-semibold text-white">{votedForName}</span>
              </p>
            </div>
          ) : null}

          <h1 className="mt-3 text-[2rem] font-extrabold leading-none tracking-[-0.02em]">Votes are in</h1>
          <p className="mt-1.5 text-sm text-white/65">{gameweekLabel}</p>

          <div className="mt-4 flex items-center gap-1">
            {Array.from({ length: totalEligible }).map((_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < totalVotes ? "bg-[var(--color-accent)]" : "bg-white/15"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-white/70">
            <span>
              {totalVotes} of {totalEligible} voted
            </span>
            <span>{remainingToVote} still to vote</span>
          </div>
        </div>

        <p className="ui-kicker mt-6">Podium</p>
        <div className="mt-2 space-y-2.5">
          {topThree.map((entry, index) => {
            const isEmpty = entry.votes === 0;
            const pct = maxVotes > 0 ? Math.round((entry.votes / maxVotes) * 100) : 0;
            const circleBg = isEmpty ? "var(--color-border)" : rankCircleBg[index];
            const circleText = isEmpty ? "var(--color-text-secondary)" : rankCircleText[index];
            const barColor = isEmpty ? "var(--color-border)" : rankBarColor[index];
            const isYourVote = entry.playerId === votedForId;
            const isLeader = index === 0 && !isEmpty;
            return (
              <div
                key={entry.playerId}
                className={`rounded-[8px] border p-3.5 ${
                  isLeader
                    ? "border-[rgba(232,184,75,0.4)] bg-[rgba(232,184,75,0.1)]"
                    : "border-[var(--color-border)] bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: circleBg, color: circleText }}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate text-sm font-semibold ${
                          isEmpty ? "italic text-[var(--color-text-secondary)]" : "text-[var(--color-text)]"
                        }`}
                      >
                        {isEmpty ? "Awaiting votes…" : entry.name}
                      </span>
                      {isYourVote ? (
                        <span className="shrink-0 rounded-full bg-[rgba(232,184,75,0.25)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.04em] text-[var(--color-primary-dark)]">
                          Your vote
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {isEmpty ? null : (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-primary-dark)] px-1 text-[0.65rem] font-bold text-white">
                        {entry.darksVotes}
                      </span>
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-1 text-[0.65rem] font-bold text-[var(--color-text)]">
                        {entry.whitesVotes}
                      </span>
                      <span className="text-sm text-[var(--color-text-secondary)] underline decoration-[rgba(15,61,52,0.25)] underline-offset-2">
                        {entry.votes} vote{entry.votes === 1 ? "" : "s"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(15,61,52,0.08)]">
                  <div
                    className="relative h-full overflow-hidden rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.max(pct, entry.votes > 0 ? 6 : 0)}%`,
                      background: barColor,
                    }}
                  >
                    {isVotingLive && !isEmpty ? (
                      <span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/55 to-transparent motion-reduce:hidden"
                        style={{ animation: "ui-bar-shimmer 1.6s ease-in-out infinite" }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <Link
            href="/league"
            className="flex items-center justify-between rounded-[8px] bg-[var(--off-white-green)] px-4 py-3.5 font-semibold text-[var(--color-text)]"
          >
            League table
            <ChevronRightIcon />
          </Link>
        </div>

        <AdminVoterAudit gameweekId={gameweekId} />
      </div>
    );
  }

  if (votingClosed) {
    return (
      <div className="mx-auto max-w-lg">
        <VoteHero gameDate={gameDate} votingClosed={votingClosed} />

        <div className="ui-card mt-6 p-6 text-center">
          <GoldPlayerIcon className="mx-auto h-9 w-9" />
          <h1 className="mt-3 text-xl font-bold tracking-[-0.02em] text-[var(--color-text)]">
            Voting has closed
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            The next gameweek has kicked off, so Player of the Match voting for {gameweekLabel} is no
            longer open.
          </p>
        </div>

        <Link href="/history" className="ui-btn ui-btn-secondary mt-4 w-full">
          See past results
        </Link>

        <Link href="/league" className="ui-btn ui-btn-secondary mt-2 w-full">
          See league table
        </Link>
      </div>
    );
  }

  if (phase === "voter") {
    return (
      <div className="mx-auto max-w-lg">
        <VoteHero gameDate={gameDate} votingClosed={votingClosed} />

        <div className="mb-4 mt-5">
          <p className="ui-kicker">Step 1 of 2</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[var(--color-text)] sm:text-3xl">
            Select who you are
          </h1>
        </div>

        <TeamVotePicker
          players={sortedOptions}
          selectedId={voterId}
          disabledIds={data.votedVoterIds}
          disabledLabel="voted"
          winner={winningSide}
          onSelect={(id) => {
            setVoterId(id);
            setPhase("candidate");
          }}
        />

        <button
          type="button"
          onClick={() => setSpectating(true)}
          className="ui-btn mt-3 w-full border border-[var(--color-border)] bg-[var(--off-white-green)] text-[var(--color-text)]"
        >
          I didn&apos;t play
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <VoteHero gameDate={gameDate} votingClosed={votingClosed} />

      <div className="mb-4 mt-5">
        <p className="ui-kicker">Step 2 of 2</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[var(--color-text)] sm:text-3xl">
          Who gets your vote{voterName ? `, ${voterName}` : ""}?
        </h1>
      </div>

      <TeamVotePicker
        players={sortedOptions}
        selectedId={votedId}
        disabledIds={voterId ? [voterId] : []}
        disabledLabel="you"
        winner={winningSide}
        onSelect={(id) => {
          setVotedId(id);
          setConfirmOpen(true);
        }}
      />

      <button
        type="button"
        onClick={() => setPhase("voter")}
        className="ui-btn-ghost -ml-2 mt-4 inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1.5 text-sm font-medium"
      >
        <BackArrow />
        Change name
      </button>

      <Modal
        isOpen={confirmOpen}
        title={`Confirm your vote${voterName ? `, ${voterName}` : ""}:`}
        onClose={() => setConfirmOpen(false)}
        position="center"
        closeVariant="icon"
      >
        <div className="text-left">
          <p className="text-base leading-relaxed text-[var(--color-text)]">
            Your Player of the Match vote is for{" "}
            <span className="font-semibold text-[var(--color-primary-dark)]">{candidateName}</span>.
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Voting is anonymous.</p>

          {error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p> : null}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="ui-btn ui-btn-secondary flex-1"
            >
              Change
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary flex-1"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
