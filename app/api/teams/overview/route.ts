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

  const { data: entries, error: entriesError } = gameweek
    ? await supabase
        .from("gameweek_players")
        .select("*, players(id, first_name, last_name, archived)")
        .eq("gameweek_id", gameweek.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (entriesError) {
    return NextResponse.json(
      { error: "Failed to fetch entries." },
      { status: 500 }
    );
  }

  const normalizedEntries = (entries ?? []).map(normalizePlayerJoin);

  if (debugPerf) {
    console.timeEnd("api:teams:overview");
  }

  return NextResponse.json({
    gameweek,
    entries: normalizedEntries,
  });
}
