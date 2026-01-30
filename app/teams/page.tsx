import TeamsClient from "@/components/TeamsClient";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import { supabaseServer } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default async function TeamsPage() {
  const supabase = supabaseServer();
  const { data: openGameweek } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("status", "open")
    .maybeSingle();

  const { data: latestLocked } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("status", "locked")
    .order("game_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const gameweek = openGameweek ?? latestLocked;

  if (!gameweek) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">No gameweeks</h2>
        <p className="text-sm text-slate-500">
          Ask the organiser to create the first gameweek.
        </p>
      </div>
    );
  }

  const { data: entries } = await supabase
    .from("gameweek_players")
    .select(
      "id, player_id, team, position, players(id, first_name, last_name)"
    )
    .eq("gameweek_id", gameweek.id)
    .order("team", { ascending: true })
    .order("position", { ascending: true });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {gameweek.status === "open" ? "Current teams" : "Latest teams"}
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {formatDate(gameweek.game_date)}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {gameweek.status === "open"
            ? "Drag players to organise teams and subs."
            : "This gameweek is locked."}
        </p>
      </section>

      {gameweek.status === "open" ? (
        <TeamsClient gameweek={gameweek} entries={entries ?? []} />
      ) : (
        <TeamsReadOnly entries={entries ?? []} />
      )}
    </div>
  );
}
