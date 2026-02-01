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
      { error: "player_id and position are required." },
      { status: 400 }
    );
  }

  if (position < 1 || position > 18) {
    return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
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
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }

  if (gameweek.status !== "open") {
    return NextResponse.json({ error: "Gameweek is locked." }, { status: 403 });
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
            error: "Player already signed up.",
            code: "player_already_signed_up",
            existing_position: existingPlayer.position,
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
          error: "Slot already taken.",
          code: "slot_taken",
          position,
          existing_player_id: existingSlot?.player_id ?? null,
        },
        { status: 409 }
      );
    }
    if (debugJoinFlow) {
      console.info("[join-flow] claim error", { gameweekId, playerId, position, error });
    }
    return NextResponse.json({ error: "Failed to claim slot." }, { status: 409 });
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
