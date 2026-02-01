import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const gameweekId = url.searchParams.get("gameweekId") ?? "";
  const playerId = url.searchParams.get("playerId") ?? "";
  const positionParam = url.searchParams.get("position") ?? "";
  const position = positionParam ? Number(positionParam) : null;

  if (!gameweekId || !playerId || typeof position !== "number" || Number.isNaN(position)) {
    return NextResponse.json(
      {
        ok: false,
        message: "gameweekId, playerId, and position are required query params.",
      },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  const { data: gameweek, error: gameweekError } = await supabase
    .from("gameweeks")
    .select("id, status")
    .eq("id", gameweekId)
    .maybeSingle();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .maybeSingle();

  const { data: existingSignup, error: signupError } = await supabase
    .from("gameweek_players")
    .select("id, position")
    .eq("gameweek_id", gameweekId)
    .eq("player_id", playerId)
    .maybeSingle();

  const { data: existingSlot, error: slotError } = await supabase
    .from("gameweek_players")
    .select("id, player_id, position")
    .eq("gameweek_id", gameweekId)
    .eq("position", position)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    table: "gameweek_players",
    input: { gameweekId, playerId, position },
    gameweek: {
      exists: Boolean(gameweek),
      is_open: gameweek?.status === "open",
      status: gameweek?.status ?? null,
      error: gameweekError
        ? {
            code: gameweekError.code ?? null,
            message: gameweekError.message ?? null,
            details: gameweekError.details ?? null,
            hint: gameweekError.hint ?? null,
          }
        : null,
    },
    player: {
      exists: Boolean(player),
      error: playerError
        ? {
            code: playerError.code ?? null,
            message: playerError.message ?? null,
            details: playerError.details ?? null,
            hint: playerError.hint ?? null,
          }
        : null,
    },
    existing_signup: {
      exists: Boolean(existingSignup),
      position: existingSignup?.position ?? null,
      error: signupError
        ? {
            code: signupError.code ?? null,
            message: signupError.message ?? null,
            details: signupError.details ?? null,
            hint: signupError.hint ?? null,
          }
        : null,
    },
    existing_slot: {
      occupied: Boolean(existingSlot),
      player_id: existingSlot?.player_id ?? null,
      error: slotError
        ? {
            code: slotError.code ?? null,
            message: slotError.message ?? null,
            details: slotError.details ?? null,
            hint: slotError.hint ?? null,
          }
        : null,
    },
  });
}
