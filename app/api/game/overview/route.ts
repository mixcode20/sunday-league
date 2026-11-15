import { NextResponse } from "next/server";
import { getGameOverview } from "@/lib/gameOverview";
import { supabaseServer } from "@/lib/supabase";

const debugPerf =
  process.env.DEBUG_PERF === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_PERF === "true";

export async function GET() {
  if (debugPerf) {
    console.time("api:game:overview");
  }

  const overview = await getGameOverview(supabaseServer());

  if (debugPerf) {
    console.timeEnd("api:game:overview");
  }

  return NextResponse.json(overview);
}
