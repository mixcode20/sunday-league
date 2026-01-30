import type { GameweekPlayer, Team } from "@/lib/types";

type TeamsReadOnlyProps = {
  entries: GameweekPlayer[];
};

const TEAM_LABELS: Record<Team, string> = {
  darks: "Darks",
  whites: "Whites",
  subs: "Subs",
};

export default function TeamsReadOnly({ entries }: TeamsReadOnlyProps) {
  const grouped: Record<Team, GameweekPlayer[]> = {
    darks: [],
    whites: [],
    subs: [],
  };

  entries.forEach((entry) => {
    grouped[entry.team].push(entry);
  });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(Object.keys(grouped) as Team[]).map((team) => (
        <div
          key={team}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {TEAM_LABELS[team]}
          </h3>
          <div className="mt-3 space-y-2">
            {grouped[team].map((entry) => (
              <div
                key={entry.player_id}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                {entry.players.first_name} {entry.players.last_name}
              </div>
            ))}
            {grouped[team].length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                No players
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
