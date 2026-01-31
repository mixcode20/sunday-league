import { supabaseServer } from "@/lib/supabase";
import { formatGameweekDate, normalizePlayerJoin } from "@/lib/utils";

type SearchParams = {
  gameweekId?: string;
};

const outcomeBadge = (label: string, variant: string) => (
  <span
    className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${variant}`}
  >
    {label}
  </span>
);

export default async function ResultsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = supabaseServer();
  const { data: gameweeks } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("status", "locked")
    .order("game_date", { ascending: false });

  if (!gameweeks || gameweeks.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Results</h2>
        <p className="text-sm text-slate-500">No results yet.</p>
      </div>
    );
  }

  const currentIndex = searchParams?.gameweekId
    ? Math.max(
        gameweeks.findIndex((gameweek) => gameweek.id === searchParams.gameweekId),
        0
      )
    : 0;
  const currentGameweek = gameweeks[currentIndex];

  const { data: entries } = await supabase
    .from("gameweek_players")
    .select(
      "id, gameweek_id, player_id, team, position, players(id, first_name, last_name)"
    )
    .eq("gameweek_id", currentGameweek.id)
    .order("team", { ascending: true })
    .order("position", { ascending: true });

  const normalized = (entries ?? []).map(normalizePlayerJoin);
  const darks = normalized.filter((entry) => entry.team === "darks");
  const whites = normalized.filter((entry) => entry.team === "whites");

  const darksScore = currentGameweek.darks_score ?? 0;
  const whitesScore = currentGameweek.whites_score ?? 0;
  const isDraw = darksScore === whitesScore;
  const darksOutcome = isDraw ? "Draw" : darksScore > whitesScore ? "Win" : "Loss";
  const whitesOutcome = isDraw ? "Draw" : whitesScore > darksScore ? "Win" : "Loss";

  const older = gameweeks[currentIndex + 1];
  const newer = currentIndex > 0 ? gameweeks[currentIndex - 1] : undefined;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Results
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {formatGameweekDate(currentGameweek.game_date)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={older ? `/history?gameweekId=${older.id}` : "#"}
              className={`rounded-full border px-3 py-2 text-sm ${
                older
                  ? "border-slate-200 text-slate-700"
                  : "border-slate-100 text-slate-300 pointer-events-none"
              }`}
              aria-disabled={!older}
            >
              ←
            </a>
            <a
              href={newer ? `/history?gameweekId=${newer.id}` : "#"}
              className={`rounded-full border px-3 py-2 text-sm ${
                newer
                  ? "border-slate-200 text-slate-700"
                  : "border-slate-100 text-slate-300 pointer-events-none"
              }`}
              aria-disabled={!newer}
            >
              →
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Darks
              </h3>
              {outcomeBadge(
                darksOutcome,
                isDraw
                  ? "border-slate-200 text-slate-500"
                  : darksOutcome === "Win"
                    ? "border-emerald-200 text-emerald-600"
                    : "border-rose-200 text-rose-600"
              )}
            </div>
            <div className="mt-3 space-y-2">
              {darks.map((entry) => (
                <div
                  key={entry.player_id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  {entry.players.first_name} {entry.players.last_name}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-2xl font-semibold text-slate-800">
            <span>{darksScore}</span>
            <span className="text-slate-400">-</span>
            <span>{whitesScore}</span>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Whites
              </h3>
              {outcomeBadge(
                whitesOutcome,
                isDraw
                  ? "border-slate-200 text-slate-500"
                  : whitesOutcome === "Win"
                    ? "border-emerald-200 text-emerald-600"
                    : "border-rose-200 text-rose-600"
              )}
            </div>
            <div className="mt-3 space-y-2">
              {whites.map((entry) => (
                <div
                  key={entry.player_id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  {entry.players.first_name} {entry.players.last_name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
