import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { listPlayers } from "@/lib/players";
import type { LeagueOverview, LeagueStatRow, LeagueTeamRecord } from "@/lib/types";
import { formatPlayerName, getGameweekGoals, getGameweekWinner } from "@/lib/utils";

type LockedGameweek = {
  id: string;
  darks_score: number | null;
  whites_score: number | null;
  winner: "darks" | "whites" | "draw" | null;
  result_mode: string | null;
};

type PlayerAggregate = {
  gp: number;
  gamesWithScore: number;
  w: number;
  d: number;
  l: number;
  goalsFor: number;
  goalsAgainst: number;
};

const LOCKED_GAMEWEEK_FIELDS = "id, darks_score, whites_score, winner, result_mode";

// Darks-vs-whites record. Reads only the gameweeks table, so it stays in JS.
const buildTeamRecord = (gameweeks: LockedGameweek[]): LeagueTeamRecord => {
  const record = { darksWins: 0, whitesWins: 0, draws: 0, games: 0 };
  gameweeks.forEach((gameweek) => {
    const winner = getGameweekWinner(gameweek);
    if (!winner) return;
    record.games += 1;
    if (winner === "darks") record.darksWins += 1;
    else if (winner === "whites") record.whitesWins += 1;
    else record.draws += 1;
  });
  return record;
};

// Fallback only. Used if public.league_player_stats is unavailable, so a
// dropped view degrades to the old behaviour instead of an empty table.
const aggregateInJs = async (
  supabase: SupabaseClient,
  gameweeks: LockedGameweek[]
): Promise<Map<string, PlayerAggregate>> => {
  const gameweekIds = gameweeks.map((gameweek) => gameweek.id);
  const { data: entries } =
    gameweekIds.length > 0
      ? await supabase
          .from("gameweek_players")
          .select("gameweek_id, player_id, team")
          .in("gameweek_id", gameweekIds)
      : { data: [] };

  const gameweekMap = new Map(gameweeks.map((gameweek) => [gameweek.id, gameweek]));
  const resultMap = new Map<string, "darks" | "whites" | "draw">();
  gameweeks.forEach((gameweek) => {
    const winner = getGameweekWinner(gameweek);
    if (winner) resultMap.set(gameweek.id, winner);
  });

  const totals = new Map<string, PlayerAggregate>();
  (entries ?? []).forEach((entry) => {
    if (entry.team === "subs") return;
    const gameweek = gameweekMap.get(entry.gameweek_id);
    const result = resultMap.get(entry.gameweek_id);
    if (!gameweek || !result) return;

    const row =
      totals.get(entry.player_id) ??
      { gp: 0, gamesWithScore: 0, w: 0, d: 0, l: 0, goalsFor: 0, goalsAgainst: 0 };
    row.gp += 1;
    if (gameweek.darks_score !== null && gameweek.whites_score !== null) {
      row.gamesWithScore += 1;
    }
    const goals = getGameweekGoals(gameweek, entry.team);
    row.goalsFor += goals.goalsFor;
    row.goalsAgainst += goals.goalsAgainst;
    if (result === "draw") row.d += 1;
    else if (result === entry.team) row.w += 1;
    else row.l += 1;
    totals.set(entry.player_id, row);
  });

  return totals;
};

// Reads public.league_player_stats, which performs the per-player aggregation
// in Postgres. Previously this loaded every locked gameweek and every non-subs
// entry row and aggregated in Node on every request - O(all history), growing
// each week the league is played. See
// supabase/migrations/20261116090000_league_player_stats_view.sql.
const aggregateInPostgres = async (
  supabase: SupabaseClient
): Promise<Map<string, PlayerAggregate> | null> => {
  const { data, error } = await supabase
    .from("league_player_stats")
    .select("player_id, gp, games_with_score, w, d, l, goals_for, goals_against");

  if (error || !data) {
    console.warn(
      "[leagueOverview] league_player_stats unavailable, falling back to in-process aggregation",
      error?.message
    );
    return null;
  }

  return new Map(
    data.map((row) => [
      row.player_id as string,
      {
        gp: Number(row.gp),
        gamesWithScore: Number(row.games_with_score),
        w: Number(row.w),
        d: Number(row.d),
        l: Number(row.l),
        goalsFor: Number(row.goals_for),
        goalsAgainst: Number(row.goals_against),
      },
    ])
  );
};

export const getLeagueOverview = async (
  supabase: SupabaseClient
): Promise<LeagueOverview> => {
  const [playersResult, gameweeksResult, postgresTotals] = await Promise.all([
    listPlayers(supabase, { activeOnly: true }),
    supabase.from("gameweeks").select(LOCKED_GAMEWEEK_FIELDS).eq("status", "locked"),
    aggregateInPostgres(supabase),
  ]);

  const players = playersResult.data ?? [];
  const gameweeks = (gameweeksResult.data ?? []) as LockedGameweek[];
  const totals = postgresTotals ?? (await aggregateInJs(supabase, gameweeks));

  // Iterating the active roster keeps both the row order and the exclusion of
  // archived players identical to the previous implementation.
  const rows: LeagueStatRow[] = [];
  players.forEach((player) => {
    const totalsForPlayer = totals.get(player.id);
    if (!totalsForPlayer || totalsForPlayer.gp === 0) return;
    const { gp, gamesWithScore, w, d, l, goalsFor, goalsAgainst } = totalsForPlayer;
    rows.push({
      id: player.id,
      name: formatPlayerName(player),
      archived: player.archived,
      gp,
      gamesWithScore,
      w,
      d,
      l,
      ppg: (w * 3 + d) / gp,
      winPct: (w / gp) * 100,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
    });
  });

  return {
    rows,
    playersCount: players.length,
    teamRecord: buildTeamRecord(gameweeks),
  };
};
