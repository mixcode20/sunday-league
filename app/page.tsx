import CreateGameweek from "@/components/CreateGameweek";
import JoinSlots from "@/components/JoinSlots";
import GameweekInfoStrip from "@/components/GameweekInfoStrip";
import { supabaseServer } from "@/lib/supabase";
import { normalizePlayerJoin } from "@/lib/utils";

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
          "id, gameweek_id, player_id, team, position, remove_requested, players(id, first_name, last_name)"
        )
        .eq("gameweek_id", gameweek.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const normalizedEntries = (entries ?? []).map(normalizePlayerJoin);

  const mainCount = Math.min(normalizedEntries.length, 14);
  const subsCount = Math.max(normalizedEntries.length - 14, 0);

  return (
    <div className="space-y-4">
      <CreateGameweek />
      <GameweekInfoStrip
        gameweekId={openGameweek?.id ?? null}
        gameDate={gameweek?.game_date ?? null}
        time={gameweek?.game_time ?? null}
        location={gameweek?.location ?? null}
        mainCount={mainCount}
        subsCount={subsCount}
      />

      <section className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {openGameweek ? "Open gameweek" : "Latest result"}
        </p>

        {gameweek && players ? (
          <JoinSlots
            isOpen={Boolean(openGameweek)}
            gameweekId={openGameweek?.id}
            players={players}
            entries={normalizedEntries}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No open gameweek yet. Unlock organiser mode to create one.
          </div>
        )}
      </section>
    </div>
  );
}
