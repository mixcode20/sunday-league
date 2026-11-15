import { NextResponse } from "next/server";
import { getLeagueOverview } from "@/lib/leagueOverview";
import { supabaseServer } from "@/lib/supabase";

const debugPerf =
  process.env.DEBUG_PERF === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_PERF === "true";

export async function GET() {
  if (debugPerf) {
    console.time("api:league:overview");
  }

  const overview = await getLeagueOverview(supabaseServer());

  if (debugPerf) {
    console.timeEnd("api:league:overview");
  }

  return NextResponse.json(overview);
}
