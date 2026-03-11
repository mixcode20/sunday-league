import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type ListedPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  archived: boolean;
  games_played?: number;
  last_game_date?: string | null;
};

const isArchivedColumnMissing = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;
  return error.code === "42703" || error.message?.toLowerCase().includes("archived") === true;
};

export const listPlayers = async (
  supabase: SupabaseClient,
  options?: { activeOnly?: boolean }
): Promise<{
  data: ListedPlayer[];
  error: { code?: string; message?: string } | null;
  archivedSupported: boolean;
}> => {
  const activeOnly = options?.activeOnly ?? false;

  const archivedQuery = supabase
    .from("players")
    .select("id, first_name, last_name, archived");

  const archivedResult = activeOnly
    ? await archivedQuery.eq("archived", false).order("first_name", { ascending: true })
    : await archivedQuery.order("first_name", { ascending: true });

  if (!isArchivedColumnMissing(archivedResult.error)) {
    return {
      data:
        archivedResult.data?.map((player: ListedPlayer) => ({
          ...player,
          archived: Boolean(player.archived),
        })) ?? [],
      error: archivedResult.error,
      archivedSupported: true,
    };
  }

  const fallbackResult = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .order("first_name", { ascending: true });

  return {
    data:
      fallbackResult.data?.map((player: Omit<ListedPlayer, "archived">) => ({
        ...player,
        archived: false,
      })) ?? [],
    error: fallbackResult.error,
    archivedSupported: false,
  };
};

export const listPlayersWithGamesPlayed = async (
  supabase: SupabaseClient,
  options?: { activeOnly?: boolean }
): Promise<{
  data: ListedPlayer[];
  error: { code?: string; message?: string } | null;
  archivedSupported: boolean;
}> => {
  const playersResult = await listPlayers(supabase, options);

  if (playersResult.error) {
    return playersResult;
  }

  const players = playersResult.data ?? [];
  if (players.length === 0) {
    return playersResult;
  }

  const { data: gameweeks, error: gameweeksError } = await supabase
    .from("gameweeks")
    .select("id, game_date")
    .eq("status", "locked");

  if (gameweeksError) {
    return {
      ...playersResult,
      error: gameweeksError,
    };
  }

  const gameweekIds = (gameweeks ?? []).map((gameweek) => gameweek.id);
  if (gameweekIds.length === 0) {
    return {
      ...playersResult,
      data: players.map((player) => ({
        ...player,
        games_played: 0,
        last_game_date: null,
      })),
    };
  }

  const { data: entries, error: entriesError } = await supabase
    .from("gameweek_players")
    .select("player_id, team, gameweek_id")
    .in("gameweek_id", gameweekIds);

  if (entriesError) {
    return {
      ...playersResult,
      error: entriesError,
    };
  }

  const gamesPlayedByPlayer = new Map<string, number>();
  const gameDateById = new Map<string, string>();
  (gameweeks ?? []).forEach((gameweek) => {
    if (typeof gameweek.game_date === "string") {
      gameDateById.set(gameweek.id, gameweek.game_date);
    }
  });
  const lastGameDateByPlayer = new Map<string, string>();
  (entries ?? []).forEach((entry) => {
    if (entry.team === "subs") return;
    gamesPlayedByPlayer.set(
      entry.player_id,
      (gamesPlayedByPlayer.get(entry.player_id) ?? 0) + 1
    );
    const gameDate = gameDateById.get(entry.gameweek_id);
    const previousDate = lastGameDateByPlayer.get(entry.player_id);
    if (gameDate && (!previousDate || gameDate > previousDate)) {
      lastGameDateByPlayer.set(entry.player_id, gameDate);
    }
  });

  return {
    ...playersResult,
    data: players.map((player) => ({
      ...player,
      games_played: gamesPlayedByPlayer.get(player.id) ?? 0,
      last_game_date: lastGameDateByPlayer.get(player.id) ?? null,
    })),
  };
};
