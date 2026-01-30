import CreateGameweek from "@/components/CreateGameweek";
import JoinForm from "@/components/JoinForm";
import { supabaseServer } from "@/lib/supabase";
import { formatDate, normalizePlayerJoin } from "@/lib/utils";

export default async function Home() {
  const supabase = supabaseServer();
  const { data: gameweek } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("status", "open")
    .maybeSingle();

  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .order("first_name", { ascending: true });

  const { data: entries } = gameweek
    ? await supabase
        .from("gameweek_players")
        .select(
          "id, gameweek_id, player_id, team, position, players(id, first_name, last_name)"
        )
        .eq("gameweek_id", gameweek.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const normalizedEntries = (entries ?? []).map(normalizePlayerJoin);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Current gameweek
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {gameweek ? formatDate(gameweek.game_date) : "No open gameweek"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {gameweek
                ? "Join in before the organiser locks teams."
                : "Ask the organiser to create the next gameweek."}
            </p>
          </div>
          <CreateGameweek />
        </div>

        {gameweek && players ? (
          <JoinForm gameweekId={gameweek.id} players={players} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No open gameweek yet.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Current list</h3>
        <p className="text-sm text-slate-500">
          Players who have joined the open gameweek.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {normalizedEntries.length > 0 ? (
            normalizedEntries.map((entry) => (
              <div
                key={entry.player_id}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                {entry.players.first_name} {entry.players.last_name}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
              No one has joined yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
