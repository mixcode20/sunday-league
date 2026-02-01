import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { normalizePlayerJoin } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const body = await request.json();
  const playerId = body?.player_id ?? body?.playerId;
  const position = body?.position;
  const debugJoinFlow = process.env.DEBUG_JOIN_FLOW === "true";

  if (!playerId || typeof position !== "number") {
    return NextResponse.json(
      {
        ok: false,
        code: "missing_params",
        message: "player_id and position are required.",
        details: null,
        hint: null,
      },
      { status: 400 }
    );
  }

  if (position < 1 || position > 18) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_slot",
        message: "Invalid slot.",
        details: null,
        hint: null,
      },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  if (debugJoinFlow) {
    console.info("[join-flow] claim request", { gameweekId, playerId, position });
  }

  const { data: gameweek, error: gameweekError } = await supabase
    .from("gameweeks")
    .select("status")
    .eq("id", gameweekId)
    .single();

  if (gameweekError || !gameweek) {
    return NextResponse.json(
      {
        ok: false,
        code: "gameweek_not_found",
        message: "Gameweek not found.",
        details: gameweekError?.details ?? null,
        hint: gameweekError?.hint ?? null,
      },
      { status: 404 }
    );
  }

  if (gameweek.status !== "open") {
    return NextResponse.json(
      {
        ok: false,
        code: "gameweek_locked",
        message: "Gameweek is locked.",
        details: null,
        hint: null,
      },
      { status: 403 }
    );
  }

  const { data: createdEntry, error } = await supabase
    .from("gameweek_players")
    .insert({
      gameweek_id: gameweekId,
      player_id: playerId,
      team: "subs",
      position,
    })
    .select(
      "id, gameweek_id, player_id, team, position, remove_requested, players(id, first_name, last_name)"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existingPlayer } = await supabase
        .from("gameweek_players")
        .select("id, position")
        .eq("gameweek_id", gameweekId)
        .eq("player_id", playerId)
        .maybeSingle();
      if (existingPlayer) {
        if (debugJoinFlow) {
          console.info("[join-flow] claim conflict player", {
            gameweekId,
            playerId,
            existingPosition: existingPlayer.position,
          });
        }
        return NextResponse.json(
          {
            ok: false,
            code: "player_already_signed_up",
            message: "Player already signed up.",
            existing_position: existingPlayer.position,
            details: null,
            hint: null,
          },
          { status: 409 }
        );
      }
      const { data: existingSlot } = await supabase
        .from("gameweek_players")
        .select("id, player_id")
        .eq("gameweek_id", gameweekId)
        .eq("position", position)
        .maybeSingle();
      if (debugJoinFlow) {
        console.info("[join-flow] claim conflict slot", {
          gameweekId,
          position,
          takenBy: existingSlot?.player_id ?? null,
        });
      }
      return NextResponse.json(
        {
          ok: false,
          code: "slot_taken",
          message: "Slot already taken.",
          position,
          existing_player_id: existingSlot?.player_id ?? null,
          details: null,
          hint: null,
        },
        { status: 409 }
      );
    }
    console.error("[join-flow] claim error", {
      gameweekId,
      playerId,
      position,
      error,
    });
    if (debugJoinFlow) {
      console.info("[join-flow] claim error", { gameweekId, playerId, position, error });
    }
    return NextResponse.json(
      {
        ok: false,
        code: error.code ?? "claim_failed",
        message: error.message ?? "Failed to claim slot.",
        details: error.details ?? null,
        hint: error.hint ?? null,
      },
      { status: 409 }
    );
  }

  const { data: entries, error: entriesError } = await supabase
    .from("gameweek_players")
    .select(
      "id, gameweek_id, player_id, team, position, remove_requested, players(id, first_name, last_name)"
    )
    .eq("gameweek_id", gameweekId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (entriesError) {
    if (debugJoinFlow) {
      console.info("[join-flow] claim success without entries", {
        gameweekId,
        playerId,
        position,
      });
    }
    return NextResponse.json({
      ok: true,
      entry: createdEntry ? normalizePlayerJoin(createdEntry) : null,
    });
  }

  if (debugJoinFlow) {
    console.info("[join-flow] claim success", {
      gameweekId,
      playerId,
      position,
      entries: entries?.length ?? 0,
    });
  }

  return NextResponse.json({
    ok: true,
    entry: createdEntry ? normalizePlayerJoin(createdEntry) : null,
    entries: (entries ?? []).map(normalizePlayerJoin),
  });
}
