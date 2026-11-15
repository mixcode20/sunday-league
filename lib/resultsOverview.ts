import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isPotmVotingClosed } from "@/lib/potm";
import type { ResultsOverview } from "@/lib/types";
import { normalizePlayerJoin } from "@/lib/utils";

const GAMEWEEK_FIELDS =
  "id, game_date, game_time, location, payment_link, format, darks_score, whites_score, result_mode, winner, status, locked_at";

// Shared by the /api/results/overview route and the /history server component.
export const getResultsOverview = async (
  supabase: SupabaseClient,
  gameweekId?: string | null
): Promise<ResultsOverview> => {
  const { data: currentGameweek } = gameweekId
    ? await supabase
        .from("gameweeks")
        .select(GAMEWEEK_FIELDS)
        .eq("id", gameweekId)
        .eq("status", "locked")
        .maybeSingle()
    : await supabase
        .from("gameweeks")
        .select(GAMEWEEK_FIELDS)
        .eq("status", "locked")
        .order("game_date", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (!currentGameweek) {
    return {
      currentGameweek: null,
      entries: [],
      olderId: null,
      newerId: null,
      votingClosed: true,
    };
  }

  const [{ data: older }, { data: newer }, { data: entries }, votingClosed] =
    await Promise.all([
      supabase
        .from("gameweeks")
        .select("id")
        .eq("status", "locked")
        .lt("game_date", currentGameweek.game_date)
        .order("game_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("gameweeks")
        .select("id")
        .eq("status", "locked")
        .gt("game_date", currentGameweek.game_date)
        .order("game_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("gameweek_players")
        .select("*, players(id, first_name, last_name, archived)")
        .eq("gameweek_id", currentGameweek.id)
        .order("team", { ascending: true })
        .order("position", { ascending: true }),
      isPotmVotingClosed(supabase, currentGameweek.game_date),
    ]);

  return {
    currentGameweek,
    entries: (entries ?? []).map(normalizePlayerJoin),
    olderId: older?.id ?? null,
    newerId: newer?.id ?? null,
    votingClosed,
  };
};
