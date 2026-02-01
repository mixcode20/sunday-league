import TeamsClient from "@/components/TeamsClient";
import TeamsReadOnly from "@/components/TeamsReadOnly";
import GameweekInfoStrip from "@/components/GameweekInfoStrip";
import ConfirmResultPanel from "@/components/ConfirmResultPanel";
import { supabaseServer } from "@/lib/supabase";
import { normalizePlayerJoin } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
          No open gameweek yet. Unlock organiser mode to create one.
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

  const mainCount = normalizedEntries.filter((entry) => entry.position <= 14).length;
  const subsCount = normalizedEntries.filter((entry) => entry.position > 14).length;

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
      <ConfirmResultPanel gameweek={gameweek} />

      {gameweek.status === "locked" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Final score: Darks {gameweek.darks_score ?? 0} -{" "}
          {gameweek.whites_score ?? 0} · Locked
        </div>
      ) : null}

      {gameweek.status === "open" ? (
        <section className="flex items-start justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Current teams
          </p>
          <p className="text-xs text-slate-400">
            Pick teams for this week.
          </p>
        </section>
      ) : null}

      {gameweek.status === "open" ? (
        <TeamsClient gameweek={gameweek} entries={normalizedEntries} />
      ) : (
        <TeamsReadOnly entries={normalizedEntries} />
      )}
    </div>
  );
}
