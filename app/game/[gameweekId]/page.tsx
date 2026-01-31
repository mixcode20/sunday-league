import TeamsReadOnly from "@/components/TeamsReadOnly";
import { supabaseServer } from "@/lib/supabase";
import { formatDate, normalizePlayerJoin } from "@/lib/utils";

export default async function GameDetailPage({
  params,
}: {
  params: { gameweekId: string };
}) {
  const supabase = supabaseServer();
  const { data: gameweek } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("id", params.gameweekId)
    .single();

  if (!gameweek) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">
          Gameweek not found
        </h2>
      </div>
    );
  }

  const { data: entries } = await supabase
    .from("gameweek_players")
    .select(
      "id, gameweek_id, player_id, team, position, remove_requested, players(id, first_name, last_name)"
    )
    .eq("gameweek_id", gameweek.id)
    .order("team", { ascending: true })
    .order("position", { ascending: true });

  const normalizedEntries = (entries ?? []).map(normalizePlayerJoin);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-400">Game</p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {formatDate(gameweek.game_date)}
        </h2>
        {gameweek.status === "locked" ? (
          <p className="mt-2 text-lg font-semibold text-slate-800">
            Darks {gameweek.darks_score ?? 0} - {gameweek.whites_score ?? 0}{" "}
            Whites
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Score will appear after the game is locked.
          </p>
        )}
      </section>

      <TeamsReadOnly entries={normalizedEntries} />
    </div>
  );
}
