import { supabaseServer } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default async function HistoryPage() {
  const supabase = supabaseServer();
  const { data: gameweeks } = await supabase
    .from("gameweeks")
    .select("*")
    .order("game_date", { ascending: false });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Gameweeks</h2>
        <p className="text-sm text-slate-500">
          Browse locked and open gameweeks.
        </p>
      </section>

      <div className="space-y-3">
        {gameweeks && gameweeks.length > 0 ? (
          gameweeks.map((gameweek) => (
            <div
              key={gameweek.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(gameweek.game_date)}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {gameweek.status}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <a
                  className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                  href={`/teams/${gameweek.id}`}
                >
                  Teams
                </a>
                <a
                  className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                  href={`/game/${gameweek.id}`}
                >
                  Game
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-400">
            No gameweeks yet.
          </div>
        )}
      </div>
    </div>
  );
}
