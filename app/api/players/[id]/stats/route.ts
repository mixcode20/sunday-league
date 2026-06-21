import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getGameweekWinner } from "@/lib/utils";
import type { PlayerFormEntry, PlayerStats } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseServer();

  const [gameweeksResult, entriesResult] = await Promise.all([
    supabase
      .from("gameweeks")
      .select("id, game_date, winner, darks_score, whites_score")
      .eq("status", "locked"),
    supabase
      .from("gameweek_players")
      .select("gameweek_id, team")
      .eq("player_id", id)
      .in("team", ["darks", "whites"]),
  ]);

  const gameweeks = gameweeksResult.data ?? [];
  const entries = entriesResult.data ?? [];

  const gameweekMap = new Map(gameweeks.map((gw) => [gw.id, gw]));

  const lockedEntries = entries
    .filter((e) => gameweekMap.has(e.gameweek_id))
    .map((e) => ({
      team: e.team as "darks" | "whites",
      gameweek: gameweekMap.get(e.gameweek_id)!,
    }))
    .sort((a, b) => b.gameweek.game_date.localeCompare(a.gameweek.game_date));

  const teamPicks = { darks: 0, whites: 0 };
  for (const entry of lockedEntries) {
    if (entry.team === "darks") teamPicks.darks++;
    else teamPicks.whites++;
  }

  const form: PlayerFormEntry[] = lockedEntries.slice(0, 5).map((entry) => {
    const winner = getGameweekWinner(entry.gameweek);
    let result: "w" | "l" | "d";
    if (winner === "draw") {
      result = "d";
    } else if (
      (entry.team === "darks" && winner === "darks") ||
      (entry.team === "whites" && winner === "whites")
    ) {
      result = "w";
    } else {
      result = "l";
    }
    return { result, team: entry.team };
  });

  return NextResponse.json({ form, teamPicks } satisfies PlayerStats);
}
