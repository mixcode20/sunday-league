import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { playerId, pin } = await request.json();

  if (!isOrganiserPinConfigured()) {
    return NextResponse.json(
      { error: { code: "pin_missing", message: "Organiser PIN is not configured." } },
      { status: 500 }
    );
  }

  if (!verifyOrganiserPin(pin)) {
    return NextResponse.json(
      { error: { code: "pin_invalid", message: "Invalid PIN." } },
      { status: 401 }
    );
  }

  if (!playerId) {
    return NextResponse.json(
      { error: { code: "missing_player", message: "playerId is required." } },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  const { data: gameweek, error: gameweekError } = await supabase
    .from("gameweeks")
    .select("status")
    .eq("id", gameweekId)
    .single();

  if (gameweekError || !gameweek) {
    console.error("[teams-clear] gameweek lookup failed", {
      gameweekId,
      error: gameweekError ?? null,
    });
    return NextResponse.json(
      { error: { code: "gameweek_not_found", message: "Gameweek not found." } },
      { status: 404 }
    );
  }

  if (gameweek.status !== "open") {
    return NextResponse.json(
      { error: { code: "gameweek_locked", message: "Gameweek is locked." } },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("gameweek_players")
    .update({ team: "subs", team_position: null })
    .eq("gameweek_id", gameweekId)
    .eq("player_id", playerId);

  if (error) {
    console.error("[teams-clear] failed to clear slot", {
      gameweekId,
      playerId,
      error,
    });
    return NextResponse.json(
      {
        error: {
          code: error.code ?? "clear_failed",
          message: error.message ?? "Failed to clear slot.",
          details: error.details ?? null,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
