import TeamsReadOnly from "@/components/TeamsReadOnly";
import { supabaseServer } from "@/lib/supabase";
import { formatDate, normalizePlayerJoin } from "@/lib/utils";

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
      "*, players(id, first_name, last_name, archived)"
    )
    .eq("gameweek_id", gameweek.id)
    .order("team", { ascending: true })
    .order("team_position", { ascending: true })
    .order("position", { ascending: true });

  const normalizedEntries = (entries ?? []).map(normalizePlayerJoin);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Gameweek teams
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {formatDate(gameweek.game_date)}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Status: {gameweek.status}
        </p>
      </section>
      <TeamsReadOnly entries={normalizedEntries} />
    </div>
  );
}
