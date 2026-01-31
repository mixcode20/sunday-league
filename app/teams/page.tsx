import TeamsClient from "@/components/TeamsClient";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import GameweekInfoStrip from "@/components/GameweekInfoStrip";
import { supabaseServer } from "@/lib/supabase";
import { normalizePlayerJoin } from "@/lib/utils";

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
      <div className="space-y-4">
        <GameweekInfoStrip />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No open gameweek yet. Organisers can create one from the settings button.
        </div>
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

  const mainCount = Math.min(normalizedEntries.length, 14);
  const subsCount = Math.max(normalizedEntries.length - 14, 0);

  return (
    <div className="space-y-4">
      <GameweekInfoStrip
        gameweekId={gameweek.status === "open" ? gameweek.id : null}
        gameDate={gameweek.game_date}
        time={gameweek.game_time ?? null}
        location={gameweek.location ?? null}
        mainCount={mainCount}
        subsCount={subsCount}
      />

      <section className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {gameweek.status === "open" ? "Current teams" : "Latest teams"}
        </p>
        <p className="text-xs text-slate-400">
          {gameweek.status === "open"
            ? "Pick teams and subs for this week."
            : "This gameweek is locked."}
        </p>
      </section>

      {gameweek.status === "open" ? (
        <TeamsClient gameweek={gameweek} entries={normalizedEntries} />
      ) : (
        <TeamsReadOnly entries={normalizedEntries} />
      )}
    </div>
  );
}
