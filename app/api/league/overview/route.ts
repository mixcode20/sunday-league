import { NextResponse } from "next/server";
import { listPlayers } from "@/lib/players";
import { supabaseServer } from "@/lib/supabase";
import type { LeagueStatRow } from "@/lib/types";
import { formatPlayerName, getGameweekGoals, getGameweekWinner } from "@/lib/utils";

const debugPerf =
  process.env.DEBUG_PERF === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_PERF === "true";

export async function GET() {
  if (debugPerf) {
    console.time("api:league:overview");
  }

  const supabase = supabaseServer();
  const [playersResult, gameweeksResult] = await Promise.all([
    listPlayers(supabase, { activeOnly: true }),
    supabase
      .from("gameweeks")
      .select("id, darks_score, whites_score, winner, result_mode")
      .eq("status", "locked"),
  ]);
  const players = playersResult.data ?? [];
  const gameweeks = gameweeksResult.data ?? [];

  const gameweekIds = gameweeks.map((gameweek) => gameweek.id);

  const { data: entries } =
    gameweekIds.length > 0
      ? await supabase
          .from("gameweek_players")
          .select("gameweek_id, player_id, team")
          .in("gameweek_id", gameweekIds)
      : { data: [] };

  const stats: Record<string, LeagueStatRow> = {};

  players.forEach((player) => {
    stats[player.id] = {
      id: player.id,
      name: formatPlayerName(player),
      archived: player.archived,
      gp: 0,
      w: 0,
      d: 0,
      l: 0,
      ppg: 0,
      winPct: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    };
  });

  const gameweekResultMap = new Map<string, "darks" | "whites" | "draw">();
  const gameweekMap = new Map<string, (typeof gameweeks)[number]>();
  gameweeks.forEach((gameweek) => {
    gameweekMap.set(gameweek.id, gameweek);
    const winner = getGameweekWinner(gameweek);
    if (winner) gameweekResultMap.set(gameweek.id, winner);
  });

  (entries ?? []).forEach((entry) => {
    if (entry.team === "subs") return;
    const gameweek = gameweekMap.get(entry.gameweek_id);
    const result = gameweekResultMap.get(entry.gameweek_id);
    if (!gameweek || !result) return;
    const row = stats[entry.player_id];
    if (!row) return;
    row.gp += 1;
    const isDarks = entry.team === "darks";
    const goals = getGameweekGoals(gameweek, entry.team);

    row.goalsFor += goals.goalsFor;
    row.goalsAgainst += goals.goalsAgainst;
    if (result === "draw") {
      row.d += 1;
    } else if ((isDarks && result === "darks") || (!isDarks && result === "whites")) {
      row.w += 1;
    } else {
      row.l += 1;
    }
  });

  const rows = Object.values(stats)
    .map((row) => ({
      ...row,
      ppg: row.gp ? (row.w * 3 + row.d) / row.gp : 0,
      winPct: row.gp ? (row.w / row.gp) * 100 : 0,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
    .filter((row) => row.gp > 0);

  if (debugPerf) {
    console.timeEnd("api:league:overview");
  }

  return NextResponse.json({
    rows,
    playersCount: players.length,
  });
}
