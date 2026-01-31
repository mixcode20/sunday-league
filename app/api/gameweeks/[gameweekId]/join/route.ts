import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { playerId, slotIndex } = await request.json();

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required." }, { status: 400 });
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

  const { count } = await supabase
    .from("gameweek_players")
    .select("id", { count: "exact", head: true })
    .eq("gameweek_id", gameweekId);

  const desiredIndex =
    typeof slotIndex === "number" ? Math.max(0, Math.min(slotIndex, 17)) : null;

  if (desiredIndex !== null) {
    const { data: occupied } = await supabase
      .from("gameweek_players")
      .select("id")
      .eq("gameweek_id", gameweekId)
      .eq("position", desiredIndex)
      .maybeSingle();

    if (occupied) {
      return NextResponse.json(
        { error: "That slot is already taken." },
        { status: 409 }
      );
    }
  }

  const { error } = await supabase.from("gameweek_players").insert({
    gameweek_id: gameweekId,
    player_id: playerId,
    team: "subs",
    position: desiredIndex ?? count ?? 0,
  });

  if (error) {
    const message =
      error.code === "23505"
        ? "Player already joined."
        : "Failed to join gameweek.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
