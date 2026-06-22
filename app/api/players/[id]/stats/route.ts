import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { formatPlayerName, getGameweekWinner } from "@/lib/utils";
import type { PlayerFormEntry, PlayerOpponent, PlayerStats, PlayerTeammate } from "@/lib/types";

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

  // Team picks
  const teamPicks = { darks: 0, whites: 0 };
  for (const entry of lockedEntries) {
    if (entry.team === "darks") teamPicks.darks++;
    else teamPicks.whites++;
  }

  // Form entries (newest first)
  const form: PlayerFormEntry[] = lockedEntries.map((entry) => {
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
    return {
      result,
      team: entry.team,
      gameweekId: entry.gameweek.id,
      gameDate: entry.gameweek.game_date,
      darksScore: entry.gameweek.darks_score,
      whitesScore: entry.gameweek.whites_score,
    };
  });

  // PPG trend (cumulative, chronological)
  const chronological = [...lockedEntries].reverse();
  let cumulativePoints = 0;
  const ppgTrend: number[] = [];
  for (let i = 0; i < chronological.length; i++) {
    const entry = chronological[i];
    const winner = getGameweekWinner(entry.gameweek);
    if (
      (entry.team === "darks" && winner === "darks") ||
      (entry.team === "whites" && winner === "whites")
    ) {
      cumulativePoints += 3;
    } else if (winner === "draw") {
      cumulativePoints += 1;
    }
    if (i >= 2) {
      ppgTrend.push(parseFloat((cumulativePoints / (i + 1)).toFixed(3)));
    }
  }

  // Goals & GD
  let goalsFor = 0;
  let goalsAgainst = 0;
  let gamesWithScore = 0;
  for (const entry of lockedEntries) {
    const { darks_score, whites_score } = entry.gameweek;
    if (darks_score !== null && whites_score !== null) {
      goalsFor += entry.team === "darks" ? darks_score : whites_score;
      goalsAgainst += entry.team === "darks" ? whites_score : darks_score;
      gamesWithScore++;
    }
  }
  const avgGdPerGame =
    gamesWithScore > 0
      ? parseFloat(((goalsFor - goalsAgainst) / gamesWithScore).toFixed(1))
      : 0;
  const avgGoalsPerGame =
    gamesWithScore > 0
      ? parseFloat((goalsFor / gamesWithScore).toFixed(1))
      : 0;
  const avgConcededPerGame =
    gamesWithScore > 0
      ? parseFloat((goalsAgainst / gamesWithScore).toFixed(1))
      : 0;

  // Win rate by team
  let darksGp = 0, darksWins = 0, whitesGp = 0, whitesWins = 0;
  for (const entry of lockedEntries) {
    const winner = getGameweekWinner(entry.gameweek);
    if (entry.team === "darks") {
      darksGp++;
      if (winner === "darks") darksWins++;
    } else {
      whitesGp++;
      if (winner === "whites") whitesWins++;
    }
  }
  const darkWinRate = darksGp > 0 ? darksWins / darksGp : null;
  const whitesWinRate = whitesGp > 0 ? whitesWins / whitesGp : null;

  // Teammates & opponents
  const gameweekIds = lockedEntries.map((e) => e.gameweek.id);

  type CoPlayer = {
    gameweek_id: string;
    player_id: string;
    team: string;
    players: { id: string; first_name: string; last_name: string } | null;
  };

  const coPlayersResult =
    gameweekIds.length > 0
      ? await supabase
          .from("gameweek_players")
          .select("gameweek_id, player_id, team, players(id, first_name, last_name)")
          .in("gameweek_id", gameweekIds)
          .in("team", ["darks", "whites"])
          .neq("player_id", id)
      : { data: [] as CoPlayer[] };

  const coPlayers = (coPlayersResult.data ?? []) as CoPlayer[];

  const myEntryMap = new Map(
    lockedEntries.map((e) => [
      e.gameweek.id,
      { team: e.team, winner: getGameweekWinner(e.gameweek) },
    ])
  );

  type Aggregate = { name: string; gp: number; wins: number };
  const teammateStats = new Map<string, Aggregate>();
  const opponentStats = new Map<string, Aggregate>();

  for (const cp of coPlayers) {
    const myEntry = myEntryMap.get(cp.gameweek_id);
    if (!myEntry || !cp.players) continue;

    const name = formatPlayerName(cp.players);
    const isTeammate = cp.team === myEntry.team;
    const iWon =
      (myEntry.team === "darks" && myEntry.winner === "darks") ||
      (myEntry.team === "whites" && myEntry.winner === "whites");

    if (isTeammate) {
      const s = teammateStats.get(cp.player_id) ?? { name, gp: 0, wins: 0 };
      s.gp++;
      if (iWon) s.wins++;
      teammateStats.set(cp.player_id, s);
    } else {
      const s = opponentStats.get(cp.player_id) ?? { name, gp: 0, wins: 0 };
      s.gp++;
      if (iWon) s.wins++;
      opponentStats.set(cp.player_id, s);
    }
  }

  const bestTeammates: PlayerTeammate[] = Array.from(teammateStats.entries())
    .filter(([, s]) => s.gp >= 2)
    .map(([pid, s]) => ({ id: pid, name: s.name, gp: s.gp, winRate: s.wins / s.gp }))
    .sort((a, b) => b.winRate - a.winRate || b.gp - a.gp)
    .slice(0, 3);

  const toughestOpponent: PlayerOpponent | null =
    Array.from(opponentStats.entries())
      .filter(([, s]) => s.gp >= 2)
      .map(([pid, s]) => ({
        id: pid,
        name: s.name,
        gp: s.gp,
        losses: s.gp - s.wins,
        winRate: s.wins / s.gp,
      }))
      .sort((a, b) => a.winRate - b.winRate || b.gp - a.gp)[0] ?? null;

  return NextResponse.json({
    form,
    teamPicks,
    ppgTrend,
    goalsFor,
    goalsAgainst,
    avgGdPerGame,
    avgGoalsPerGame,
    avgConcededPerGame,
    darkWinRate,
    whitesWinRate,
    bestTeammates,
    toughestOpponent,
  } satisfies PlayerStats);
}
