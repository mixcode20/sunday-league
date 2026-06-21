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
  | "ppg"
  | "winPct"
  | "goalDifference";

const columns: [SortKey, string][] = [
  ["gp", "GP"],
  ["w", "W"],
  ["l", "L"],
  ["winPct", "W%"],
  ["ppg", "PPG"],
  ["goalDifference", "GD"],
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
  const [sortKey, setSortKey] = useState<SortKey>("winPct");
  const [direction, setDirection] = useState<LeagueSortDirection>("desc");
  const [playerPendingArchive, setPlayerPendingArchive] = useState<LeagueStatRow | null>(null);
  const [archiveInput, setArchiveInput] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const { sorted, div2Sorted } = useMemo(() => {
    const div1 = rows.filter((r) => r.gp >= 3);
    const div2 = rows.filter((r) => r.gp >= 1 && r.gp < 3);

    const sorter = (a: LeagueStatRow, b: LeagueStatRow) => {
      if (sortKey === "winPct") {
        const winPctDiff = compareNumeric(a.winPct, b.winPct, direction);
        if (winPctDiff !== 0) return winPctDiff;

        const goalDifferenceDiff = compareNumeric(a.goalDifference, b.goalDifference, direction);
        if (goalDifferenceDiff !== 0) return goalDifferenceDiff;

        // Fewest games played ranks higher (ascending regardless of direction)
        const gpDiff = a.gp - b.gp;
        if (gpDiff !== 0) return gpDiff;

        return compareByName(a, b);
      }

      const diff = compareNumeric(a[sortKey], b[sortKey], direction);
      if (diff !== 0) return diff;

      return compareByName(a, b);
    };

    return {
      sorted: [...div1].sort(sorter),
      div2Sorted: [...div2].sort(sorter),
    };
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
          className={`ui-banner ${
            message.type === "success"
              ? "ui-banner-success"
              : "ui-banner-danger"
          }`}
        >
          {message.text}
        </div>
      ) : null}
      <div className="ui-table-shell">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col style={{ width: "37%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
          </colgroup>
          <thead className="text-[11px] uppercase tracking-[0.14em] text-white">
            <tr>
              <th className="sticky top-[69px] z-10 rounded-tl-lg bg-[var(--color-primary-dark)] px-3 py-[0.85rem]">
                Player
              </th>
              {columns.map(([key, label]) => (
                <th
                  key={key}
                  className="relative sticky top-[69px] z-10 cursor-pointer bg-[var(--color-primary-dark)] px-2 py-[0.85rem] text-center align-middle last:rounded-tr-lg"
                  onClick={() => toggleSort(key)}
                >
                  <div className="flex items-center justify-center leading-tight">
                    <span>{label}</span>
                  </div>
                  {sortKey === key ? (
                    <span className="pointer-events-none absolute bottom-[0.2rem] left-1/2 -translate-x-1/2 text-[10px]">
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
                <tr
                  key={row.id}
                  className="border-t border-[rgba(229,231,235,0.9)] bg-[var(--off-white-green)]"
                >
                  <td className="px-3 py-2.5 align-middle font-medium text-[var(--color-text)]">
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
                          className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-danger)] bg-[var(--color-danger)] text-sm font-semibold leading-none text-white shadow-[0_6px_16px_rgba(229,72,77,0.22)]"
                          aria-label={`Archive ${row.name}`}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">{row.gp}</td>
                  <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">{row.w}</td>
                  <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">{row.l}</td>
                  <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">
                    {row.winPct.toFixed(0)}%
                  </td>
                  <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">
                    {row.ppg.toFixed(2)}
                  </td>
                  <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">{row.goalDifference}</td>
                </tr>
              ))
            ) : (
              <tr className="bg-[var(--off-white-green)]">
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-secondary)]">
                  No locked results yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {div2Sorted.length > 0 ? (
        <div className="space-y-2 pt-2">
          <div className="px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Division 2 <span className="font-normal opacity-70">· fewer than 3 games</span>
            </h2>
          </div>
          <div className="ui-table-shell opacity-80">
            <table className="w-full table-fixed text-left text-xs">
              <colgroup>
                <col style={{ width: "37%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
              </colgroup>
              <thead className="text-[11px] uppercase tracking-[0.14em] text-white">
                <tr>
                  <th className="rounded-tl-lg bg-[var(--color-primary-dark)] px-3 py-[0.85rem] opacity-80">
                    Player
                  </th>
                  {columns.map(([key, label]) => (
                    <th
                      key={key}
                      className="bg-[var(--color-primary-dark)] px-2 py-[0.85rem] text-center align-middle opacity-80 last:rounded-tr-lg"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {div2Sorted.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[rgba(229,231,235,0.9)] bg-[var(--off-white-green)]"
                  >
                    <td className="px-3 py-2.5 align-middle font-medium text-[var(--color-text)]">
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
                            className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-danger)] bg-[var(--color-danger)] text-sm font-semibold leading-none text-white shadow-[0_6px_16px_rgba(229,72,77,0.22)]"
                            aria-label={`Archive ${row.name}`}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">{row.gp}</td>
                    <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">{row.w}</td>
                    <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">{row.l}</td>
                    <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">
                      {row.winPct.toFixed(0)}%
                    </td>
                    <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">
                      {row.ppg.toFixed(2)}
                    </td>
                    <td className="px-2 py-2.5 align-middle text-center text-[var(--color-text-secondary)]">{row.goalDifference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Modal
        isOpen={Boolean(playerPendingArchive)}
        title="Archive player"
        onClose={closeArchiveModal}
        position="top"
      >
        <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
          <p>
            This will archive{" "}
            <span className="font-semibold text-[var(--color-text)]">
              {playerPendingArchive?.name}
            </span>{" "}
            and remove them from future selection.
          </p>
          <p>
            They will no longer appear in active dropdowns and player lists, but historical
            gameweek entries, results, and league data will be preserved.
          </p>
          <div className="ui-banner ui-banner-warning">
            Type <span className="font-semibold text-[var(--color-text)]">ARCHIVE</span> to confirm.
          </div>
          <input
            type="text"
            value={archiveInput}
            onChange={(event) => setArchiveInput(event.target.value)}
            className="ui-input"
            placeholder="ARCHIVE"
            autoCapitalize="characters"
          />
          {message?.type === "error" ? (
            <p className="ui-banner ui-banner-danger">
              {message.text}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleArchivePlayer}
            disabled={isArchiving}
            className="ui-btn ui-btn-danger w-full"
          >
            {isArchiving ? "Archiving..." : "Archive player"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
