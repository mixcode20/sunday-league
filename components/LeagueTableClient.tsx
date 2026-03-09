"use client";

import { useMemo, useState } from "react";
import type { LeagueSortDirection, LeagueStatRow } from "@/lib/types";

type SortKey =
  | "gp"
  | "w"
  | "d"
  | "l"
  | "winPct"
  | "goalsFor"
  | "goalsAgainst"
  | "goalDifference";

const columns: [SortKey, string][] = [
  ["gp", "GP"],
  ["w", "W"],
  ["d", "D"],
  ["l", "L"],
  ["winPct", "W%"],
  ["goalsFor", "F"],
  ["goalsAgainst", "A"],
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
  const [sortKey, setSortKey] = useState<SortKey>("w");
  const [direction, setDirection] = useState<LeagueSortDirection>("desc");

  const sorted = useMemo(() => {
    const sortedRows = [...rows];

    sortedRows.sort((a, b) => {
      if (sortKey === "w" && direction === "desc") {
        const winsDiff = compareNumeric(a.w, b.w, "desc");
        if (winsDiff !== 0) return winsDiff;

        const goalDifferenceDiff = compareNumeric(
          a.goalDifference,
          b.goalDifference,
          "desc"
        );
        if (goalDifferenceDiff !== 0) return goalDifferenceDiff;

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

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[720px] w-full table-fixed text-left text-xs">
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "7.5%" }} />
        </colgroup>
        <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Player</th>
            {columns.map(([key, label]) => (
              <th
                key={key}
                className="cursor-pointer px-2 py-2"
                onClick={() => toggleSort(key)}
              >
                <div className="flex items-center gap-1">
                  <span>{label}</span>
                  {sortKey === key ? (
                    <span className="text-[10px]">
                      {direction === "asc" ? "▲" : "▼"}
                    </span>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length > 0 ? (
            sorted.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-800">
                  {row.name}
                </td>
                <td className="px-2 py-2 text-slate-600">{row.gp}</td>
                <td className="px-2 py-2 text-slate-600">{row.w}</td>
                <td className="px-2 py-2 text-slate-600">{row.d}</td>
                <td className="px-2 py-2 text-slate-600">{row.l}</td>
                <td className="px-2 py-2 text-slate-600">
                  {row.winPct.toFixed(0)}%
                </td>
                <td className="px-2 py-2 text-slate-600">{row.goalsFor}</td>
                <td className="px-2 py-2 text-slate-600">{row.goalsAgainst}</td>
                <td className="px-2 py-2 text-slate-600">{row.goalDifference}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                No locked results yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
