import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { normalizePlayerJoin } from "@/lib/utils";

const debugPerf =
  process.env.DEBUG_PERF === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_PERF === "true";

export async function GET(request: Request) {
  if (debugPerf) {
    console.time("api:results:overview");
  }

  const { searchParams } = new URL(request.url);
  const gameweekId = searchParams.get("gameweekId");

  const supabase = supabaseServer();
  const gameweekFields =
    "id, game_date, darks_score, whites_score, result_mode, winner, status";

  const fetchLatestLockedGameweek = async () =>
    supabase
      .from("gameweeks")
      .select(gameweekFields)
      .eq("status", "locked")
      .order("game_date", { ascending: false })
      .limit(1)
      .maybeSingle();

  const fetchOlderGameweek = async (gameDate: string) =>
    supabase
      .from("gameweeks")
      .select("id")
      .eq("status", "locked")
      .lt("game_date", gameDate)
      .order("game_date", { ascending: false })
      .limit(1)
      .maybeSingle();

  const fetchNewerGameweek = async (gameDate: string) =>
    supabase
      .from("gameweeks")
      .select("id")
      .eq("status", "locked")
      .gt("game_date", gameDate)
      .order("game_date", { ascending: true })
      .limit(1)
      .maybeSingle();

  const { data: currentGameweek } = gameweekId
    ? await supabase
        .from("gameweeks")
        .select(gameweekFields)
        .eq("id", gameweekId)
        .eq("status", "locked")
        .maybeSingle()
    : await fetchLatestLockedGameweek();

  if (!currentGameweek) {
    if (debugPerf) {
      console.timeEnd("api:results:overview");
    }
    return NextResponse.json({
      currentGameweek: null,
      entries: [],
      olderId: null,
      newerId: null,
    });
  }

  const [{ data: older }, { data: newer }, { data: entries }] = await Promise.all([
    fetchOlderGameweek(currentGameweek.game_date),
    fetchNewerGameweek(currentGameweek.game_date),
    supabase
      .from("gameweek_players")
      .select("*, players(id, first_name, last_name, archived)")
      .eq("gameweek_id", currentGameweek.id)
      .order("team", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  const normalizedEntries = (entries ?? []).map(normalizePlayerJoin);

  if (debugPerf) {
    console.timeEnd("api:results:overview");
  }

  return NextResponse.json({
    currentGameweek,
    entries: normalizedEntries,
    olderId: older?.id ?? null,
    newerId: newer?.id ?? null,
  });
}
