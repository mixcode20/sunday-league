import type { GameweekPlayer, Team, Winner } from "@/lib/types";
import { formatPlayerName } from "@/lib/utils";

const TEAM_LIMITS: Record<Team, number> = {
  darks: 7,
  whites: 7,
  subs: 4,
};

function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7 fill-[#c69214] drop-shadow-[0_4px_10px_rgba(198,146,20,0.28)]"
    >
      <path d="M6.5 3.25h11v2h2.25a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 0 1-4.78 5.23 6.17 6.17 0 0 1-2.97 2.79v2.48h3.5a.75.75 0 0 1 .75.75v2H7v-2a.75.75 0 0 1 .75-.75h3.5v-2.48a6.17 6.17 0 0 1-2.97-2.79A5.25 5.25 0 0 1 3.5 7.5V6a.75.75 0 0 1 .75-.75H6.5v-2Zm0 4H5v.25a3.75 3.75 0 0 0 2.18 3.39A6.13 6.13 0 0 1 6.5 8.1V7.25Zm11 0v.85c0 .98-.24 1.93-.68 2.79A3.75 3.75 0 0 0 19 7.5v-.25h-1.5Z" />
    </svg>
  );
}

export default function TeamsReadOnly({
  entries,
  winner,
  showCounts = true,
}: {
  entries: GameweekPlayer[];
  winner?: Winner | null;
  showCounts?: boolean;
}) {
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
    <div className={`relative rounded-[1.35rem] border p-4 ${accent}`}>
      {winner === team ? (
        <div className="absolute right-4 top-[11px]" aria-label={`${title} winners`}>
          <TrophyIcon />
        </div>
      ) : null}
      <div className="flex min-h-[30px] items-start justify-between gap-3">
        <h3
          className={`pt-0.5 text-xs font-semibold uppercase tracking-[0.18em] ${
            isDark ? "text-white/80" : "text-[var(--color-text-secondary)]"
          }`}
        >
          {title}
        </h3>
        {showCounts ? (
          <span className={`pt-0.5 text-xs ${isDark ? "text-white/60" : "text-[var(--color-text-secondary)]"}`}>
            {grouped[team].length}/{TEAM_LIMITS[team]}
          </span>
        ) : (
          <span className="block h-7 w-7" aria-hidden="true" />
        )}
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
