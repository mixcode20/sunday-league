import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { normalizePlayerJoin } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const supabase = supabaseServer();

  const { data: entries, error } = await supabase
    .from("gameweek_players")
    .select(
      "id, gameweek_id, player_id, team, position, players(id, first_name, last_name)"
    )
    .eq("gameweek_id", gameweekId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch entries." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    entries: (entries ?? []).map(normalizePlayerJoin),
  });
}
