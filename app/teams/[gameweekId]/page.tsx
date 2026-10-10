import TeamsReadOnly from "@/components/TeamsReadOnly";
import { supabaseServer } from "@/lib/supabase";
import { formatDate, getGameweekWinner, normalizePlayerJoin } from "@/lib/utils";

export default async function TeamsHistoryPage({
  params,
}: {
  params: Promise<{ gameweekId: string }>;
}) {
  const { gameweekId } = await params;
  const supabase = supabaseServer();
  const { data: gameweek } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("id", gameweekId)
    .single();

  if (!gameweek) {
    return (
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          Gameweek not found
        </h2>
      </div>
    );
  }

  const { data: entries } = await supabase
    .from("gameweek_players")
    .select(
      "*, players(id, first_name, last_name, archived)"
    )
    .eq("gameweek_id", gameweek.id)
    .order("team", { ascending: true })
    .order("team_position", { ascending: true })
    .order("position", { ascending: true });

  const normalizedEntries = (entries ?? []).map(normalizePlayerJoin);
  const winner = getGameweekWinner(gameweek);

  return (
    <div className="space-y-6">
      <section className="ui-card p-6">
        <p className="ui-kicker">Gameweek teams</p>
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">
          {formatDate(gameweek.game_date)}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Status: {gameweek.status}
        </p>
      </section>
      <TeamsReadOnly entries={normalizedEntries} winner={winner} />
    </div>
  );
}
