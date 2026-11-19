import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { PLAYER_STATS_TAG } from "@/lib/cacheTags";
import { supabaseServer } from "@/lib/supabase";
import { formatPlayerName, getGameweekWinner } from "@/lib/utils";
import type {
  PlayerFormEntry,
  PlayerOpponent,
  PlayerScoreline,
  PlayerStats,
  PlayerTeammate,
} from "@/lib/types";

// These stats read locked gameweeks only, and team assignment is rejected
// unless a gameweek is open, so the result cannot change until a gameweek is
// locked or deleted. Both invalidate PLAYER_STATS_TAG.
const loadPlayerStats = (id: string) =>
  unstable_cache(
    async (): Promise<PlayerStats> => {
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

  // Record, streaks and recent form all derive from `form` (newest first) so
  // they can never disagree with the tiles rendered from it.
  const results = form.map((entry) => entry.result);
  const record = {
    w: results.filter((r) => r === "w").length,
    d: results.filter((r) => r === "d").length,
    l: results.filter((r) => r === "l").length,
  };

  const currentStreak =
    results.length > 0
      ? {
          result: results[0],
          count: results.findIndex((r) => r !== results[0]) === -1
            ? results.length
            : results.findIndex((r) => r !== results[0]),
        }
      : null;

  let longestUnbeaten = 0;
  let unbeatenRun = 0;
  for (const result of results) {
    if (result === "l") {
      unbeatenRun = 0;
      continue;
    }
    unbeatenRun += 1;
    if (unbeatenRun > longestUnbeaten) longestUnbeaten = unbeatenRun;
  }

  const recentResults = results.slice(0, 5);
  const last5Ppg =
    recentResults.length > 0
      ? parseFloat(
          (
            recentResults.reduce(
              (total, r) => total + (r === "w" ? 3 : r === "d" ? 1 : 0),
              0
            ) / recentResults.length
          ).toFixed(2)
        )
      : null;

  // Standout scorelines need actual scores.
  let biggestWin: PlayerScoreline | null = null;
  let heaviestDefeat: PlayerScoreline | null = null;
  for (const entry of form) {
    const { darksScore, whitesScore, team } = entry;
    if (darksScore === null || whitesScore === null) continue;
    const scored = team === "darks" ? darksScore : whitesScore;
    const conceded = team === "darks" ? whitesScore : darksScore;
    const scoreline = {
      gameweekId: entry.gameweekId,
      gameDate: entry.gameDate,
      goalsFor: scored,
      goalsAgainst: conceded,
    };
    const margin = scored - conceded;
    if (margin > 0 && (!biggestWin || margin > biggestWin.goalsFor - biggestWin.goalsAgainst)) {
      biggestWin = scoreline;
    }
    if (
      margin < 0 &&
      (!heaviestDefeat || margin < heaviestDefeat.goalsFor - heaviestDefeat.goalsAgainst)
    ) {
      heaviestDefeat = scoreline;
    }
  }

  // Appearance rate: games played out of every locked gameweek since their debut.
  const debutDate = lockedEntries[lockedEntries.length - 1]?.gameweek.game_date ?? null;
  const eligibleGameweeks = debutDate
    ? gameweeks.filter((gw) => gw.game_date >= debutDate).length
    : 0;

  // Career PPG over every locked game (ppgTrend omits the first two).
  const gamesPlayed = chronological.length;
  const ppg =
    gamesPlayed > 0 ? parseFloat((cumulativePoints / gamesPlayed).toFixed(2)) : 0;
  const lastPlayedDate = lockedEntries[0]?.gameweek.game_date ?? null;

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

  const TEAMMATE_QUALIFY_WIN_RATE = 0.75;
  const bestTeammates: PlayerTeammate[] = Array.from(teammateStats.entries())
    .filter(([, s]) => s.gp >= 2)
    .map(([pid, s]) => ({ id: pid, name: s.name, gp: s.gp, winRate: s.wins / s.gp }))
    .sort((a, b) => {
      const aQualifies = a.winRate >= TEAMMATE_QUALIFY_WIN_RATE;
      const bQualifies = b.winRate >= TEAMMATE_QUALIFY_WIN_RATE;
      if (aQualifies !== bQualifies) return aQualifies ? -1 : 1;
      if (aQualifies) return b.gp - a.gp || b.winRate - a.winRate;
      return b.winRate - a.winRate || b.gp - a.gp;
    })
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
      .sort((a, b) => b.losses - a.losses || a.winRate - b.winRate)[0] ?? null;

  return {
    form,
    teamPicks,
    ppgTrend,
    ppg,
    gamesPlayed,
    lastPlayedDate,
    record,
    currentStreak,
    longestUnbeaten,
    last5Ppg,
    biggestWin,
    heaviestDefeat,
    eligibleGameweeks,
    appearanceRate:
      eligibleGameweeks > 0
        ? parseFloat((gamesPlayed / eligibleGameweeks).toFixed(3))
        : null,
    goalsFor,
    goalsAgainst,
    avgGdPerGame,
    avgGoalsPerGame,
    avgConcededPerGame,
    darkWinRate,
    whitesWinRate,
    bestTeammates,
    toughestOpponent,
  } satisfies PlayerStats;
    },
    ["player-stats", id],
    {
      tags: [PLAYER_STATS_TAG],
      // Safety net. Tag invalidation covers mutations made through the app,
      // but a direct edit in the Supabase SQL editor bypasses it entirely, so
      // bound how long such a change can stay invisible. Stats only move when
      // a gameweek is locked, so an hour costs essentially nothing.
      revalidate: 3600,
    }
  )();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(await loadPlayerStats(id));
}
