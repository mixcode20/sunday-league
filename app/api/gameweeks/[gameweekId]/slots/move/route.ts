import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { playerId, position } = await request.json();

  if (!playerId || typeof position !== "number") {
    return NextResponse.json(
      { error: "playerId and position are required." },
      { status: 400 }
    );
  }

  if (position < 1) {
    return NextResponse.json({ error: "Invalid position." }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: gameweek, error: gameweekError } = await supabase
    .from("gameweeks")
    .select("status")
    .eq("id", gameweekId)
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

  const { data: existingEntry, error: entryError } = await supabase
    .from("gameweek_players")
    .select("player_id")
    .eq("gameweek_id", gameweekId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (entryError || !existingEntry) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  const { data: takenSlot } = await supabase
    .from("gameweek_players")
    .select("player_id")
    .eq("gameweek_id", gameweekId)
    .eq("position", position)
    .maybeSingle();

  if (takenSlot && takenSlot.player_id !== playerId) {
    return NextResponse.json({ error: "Slot is already taken." }, { status: 409 });
  }

  const { error } = await supabase
    .from("gameweek_players")
    .update({ position })
    .eq("gameweek_id", gameweekId)
    .eq("player_id", playerId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to move player." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
