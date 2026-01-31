import CreateGameweek from "@/components/CreateGameweek";
import JoinSlots from "@/components/JoinSlots";
import { supabaseServer } from "@/lib/supabase";
import { formatDate, normalizePlayerJoin } from "@/lib/utils";

export default async function Home() {
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
              {openGameweek ? "Open gameweek" : "Latest result"}
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {gameweek ? formatDate(gameweek.game_date) : "No gameweeks yet"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {gameweek?.game_time ? gameweek.game_time : "Time TBC"} ·{" "}
              {gameweek?.location ? gameweek.location : "Location TBC"}
            </p>
          </div>
          <CreateGameweek />
        </div>

        {gameweek && players ? (
          <JoinSlots
            isOpen={Boolean(openGameweek)}
            gameweekId={openGameweek?.id}
            players={players}
            entries={normalizedEntries}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No open gameweek yet. Create one from the settings button.
          </div>
        )}
      </section>
    </div>
  );
}
