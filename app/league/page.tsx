import LeagueTableClient from "@/components/LeagueTableClient";
import { supabaseServer } from "@/lib/supabase";

type StatRow = {
  id: string;
  name: string;
  gp: number;
  w: number;
  d: number;
  l: number;
  winPct: number;
};

export default async function LeaguePage() {
  const supabase = supabaseServer();
  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_name");

  const { data: gameweeks } = await supabase
    .from("gameweeks")
    .select("id, darks_score, whites_score")
    .eq("status", "locked");

  const gameweekIds = gameweeks?.map((gameweek) => gameweek.id) ?? [];

  const { data: entries } =
    gameweekIds.length > 0
      ? await supabase
          .from("gameweek_players")
          .select("gameweek_id, player_id, team")
          .in("gameweek_id", gameweekIds)
      : { data: [] };

  const stats: Record<string, StatRow> = {};

  (players ?? []).forEach((player) => {
    stats[player.id] = {
      id: player.id,
      name: `${player.first_name} ${player.last_name}`,
      gp: 0,
      w: 0,
      d: 0,
      l: 0,
      winPct: 0,
    };
  });

  const gameweekResultMap = new Map<
    string,
    { darks: number; whites: number }
  >();
  (gameweeks ?? []).forEach((gameweek) => {
    if (
      typeof gameweek.darks_score === "number" &&
      typeof gameweek.whites_score === "number"
    ) {
      gameweekResultMap.set(gameweek.id, {
        darks: gameweek.darks_score,
        whites: gameweek.whites_score,
      });
    }
  });

  (entries ?? []).forEach((entry) => {
    if (entry.team === "subs") return;
    const result = gameweekResultMap.get(entry.gameweek_id);
    if (!result) return;
    const row = stats[entry.player_id];
    if (!row) return;
    row.gp += 1;
    const isDarks = entry.team === "darks";
    if (result.darks === result.whites) {
      row.d += 1;
    } else if (
      (isDarks && result.darks > result.whites) ||
      (!isDarks && result.whites > result.darks)
    ) {
      row.w += 1;
    } else {
      row.l += 1;
    }
  });

  const rows = Object.values(stats).map((row) => ({
    ...row,
    winPct: row.gp ? (row.w / row.gp) * 100 : 0,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">League</h2>
      <LeagueTableClient rows={rows} />
      {players && players.length === 0 ? (
        <p className="text-sm text-slate-500">
          No players yet. Add them in{" "}
          <a href="/admin/players" className="font-medium text-slate-900">
            player settings
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
