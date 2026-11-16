import { NextResponse } from "next/server";
import { listPlayersWithGamesPlayed } from "@/lib/players";
import { supabaseServer } from "@/lib/supabase";

// The active roster. Split out of /api/game/overview because it changes about
// monthly while that endpoint is polled every 10 seconds.
export async function GET() {
  const { data } = await listPlayersWithGamesPlayed(supabaseServer(), {
    activeOnly: true,
  });
  return NextResponse.json({ players: data ?? [] });
}
