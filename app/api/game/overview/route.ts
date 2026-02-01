import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { normalizePlayerJoin } from "@/lib/utils";

const debugPerf =
  process.env.DEBUG_PERF === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_PERF === "true";

export async function GET() {
  if (debugPerf) {
    console.time("api:game:overview");
  }

  const supabase = supabaseServer();

  const [openResult, lockedResult, playersResult] = await Promise.all([
    supabase.from("gameweeks").select("*").eq("status", "open").maybeSingle(),
    supabase
      .from("gameweeks")
      .select("*")
      .eq("status", "locked")
      .order("game_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("players").select("id, first_name, last_name").order("first_name", {
      ascending: true,
    }),
  ]);

  const openGameweek = openResult.data ?? null;
  const latestLocked = lockedResult.data ?? null;
  const gameweek = openGameweek ?? latestLocked;
  const players = playersResult.data ?? [];

  const { data: entries } = gameweek
    ? await supabase
        .from("gameweek_players")
        .select("*, players(id, first_name, last_name)")
        .eq("gameweek_id", gameweek.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  const normalizedEntries = (entries ?? []).map(normalizePlayerJoin);

  if (debugPerf) {
    console.timeEnd("api:game:overview");
  }

  return NextResponse.json({
    openGameweek,
    gameweek,
    players,
    entries: normalizedEntries,
  });
}
