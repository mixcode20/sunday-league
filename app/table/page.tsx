import { supabaseServer } from "@/lib/supabase";

type StatRow = {
  id: string;
  name: string;
  gp: number;
  w: number;
  d: number;
  l: number;
};

export default async function TablePage() {
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

  const rows = Object.values(stats).sort((a, b) => {
    const aWin = a.gp ? a.w / a.gp : 0;
    const bWin = b.gp ? b.w / b.gp : 0;
    if (bWin !== aWin) return bWin - aWin;
    if (b.gp !== a.gp) return b.gp - a.gp;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">League table</h2>
        <p className="text-sm text-slate-500">
          All-time record for locked games.
        </p>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">GP</th>
              <th className="px-4 py-3">W</th>
              <th className="px-4 py-3">D</th>
              <th className="px-4 py-3">L</th>
              <th className="px-4 py-3">Win %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => {
                const winPct = row.gp ? ((row.w / row.gp) * 100).toFixed(0) : "0";
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.gp}</td>
                    <td className="px-4 py-3 text-slate-600">{row.w}</td>
                    <td className="px-4 py-3 text-slate-600">{row.d}</td>
                    <td className="px-4 py-3 text-slate-600">{row.l}</td>
                    <td className="px-4 py-3 text-slate-600">{winPct}%</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  No locked results yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
