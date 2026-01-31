import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { playerId, position, slotType } = await request.json();

  if (!playerId || typeof position !== "number" || !slotType) {
    return NextResponse.json(
      { error: "playerId, position, and slotType are required." },
      { status: 400 }
    );
  }

  const isMain = slotType === "main";
  const isSub = slotType === "sub";
  if (!isMain && !isSub) {
    return NextResponse.json({ error: "Invalid slot type." }, { status: 400 });
  }

  if (isMain && (position < 1 || position > 14)) {
    return NextResponse.json({ error: "Invalid main slot." }, { status: 400 });
  }
  if (isSub && (position < 15 || position > 18)) {
    return NextResponse.json({ error: "Invalid sub slot." }, { status: 400 });
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
    return NextResponse.json({ error: "Gameweek is locked." }, { status: 403 });
  }

  const { error } = await supabase.from("gameweek_players").insert({
    gameweek_id: gameweekId,
    player_id: playerId,
    team: "subs",
    position,
  });

  if (error) {
    const message =
      error.code === "23505"
        ? "Slot already taken or player already joined."
        : "Failed to claim slot.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
