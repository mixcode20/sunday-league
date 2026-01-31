import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { playerId } = await request.json();

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("gameweek_players")
    .update({ remove_requested: true })
    .eq("gameweek_id", gameweekId)
    .eq("player_id", playerId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to request removal." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
