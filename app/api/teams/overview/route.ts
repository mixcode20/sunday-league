import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { normalizePlayerJoin } from "@/lib/utils";

const debugPerf =
  process.env.DEBUG_PERF === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_PERF === "true";

export async function GET() {
  if (debugPerf) {
    console.time("api:teams:overview");
  }

  const supabase = supabaseServer();

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
  const latestLocked = lockedResult.data ?? null;
  const gameweek = openGameweek ?? latestLocked;

  const { data: entries } = gameweek
    ? await supabase
        .from("gameweek_players")
        .select("*, players(id, first_name, last_name)")
        .eq("gameweek_id", gameweek.id)
        .order("team", { ascending: true })
        .order("position", { ascending: true })
    : { data: [] };

  const normalizedEntries = (entries ?? []).map(normalizePlayerJoin);

  if (debugPerf) {
    console.timeEnd("api:teams:overview");
  }

  return NextResponse.json({
    gameweek,
    entries: normalizedEntries,
  });
}
