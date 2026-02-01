import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const body = await request.json();
  const playerId = body?.player_id ?? body?.playerId;
  const position = body?.position;

  if (!playerId || typeof position !== "number") {
    return NextResponse.json(
      { error: "player_id and position are required." },
      { status: 400 }
    );
  }

  if (position < 1 || position > 18) {
    return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
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
    if (error.code === "23505") {
      const { data: existingPlayer } = await supabase
        .from("gameweek_players")
        .select("id")
        .eq("gameweek_id", gameweekId)
        .eq("player_id", playerId)
        .maybeSingle();
      return NextResponse.json(
        {
          error: existingPlayer
            ? "Player already signed up."
            : "Slot already taken.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to claim slot." }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
