"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  name: string;
  gp: number;
  w: number;
  d: number;
  l: number;
  winPct: number;
};

type SortKey = "gp" | "w" | "d" | "l" | "winPct";

export default function LeagueTableClient({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("w");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const sortedRows = [...rows];
    const multiplier = direction === "asc" ? 1 : -1;

    sortedRows.sort((a, b) => {
      if (sortKey === "w") {
        if (b.w !== a.w) return (b.w - a.w) * multiplier;
        if (b.winPct !== a.winPct) return (b.winPct - a.winPct) * multiplier;
        if (b.gp !== a.gp) return (b.gp - a.gp) * multiplier;
        return a.name.localeCompare(b.name);
      }

      const diff = (b[sortKey] - a[sortKey]) * multiplier;
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
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
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Player</th>
            {(
              [
                ["gp", "GP"],
                ["w", "W"],
                ["d", "D"],
                ["l", "L"],
                ["winPct", "Win %"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <th
                key={key}
                className="cursor-pointer px-4 py-3"
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
                <td className="px-4 py-3 font-medium text-slate-800">
                  {row.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.gp}</td>
                <td className="px-4 py-3 text-slate-600">{row.w}</td>
                <td className="px-4 py-3 text-slate-600">{row.d}</td>
                <td className="px-4 py-3 text-slate-600">{row.l}</td>
                <td className="px-4 py-3 text-slate-600">
                  {row.winPct.toFixed(0)}%
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                No locked results yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
