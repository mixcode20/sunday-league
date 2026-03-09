import type { GameweekPlayer, Team } from "@/lib/types";
import { formatPlayerName } from "@/lib/utils";

const TEAM_LIMITS: Record<Team, number> = {
  darks: 7,
  whites: 7,
  subs: 4,
};

export default function TeamsReadOnly({ entries }: { entries: GameweekPlayer[] }) {
  const grouped: Record<Team, GameweekPlayer[]> = {
    darks: [],
    whites: [],
    subs: [],
  };

  entries.forEach((entry) => {
    grouped[entry.team].push(entry);
  });

  (Object.keys(grouped) as Team[]).forEach((team) => {
    grouped[team] = [...grouped[team]].sort((a, b) => {
      const aPos = a.team_position ?? Number.MAX_SAFE_INTEGER;
      const bPos = b.team_position ?? Number.MAX_SAFE_INTEGER;
      if (aPos !== bPos) return aPos - bPos;
      return a.position - b.position;
    });
  });

  const teamsSelected = grouped.darks.length + grouped.whites.length > 0;

  const renderSlots = (team: Team, title: string, accent: string, isDark?: boolean) => (
    <div className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${accent}`}>
      <div className="flex items-center justify-between">
        <h3
          className={`text-xs font-semibold uppercase tracking-[0.2em] ${
            isDark ? "text-slate-200" : "text-slate-500"
          }`}
        >
          {title}
        </h3>
        <span className="text-xs text-slate-400">
          {grouped[team].length}/{TEAM_LIMITS[team]}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {(() => {
          const limit = TEAM_LIMITS[team];
          const slots: Array<GameweekPlayer | null> = Array.from(
            { length: limit },
            () => null
          );
          const overflow: GameweekPlayer[] = [];
          grouped[team].forEach((entry) => {
            const slotPosition = entry.team_position;
            if (
              typeof slotPosition === "number" &&
              slotPosition >= 1 &&
              slotPosition <= limit &&
              !slots[slotPosition - 1]
            ) {
              slots[slotPosition - 1] = entry;
            } else {
              overflow.push(entry);
            }
          });
          let overflowIndex = 0;
          slots.forEach((entry, index) => {
            if (entry || overflowIndex >= overflow.length) return;
            slots[index] = overflow[overflowIndex];
            overflowIndex += 1;
          });
          return slots.map((entry, index) => (
            <div
              key={`${team}-${index}`}
              className="flex min-h-[52px] items-center rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {entry ? (
                <span className="font-medium text-slate-900">
                  {formatPlayerName(entry.players)}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Pick</span>
              )}
            </div>
          ));
        })()}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {!teamsSelected ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          Teams have not yet been selected for this gameweek.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-4">
        {renderSlots("darks", "Darks", "bg-slate-900 text-white", true)}
        {renderSlots("whites", "Whites", "bg-white border-slate-300")}
      </div>
    </div>
  );
}
