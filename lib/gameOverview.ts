import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { listPlayersWithGamesPlayed } from "@/lib/players";
import type { GameOverview } from "@/lib/types";
import { normalizePlayerJoin } from "@/lib/utils";

// Shared by the /api/game/overview route and the / server component, so the
// first render can embed the gameweek instead of waiting for a client fetch.
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
