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
    <div className={`rounded-[1.35rem] border p-4 ${accent}`}>
      <div className="flex items-center justify-between">
        <h3
          className={`text-xs font-semibold uppercase tracking-[0.18em] ${
            isDark ? "text-white/80" : "text-[var(--color-text-secondary)]"
          }`}
        >
          {title}
        </h3>
        <span className={`text-xs ${isDark ? "text-white/60" : "text-[var(--color-text-secondary)]"}`}>
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
              className={`flex min-h-[52px] items-center rounded-xl border px-3 py-2 text-sm ${
                isDark
                  ? "border-white/12 bg-white/8 text-white"
                  : "border-[var(--color-border)] bg-white text-[var(--color-text)]"
              }`}
            >
              {entry ? (
                <span className={`font-medium ${isDark ? "text-white" : "text-[var(--color-text)]"}`}>
                  {formatPlayerName(entry.players)}
                </span>
              ) : (
                <span className={`text-xs ${isDark ? "text-white/55" : "text-[var(--color-text-secondary)]"}`}>
                  Pick
                </span>
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
        <p className="ui-banner">
          Teams have not yet been selected for this gameweek.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-4">
        {renderSlots(
          "darks",
          "Darks",
          "border-[rgba(15,61,52,0.16)] bg-[var(--color-primary-dark)] text-white",
          true
        )}
        {renderSlots(
          "whites",
          "Whites",
          "border-[var(--color-border)] bg-[rgba(255,255,255,0.9)]"
        )}
      </div>
    </div>
  );
}
