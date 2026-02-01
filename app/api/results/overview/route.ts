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
  const { data: gameweeks } = await supabase
    .from("gameweeks")
    .select("id, game_date, darks_score, whites_score, status")
    .eq("status", "locked")
    .order("game_date", { ascending: false });

  if (!gameweeks || gameweeks.length === 0) {
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

  const currentIndex = gameweekId
    ? Math.max(
        gameweeks.findIndex((gameweek) => gameweek.id === gameweekId),
        0
      )
    : 0;
  const currentGameweek = gameweeks[currentIndex] ?? gameweeks[0];
  const older = gameweeks[currentIndex + 1] ?? null;
  const newer = currentIndex > 0 ? gameweeks[currentIndex - 1] : null;

  const { data: entries } = await supabase
    .from("gameweek_players")
    .select("*, players(id, first_name, last_name)")
    .eq("gameweek_id", currentGameweek.id)
    .order("team", { ascending: true })
    .order("position", { ascending: true });

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
