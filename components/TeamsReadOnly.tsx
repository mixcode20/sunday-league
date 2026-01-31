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
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {(["darks", "whites"] as Team[]).map((team) => (
          <div
            key={team}
            className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${
              team === "darks"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-900 border-slate-300"
            }`}
          >
            <h3
              className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                team === "darks" ? "text-white" : "text-slate-500"
              }`}
            >
              {TEAM_LABELS[team]}
            </h3>
            <div className="mt-3 space-y-3">
              {grouped[team].map((entry) => (
                <div
                  key={entry.player_id}
                  className="min-h-[48px] rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm"
                >
                  {entry.players.first_name} {entry.players.last_name}
                </div>
              ))}
              {grouped[team].length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                  Drag players here
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Subs
        </h3>
        <div className="mt-3 space-y-3">
          {grouped.subs.map((entry) => (
            <div
              key={entry.player_id}
              className="min-h-[48px] rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm"
            >
              {entry.players.first_name} {entry.players.last_name}
            </div>
          ))}
          {grouped.subs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
              Drag players here
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
