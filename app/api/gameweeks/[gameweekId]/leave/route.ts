import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: { gameweekId: string } }
) {
  const { playerId } = await request.json();

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required." }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: gameweek, error: gameweekError } = await supabase
    .from("gameweeks")
    .select("status")
    .eq("id", params.gameweekId)
    .single();

  if (gameweekError || !gameweek) {
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }

  if (gameweek.status !== "open") {
    return NextResponse.json(
      { error: "Gameweek is locked." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("gameweek_players")
    .delete()
    .eq("gameweek_id", params.gameweekId)
    .eq("player_id", playerId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to leave gameweek." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
