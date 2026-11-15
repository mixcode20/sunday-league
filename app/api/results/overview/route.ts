import { NextResponse } from "next/server";
import { getResultsOverview } from "@/lib/resultsOverview";
import { supabaseServer } from "@/lib/supabase";

const debugPerf =
  process.env.DEBUG_PERF === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_PERF === "true";

export async function GET(request: Request) {
  if (debugPerf) {
    console.time("api:results:overview");
  }

  const { searchParams } = new URL(request.url);
  const overview = await getResultsOverview(
    supabaseServer(),
    searchParams.get("gameweekId")
  );

  if (debugPerf) {
    console.timeEnd("api:results:overview");
  }

  return NextResponse.json(overview);
}
