import { NextResponse } from "next/server";
import { getGameLive } from "@/lib/gameOverview";
import { supabaseServer } from "@/lib/supabase";

const debugPerf =
  process.env.DEBUG_PERF === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_PERF === "true";

// Polled every 10s by the join page, so it carries only volatile data. The
// roster lives at /api/players/roster.
export async function GET() {
  if (debugPerf) console.time("api:game:overview");
  const live = await getGameLive(supabaseServer());
  if (debugPerf) console.timeEnd("api:game:overview");
  return NextResponse.json(live);
}
