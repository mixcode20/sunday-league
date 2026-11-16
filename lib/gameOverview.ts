import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { listPlayersWithGamesPlayed } from "@/lib/players";
import type { GameLive, GameOverview } from "@/lib/types";
import { normalizePlayerJoin } from "@/lib/utils";

// The volatile half: the gameweek and its slot claims. This is what the join
// page polls, and it deliberately excludes the player roster, which accounted
// for 61% of the old payload while changing roughly monthly.
export const getGameLive = async (
  supabase: SupabaseClient
): Promise<GameLive> => {
  const [openResult, lockedResult] = await Promise.all([
    supabase.from("gameweeks").select("*").eq("status", "open").maybeSingle(),
    supabase
      .from("gameweeks")
      .select("*")
      .eq("status", "locked")
      .order("game_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const openGameweek = openResult.data ?? null;
  const gameweek = openGameweek ?? lockedResult.data ?? null;

  const { data: entries } = gameweek
    ? await supabase
        .from("gameweek_players")
        .select("*, players(id, first_name, last_name, archived)")
        .eq("gameweek_id", gameweek.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  return {
    openGameweek,
    gameweek,
    entries: (entries ?? []).map(normalizePlayerJoin),
  };
};

// Full payload, still used by /teams where the roster is needed up front.
export const getGameOverview = async (
  supabase: SupabaseClient
): Promise<GameOverview> => {
  const [openResult, lockedResult, playersResult] = await Promise.all([
    supabase.from("gameweeks").select("*").eq("status", "open").maybeSingle(),
    supabase
      .from("gameweeks")
      .select("*")
      .eq("status", "locked")
      .order("game_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    listPlayersWithGamesPlayed(supabase, { activeOnly: true }),
  ]);

  const openGameweek = openResult.data ?? null;
  const latestLocked = lockedResult.data ?? null;
  const gameweek = openGameweek ?? latestLocked;
  const players = playersResult.data ?? [];

  const { data: entries } = gameweek
    ? await supabase
        .from("gameweek_players")
        .select("*, players(id, first_name, last_name, archived)")
        .eq("gameweek_id", gameweek.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  return {
    openGameweek,
    gameweek,
    players,
    entries: (entries ?? []).map(normalizePlayerJoin),
  };
};
