"use client";

import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import Modal from "@/components/Modal";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import type { LeagueSortDirection, LeagueStatRow } from "@/lib/types";

type SortKey =
  | "gp"
  | "w"
  | "d"
  | "l"
  | "winPct"
  | "goalDifference";

const columns: [SortKey, string][] = [
  ["gp", "GP"],
  ["w", "W"],
  ["d", "D"],
  ["l", "L"],
  ["goalDifference", "GD"],
  ["winPct", "W%"],
];

const compareByName = (a: LeagueStatRow, b: LeagueStatRow) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const compareNumeric = (
  a: number,
  b: number,
  direction: LeagueSortDirection
) => (direction === "desc" ? b - a : a - b);

export default function LeagueTableClient({ rows }: { rows: LeagueStatRow[] }) {
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const { mutate } = useSWRConfig();
  const [sortKey, setSortKey] = useState<SortKey>("w");
  const [direction, setDirection] = useState<LeagueSortDirection>("desc");
  const [playerPendingArchive, setPlayerPendingArchive] = useState<LeagueStatRow | null>(null);
  const [archiveInput, setArchiveInput] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const sorted = useMemo(() => {
    const sortedRows = [...rows];

    sortedRows.sort((a, b) => {
      if (sortKey === "w") {
        const winsDiff = compareNumeric(a.w, b.w, direction);
        if (winsDiff !== 0) return winsDiff;

        const gamesPlayedDiff = compareNumeric(a.gp, b.gp, direction);
        if (gamesPlayedDiff !== 0) return gamesPlayedDiff;

        return compareByName(a, b);
      }

      const diff = compareNumeric(a[sortKey], b[sortKey], direction);
      if (diff !== 0) return diff;

      return compareByName(a, b);
    });

    return sortedRows;
  }, [rows, sortKey, direction]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection("desc");
  };

  const closeArchiveModal = () => {
    if (isArchiving) return;
    setPlayerPendingArchive(null);
    setArchiveInput("");
  };

  const refreshLeagueRelatedData = async () => {
    await Promise.all([
      mutate("/api/league/overview"),
      mutate("/api/game/overview"),
      mutate("/api/teams/overview"),
      mutate((key) => typeof key === "string" && key.startsWith("/api/results/overview")),
    ]);
  };

  const handleArchivePlayer = async () => {
    if (!playerPendingArchive || !organiserPin) return;
    if (archiveInput.trim() !== "ARCHIVE") {
      setMessage({ type: "error", text: 'Type "ARCHIVE" to confirm.' });
      return;
    }

    setIsArchiving(true);
    setMessage(null);

    const response = await fetch("/api/players/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: playerPendingArchive.id, pin: organiserPin }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage({
        type: "error",
        text: data?.error ?? "Failed to archive player.",
      });
      setIsArchiving(false);
      return;
    }

    await refreshLeagueRelatedData();
    setMessage({
      type: "success",
      text: `${playerPendingArchive.name} was archived.`,
    });
    setIsArchiving(false);
    setPlayerPendingArchive(null);
    setArchiveInput("");
  };

  return (
    <div className="space-y-3">
      {message ? (
        <div
          className={`rounded-xl px-3 py-2 text-sm ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col style={{ width: "40%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Player</th>
              {columns.map(([key, label]) => (
                <th
                  key={key}
                  className="relative cursor-pointer px-2 py-2 text-center align-middle"
                  onClick={() => toggleSort(key)}
                >
                  <div className="flex items-center justify-center leading-tight">
                    <span>{label}</span>
                  </div>
                  {sortKey === key ? (
                    <span className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px]">
                      {direction === "asc" ? "▲" : "▼"}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length > 0 ? (
              sorted.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 align-middle font-medium text-slate-800">
                    <div className="relative flex min-h-8 items-center pr-10">
                      <span>{row.name}</span>
                      {isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            setArchiveInput("");
                            setPlayerPendingArchive(row);
                          }}
                          className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
                          aria-label={`Archive ${row.name}`}
                        >
                          X
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-middle text-center text-slate-600">{row.gp}</td>
                  <td className="px-2 py-2 align-middle text-center text-slate-600">{row.w}</td>
                  <td className="px-2 py-2 align-middle text-center text-slate-600">{row.d}</td>
                  <td className="px-2 py-2 align-middle text-center text-slate-600">{row.l}</td>
                  <td className="px-2 py-2 align-middle text-center text-slate-600">{row.goalDifference}</td>
                  <td className="px-2 py-2 align-middle text-center text-slate-600">
                    {row.winPct.toFixed(0)}%
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No locked results yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={Boolean(playerPendingArchive)}
        title="Archive player"
        onClose={closeArchiveModal}
        position="top"
      >
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            This will archive{" "}
            <span className="font-semibold text-slate-900">
              {playerPendingArchive?.name}
            </span>{" "}
            and remove them from future selection.
          </p>
          <p>
            They will no longer appear in active dropdowns and player lists, but historical
            gameweek entries, results, and league data will be preserved.
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
            Type <span className="font-semibold text-amber-900">ARCHIVE</span> to confirm.
          </div>
          <input
            type="text"
            value={archiveInput}
            onChange={(event) => setArchiveInput(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base text-slate-900"
            placeholder="ARCHIVE"
            autoCapitalize="characters"
          />
          {message?.type === "error" ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {message.text}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleArchivePlayer}
            disabled={isArchiving}
            className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isArchiving ? "Archiving..." : "Archive player"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
